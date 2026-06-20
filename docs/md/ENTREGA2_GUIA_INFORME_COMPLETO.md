# Entrega 2: guia completa para informe

Este documento organiza todo lo que debe aparecer en el informe de la Entrega 2. La Entrega 2 se divide en dos partes:

- Parte 1: instrucciones comprimidas ALU.
- Parte 2: instrucciones comprimidas de memoria y salto.

La idea general de la implementacion es leer instrucciones de 16 o 32 bits desde memoria, detectar si la instruccion es comprimida y, si lo es, expandirla a una instruccion RISC-V equivalente de 32 bits. Luego el pipeline normal ejecuta esa instruccion expandida.

```text
imem -> RawInstrF -> detector 16/32 -> compressed_decoder -> InstrF -> pipeline normal
```

El pipeline interno sigue trabajando con instrucciones de 32 bits:

```text
InstrF -> InstrD -> InstrE -> InstrM -> InstrW
```

---

# Parte 1: instrucciones comprimidas ALU

## 1. Instrucciones pedidas

```text
c.addi
c.add
c.sub
c.and
c.or
c.xor
c.slli
c.srli
c.srai
c.lui
```

## 2. Estado actual

Estas instrucciones ya estan implementadas en:

```text
src/core/compressed_decoder.v
```

El test principal es:

```text
mem/compressed_part1_test.mem
```

Comando:

```bash
./run_sim.sh mem/compressed_part1_test.mem
```

Resultado esperado:

```text
Simulation succeeded
Final store: mem[100] <= 25
```

## 3. Explicacion general de funcionamiento

Las instrucciones comprimidas de 16 bits se detectan con los bits bajos:

```verilog
iscompressed = (halfword0[1:0] != 2'b11);
```

Si una instruccion tiene `halfword0[1:0] == 2'b11`, es una instruccion normal de 32 bits. Si no, es comprimida de 16 bits.

Cuando es comprimida, el modulo `compressed_decoder.v` recibe:

```verilog
instr16[15:0]
```

y produce:

```verilog
instr32[31:0]
```

Esta instruccion expandida es equivalente a una instruccion RISC-V normal de 32 bits. Por eso se pueden reutilizar:

```text
maindec.v
aludec.v
extend.v
alu.v
Hazard Unit
```

## 4. Tabla de equivalencias Parte 1

| Instruccion comprimida | Equivalente de 32 bits | Descripcion |
|---|---|---|
| `c.addi rd, imm` | `addi rd, rd, imm` | Suma un inmediato al mismo registro destino |
| `c.add rd, rs2` | `add rd, rd, rs2` | Suma `rd` con `rs2` y guarda en `rd` |
| `c.sub rd', rs2'` | `sub rd', rd', rs2'` | Resta registros comprimidos `x8` a `x15` |
| `c.and rd', rs2'` | `and rd', rd', rs2'` | AND entre registros comprimidos |
| `c.or rd', rs2'` | `or rd', rd', rs2'` | OR entre registros comprimidos |
| `c.xor rd', rs2'` | `xor rd', rd', rs2'` | XOR entre registros comprimidos |
| `c.slli rd, shamt` | `slli rd, rd, shamt` | Shift logico a la izquierda |
| `c.srli rd', shamt` | `srli rd', rd', shamt` | Shift logico a la derecha |
| `c.srai rd', shamt` | `srai rd', rd', shamt` | Shift aritmetico a la derecha |
| `c.lui rd, imm` | `lui rd, imm` | Carga inmediato en la parte alta del registro |

## 5. Codigo para cada instruccion explicado

Archivo:

```text
src/core/compressed_decoder.v
```

### `c.addi`

Deteccion:

```text
funct3 = 000
quadrant = 01
```

Expansion:

```asm
c.addi rd, imm -> addi rd, rd, imm
```

En codigo se arma una instruccion I-type:

```verilog
instr32 = {imm[11:0], rs1, funct3, rd, opcode};
```

Para `c.addi`, `rs1` y `rd` son el mismo registro.

### `c.add`

Deteccion:

```text
funct3 = 100
quadrant = 10
bit12 = 1
rd != x0
rs2 != x0
```

Expansion:

```asm
c.add rd, rs2 -> add rd, rd, rs2
```

En codigo se arma una instruccion R-type `add`.

### `c.sub`

Usa registros comprimidos:

```text
rd'  = x8 + instr16[9:7]
rs2' = x8 + instr16[4:2]
```

Expansion:

```asm
c.sub rd', rs2' -> sub rd', rd', rs2'
```

### `c.xor`

Expansion:

```asm
c.xor rd', rs2' -> xor rd', rd', rs2'
```

### `c.or`

Expansion:

```asm
c.or rd', rs2' -> or rd', rd', rs2'
```

### `c.and`

Expansion:

```asm
c.and rd', rs2' -> and rd', rd', rs2'
```

### `c.slli`

Expansion:

```asm
c.slli rd, shamt -> slli rd, rd, shamt
```

En RV32, el bit alto del shift amount debe ser 0:

```text
instr16[12] = 0
```

### `c.srli`

Usa registros comprimidos `x8` a `x15`.

Expansion:

```asm
c.srli rd', shamt -> srli rd', rd', shamt
```

### `c.srai`

Expansion:

```asm
c.srai rd', shamt -> srai rd', rd', shamt
```

### `c.lui`

Expansion:

```asm
c.lui rd, imm -> lui rd, imm
```

Restricciones:

```text
rd != x0
rd != x2
imm != 0
```

## 6. Cambios extras en el datapath para Parte 1

Los cambios principales estan en Fetch:

1. La memoria de instrucciones paso a estar organizada por halfwords de 16 bits.
2. Se agrego deteccion 16/32 usando `halfword0[1:0]`.
3. El PC secuencial ahora puede avanzar `+2` o `+4`.
4. Se agrego `compressed_decoder.v`.
5. Se agrego un mux conceptual entre instruccion normal de 32 bits y instruccion expandida.

Antes:

```text
PC -> imem 32 bits -> InstrF
PC -> PC + 4
```

Ahora:

```text
PC -> imem halfword0/halfword1
   -> detector 16/32
   -> compressed_decoder
   -> InstrF de 32 bits

PC -> PC + 2 o PC + 4
```

Archivos modificados:

| Archivo | Cambio |
|---|---|
| `src/mem/imem.v` | Memoria por halfwords, deteccion de comprimidas y conexion al decoder |
| `src/core/compressed_decoder.v` | Expansion de instrucciones comprimidas a 32 bits |
| `src/core/top.v` | Conexion de `RawInstrF`, `InstrF` e `IsCompressedF` |
| `src/core/riscvpipeline.v` | PC secuencial avanza `+2` o `+4` |
| `tb/testbench.v` | Senales nuevas en waveform |
| `run_sim.sh` | Agrega `compressed_decoder.v` a la compilacion |

## 7. Programa ISA mixto Parte 1

Archivo:

```text
mem/compressed_part1_test.mem
```

Este programa mezcla instrucciones normales de 32 bits e instrucciones comprimidas de 16 bits.

Ejemplo de estructura:

```text
0413
0140  -> addi x8, x0, 20    // instruccion normal de 32 bits

0095  -> c.addi x1, 5       // instruccion comprimida de 16 bits
010D  -> c.addi x2, 3
908A  -> c.add x1, x2
...
```

Resultado esperado:

```text
mem[100] = 25
```

## 8. Waveforms Parte 1

Para las capturas, mostrar:

```text
PCF
RawInstrF
IsCompressedF
InstrF
InstrD
InstrE
InstrM
InstrW
RegWriteW
RdW
ResultW
MemWriteM
ALUResultM
WriteDataM
```

Como explicar la waveform:

- `RawInstrF` muestra la instruccion original leida desde memoria.
- `IsCompressedF = 1` indica que era una instruccion de 16 bits.
- `InstrF` muestra la instruccion expandida a 32 bits.
- El PC avanza `+2` en instrucciones comprimidas y `+4` en instrucciones normales.
- Al final, `MemWriteM = 1`, `ALUResultM = 100` y `WriteDataM = 25`.

---

# Parte 2: instrucciones comprimidas de memoria y salto

## 1. Instrucciones pedidas

```text
c.lw
c.sw
c.lwsp
c.swsp
c.beqz
c.bnez
c.j
c.jal
c.jr
c.jalr
```

## 2. Estado actual

Estas instrucciones ya estan implementadas en el mismo modulo:

```text
src/core/compressed_decoder.v
```

La estrategia sigue siendo expandir cada instruccion comprimida a una instruccion RISC-V de 32 bits equivalente.

El test principal es:

```text
mem/compressed_part2_test.mem
```

Comando:

```bash
./run_sim.sh mem/compressed_part2_test.mem
```

Resultado esperado:

```text
Simulation succeeded
Final store: mem[100] <= 25
```

## 3. Tabla de equivalencias Parte 2

| Instruccion comprimida | Equivalente de 32 bits | Descripcion |
|---|---|---|
| `c.lw rd', offset(rs1')` | `lw rd', offset(rs1')` | Carga palabra usando registros comprimidos |
| `c.sw rs2', offset(rs1')` | `sw rs2', offset(rs1')` | Guarda palabra usando registros comprimidos |
| `c.lwsp rd, offset(x2)` | `lw rd, offset(x2)` | Carga desde stack pointer |
| `c.swsp rs2, offset(x2)` | `sw rs2, offset(x2)` | Guarda hacia stack pointer |
| `c.beqz rs1', offset` | `beq rs1', x0, offset` | Branch si registro comprimido es cero |
| `c.bnez rs1', offset` | `bne rs1', x0, offset` | Branch si registro comprimido no es cero |
| `c.j offset` | `jal x0, offset` | Salto sin link |
| `c.jal offset` | `jal x1, offset` | Salto con link |
| `c.jr rs1` | `jalr x0, 0(rs1)` | Salto indirecto sin link |
| `c.jalr rs1` | `jalr x1, 0(rs1)` | Salto indirecto con link |

## 4. Cambios esperados para Parte 2

La mayoria se puede implementar solo en `compressed_decoder.v`.

Sin embargo, hay que revisar con cuidado:

### Branches y jumps

Las instrucciones comprimidas de salto usan offsets en multiples de 2 bytes. El inmediato debe expandirse correctamente para que:

```text
target = PCE + ImmExtE
```

apunte a la direccion correcta.

### `c.jal` y `c.jalr`

El link correcto para una instruccion comprimida es:

```text
PC + 2
```

No debe asumirse siempre `PC + 4`.

El diseño ya va en esa direccion porque el PC secuencial ahora se calcula como:

```verilog
PCF + (IsCompressedF ? 32'd2 : 32'd4)
```

Pero se debe verificar que el valor propagado hacia WB sea el PC siguiente correcto.

### Memoria

`c.lw`, `c.sw`, `c.lwsp` y `c.swsp` usan la misma memoria de datos que `lw` y `sw` normales. No requieren una memoria de datos nueva.

Lo unico especial es armar bien el inmediato y los registros.

## 5. Programa ISA mixto Parte 2

El test creado es:

```text
mem/compressed_part2_test.mem
```

Mezcla instrucciones de 32 y 16 bits. Incluye:

```text
addi normales de 32 bits para inicializar registros
c.sw
c.lw
c.swsp
c.lwsp
c.beqz
c.bnez
c.j
c.jal
c.jr
c.jalr
sw final en mem[100]
```

Resultado esperado:

```text
Simulation succeeded
Final store: mem[100] <= 25
```

## 6. Waveforms Parte 2

Mostrar:

```text
PCF
RawInstrF
IsCompressedF
InstrF
PCSrcE
FlushD
FlushE
ALUResultM
WriteDataM
MemWriteM
RegWriteW
ResultW
```

Explicacion esperada:

- `c.lw` y `c.sw` deben mostrar accesos correctos a memoria.
- `c.beqz` y `c.bnez` deben activar branch logic.
- `c.j`, `c.jal`, `c.jr`, `c.jalr` deben cambiar el PC.
- Cuando el PC cambia, deben activarse flushes si corresponde.

---

# Checklist final E2

## Parte 1

| Requisito | Estado |
|---|---|
| Codigo de instrucciones comprimidas ALU | Listo |
| Test de instrucciones Parte 1 | Listo: `mem/compressed_part1_test.mem` |
| Programa mixto 32/16 bits | Listo |
| Explicacion de cada instruccion | Pendiente de pasar al informe formal |
| Codigo explicado | Pendiente de pasar al informe formal |
| Cambios de datapath | Documentado en `ENTREGA2P1_DATAPATH_CAMBIOS.md` |
| Waveforms | Falta capturar/pegar en informe |

## Parte 2

| Requisito | Estado |
|---|---|
| Codigo de instrucciones memoria/salto | Listo |
| Test de instrucciones Parte 2 | Listo: `mem/compressed_part2_test.mem` |
| Programa mixto 32/16 bits | Listo |
| Explicacion de cada instruccion | Falta |
| Codigo explicado | Falta |
| Cambios de datapath/control | Listo; falta pasar al informe formal |
| Waveforms | Falta |
