# Entrega 2 Parte 1: cambios para fetch de 16/32 bits

## Objetivo

Se preparo la etapa de fetch para poder soportar instrucciones RISC-V normales de 32 bits e instrucciones comprimidas de 16 bits. Todavia no se implemento el decodificador de instrucciones comprimidas `c.*`; por ahora solo se agrego la base para detectarlas y hacer que el PC pueda avanzar 2 o 4 bytes.

Este cambio corresponde a la preparacion para la Entrega 2 Parte 1, porque las instrucciones comprimidas ALU (`c.addi`, `c.add`, `c.sub`, `c.and`, `c.or`, `c.xor`, `c.slli`, `c.srli`, `c.srai`, `c.lui`) necesitan que el procesador pueda leer instrucciones de 16 bits.

## Cambios en datapath y control

### Cambios en el datapath

Los cambios de datapath estan en la ruta de fetch:

- La memoria de instrucciones ahora entrega informacion a nivel de halfword de 16 bits.
- Se agrego la senal `IsCompressed` entre `imem.v` y `riscvpipeline.v`.
- Se agrego la senal `RawInstrF` para observar los bits originales leidos desde memoria.
- El PC secuencial ahora puede avanzar `PC + 2` o `PC + 4`.
- Las instrucciones de 32 bits se reconstruyen uniendo dos halfwords consecutivos.

En forma conceptual, el datapath de fetch cambio de:

```text
PC -> imem 32 bits -> InstrF -> pipeline
PC -> PC + 4
```

a:

```text
PC -> imem halfword0/halfword1 -> RawInstrF -> detector 16/32 -> InstrF -> pipeline
PC -> PC + 2 o PC + 4
```

### Cambios en la unidad de control

No se modifico la unidad de control principal (`controller.v`, `maindec.v`, `aludec.v`) para ejecutar instrucciones comprimidas todavia.

Lo que se agrego por ahora es una logica de control temprana en fetch:

```verilog
iscompressed = (halfword0[1:0] != 2'b11)
```

Esta senal decide:

- Si el PC avanza 2 bytes.
- Si el PC avanza 4 bytes.
- Si la instruccion entregada al pipeline se arma como 32 bits o, por ahora, se reemplaza por un NOP cuando es comprimida.

Para visualizar este comportamiento en waveform se usan:

| Senal | Funcion |
|---|---|
| `RawInstrF` | Bits originales leidos desde memoria. Si es comprimida, se muestra en los 16 bits bajos. |
| `IsCompressedF` | Vale 1 cuando `RawInstrF[1:0] != 2'b11`. |
| `InstrF` | Instruccion normalizada que entra al pipeline. Por ahora es NOP para comprimidas. |

Mas adelante, para completar Entrega 2 Parte 1, esta deteccion debera conectarse a un decodificador/expansor de instrucciones comprimidas. Ese modulo convertira una instruccion `c.*` de 16 bits en una instruccion RISC-V equivalente de 32 bits para que el resto del pipeline la ejecute normalmente.

## Archivos modificados

### `imem.v`

Antes la memoria de instrucciones estaba organizada como palabras de 32 bits:

```verilog
reg [31:0] RAM[0:63];
assign rd = RAM[a[31:2]];
```

Eso implicaba que cada entrada del `.mem` era una instruccion completa de 32 bits y que el PC siempre accedia por palabras alineadas a 4 bytes.

Ahora la memoria esta organizada como halfwords de 16 bits:

```verilog
reg [15:0] RAM[0:127];
```

No se redujo la memoria. La capacidad total se mantiene igual:

```text
antes: 64 * 32 bits = 2048 bits
ahora: 128 * 16 bits = 2048 bits
```

Lo que cambio fue la granularidad de acceso. Ahora cada linea del `.mem` representa 16 bits.

La memoria lee el halfword ubicado en el PC:

```verilog
assign halfword0 = RAM[a[31:1]];
```

Luego lee el siguiente halfword:

```verilog
assign halfword1 = RAM[a[31:1] + 1];
```

Con los bits bajos del primer halfword se detecta el tamano de la instruccion:

```verilog
assign iscompressed = (halfword0[1:0] != 2'b11);
```

En RISC-V, las instrucciones normales de 32 bits tienen `instr[1:0] = 2'b11`. Las comprimidas de 16 bits tienen otro valor en esos dos bits.

Si la instruccion es de 32 bits, se arma juntando dos halfwords:

```verilog
{halfword1, halfword0}
```

Si se detecta una instruccion comprimida, por ahora se entrega un NOP:

```verilog
32'h00000013
```

Esto evita que una instruccion comprimida no implementada contamine la simulacion. Mas adelante ese NOP debe reemplazarse por la salida de un decodificador/expansor de instrucciones comprimidas.

### `top.v`

Se agrego el cable:

```verilog
wire IsCompressed;
```

Este cable conecta la deteccion hecha en `imem.v` con el pipeline:

```verilog
.rawrd(RawInstr)
.iscompressed(IsCompressed)
.RawInstrF(RawInstr)
.IsCompressedF(IsCompressed)
```

### `riscvpipeline.v`

Se agrego la entrada:

```verilog
input [31:0] RawInstrF
input IsCompressedF
```

Ahora el PC avanza 2 o 4 bytes segun el tipo de instruccion:

```verilog
assign PCPlus4F = PCF + (IsCompressedF ? 32'd2 : 32'd4);
```

Aunque el nombre de la senal sigue siendo `PCPlus4F`, ahora representa el siguiente PC secuencial, que puede ser `PC + 2` o `PC + 4`.

## Nuevo formato de `.mem`

Desde este cambio, para probar el fetch variable se debe usar un `.mem` con una linea por halfword de 16 bits.

Una instruccion de 32 bits ocupa dos lineas: primero la mitad baja, luego la mitad alta.

Ejemplo:

```text
0093
00A0
```

equivale a:

```text
00A00093
```

Una instruccion comprimida de 16 bits ocuparia una sola linea:

```text
0085
```

Ejemplo de mezcla:

```text
0093   // low  halfword de 00A00093
00A0   // high halfword de 00A00093
0085   // instruccion comprimida de 16 bits
0113   // low  halfword de 01400113
0140   // high halfword de 01400113
```

El PC avanzaria asi:

```text
PC = 0  -> instruccion 32 bits -> PC + 4
PC = 4  -> instruccion 16 bits -> PC + 2
PC = 6  -> instruccion 32 bits -> PC + 4
```

## Archivo de prueba agregado

Se agrego:

```text
mem/isa_no_dependencies_halfword.mem
```

Este archivo contiene el mismo programa que `isa_no_dependencies.mem`, pero dividido en halfwords de 16 bits. Sirve para verificar que las instrucciones normales de 32 bits se reconstruyen correctamente desde dos lineas del `.mem`.

Comando usado para probar:

```bash
./run_sim.sh mem/isa_no_dependencies_halfword.mem
```

Resultado esperado:

```text
Simulation succeeded
Final store: mem[100] <= 25
```
