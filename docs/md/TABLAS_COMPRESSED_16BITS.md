# Tabla logica para instrucciones comprimidas de 16 bits

Este documento resume la tabla nueva que se agregaria antes del Main Decoder clasico. Su objetivo es convertir una instruccion comprimida de 16 bits en una instruccion RISC-V equivalente de 32 bits.

## 1. Ubicacion en el datapath

El flujo recomendado es:

```text
imem -> RawInstrF -> detector 16/32 -> compressed_decoder -> InstrF -> pipeline normal
```

El pipeline normal sigue trabajando con instrucciones de 32 bits:

```text
InstrF -> InstrD -> InstrE -> InstrM -> InstrW
```

Por eso `maindec.v`, `aludec.v`, `extend.v`, la ALU y la Hazard Unit pueden reutilizarse.

## 2. Regla para detectar 16 o 32 bits

En RISC-V:

```text
instr[1:0] == 2'b11   -> instruccion normal de 32 bits
instr[1:0] != 2'b11   -> instruccion comprimida de 16 bits
```

En el fetch:

```verilog
iscompressed = (halfword0[1:0] != 2'b11);
```

## 3. Campos principales de una instruccion comprimida

Una instruccion comprimida tiene 16 bits:

```text
[15:13] funct3
[12:2]  campos variables
[1:0]   quadrant
```

Los campos mas usados para decodificar son:

| Campo | Bits | Funcion |
|---|---|---|
| `funct3` | `[15:13]` | grupo principal de instruccion |
| `bit12` | `[12]` | bit extra: signo de inmediato, bit alto de shift o parte de subgrupo |
| `funct6` | `[15:10]` | grupo usado por operaciones CA como `c.sub`, `c.xor`, `c.or`, `c.and` |
| `funct2` | `[6:5]` | suboperacion dentro de instrucciones ALU comprimidas |
| `quadrant` | `[1:0]` | opcode corto / cuadrante |
| `rd/rs1` | `[11:7]` | registro completo para formatos CI/CR |
| `rs2` | `[6:2]` | segundo registro en formatos CR |
| `rd'/rs1'` | `[9:7]` | registro comprimido, equivale a `x8 + campo` |
| `rs2'` | `[4:2]` | registro comprimido, equivale a `x8 + campo` |

## 4. Tabla para Entrega 2 Parte 1

Estas instrucciones comprimidas ALU se pueden expandir a instrucciones de 32 bits ya soportadas por el pipeline.

| Instruccion comprimida | Estado | Deteccion principal | Equivalente de 32 bits |
|---|---|---|---|
| `c.addi rd, imm` | Implementada | `funct3=000`, `quadrant=01` | `addi rd, rd, imm` |
| `c.slli rd, shamt` | Implementada | `funct3=000`, `quadrant=10` | `slli rd, rd, shamt` |
| `c.lui rd, imm` | Implementada | `funct3=011`, `quadrant=01`, `rd != x0`, `rd != x2` | `lui rd, imm` |
| `c.add rd, rs2` | Implementada | `funct3=100`, `quadrant=10`, `bit12=1`, `rd != x0`, `rs2 != x0` | `add rd, rd, rs2` |
| `c.srli rd', shamt` | Implementada | `funct3=100`, `quadrant=01`, `bits[11:10]=00` | `srli rd', rd', shamt` |
| `c.srai rd', shamt` | Implementada | `funct3=100`, `quadrant=01`, `bits[11:10]=01` | `srai rd', rd', shamt` |
| `c.andi rd', imm` | Implementada extra | `funct3=100`, `quadrant=01`, `bits[11:10]=10` | `andi rd', rd', imm` |
| `c.sub rd', rs2'` | Implementada | `quadrant=01`, `funct6=100011`, `funct2=00` | `sub rd', rd', rs2'` |
| `c.xor rd', rs2'` | Implementada | `quadrant=01`, `funct6=100011`, `funct2=01` | `xor rd', rd', rs2'` |
| `c.or rd', rs2'` | Implementada | `quadrant=01`, `funct6=100011`, `funct2=10` | `or rd', rd', rs2'` |
| `c.and rd', rs2'` | Implementada | `quadrant=01`, `funct6=100011`, `funct2=11` | `and rd', rd', rs2'` |

Nota: dentro de `funct3=100`, `quadrant=01`, no basta mirar solo `funct3`. Hay que revisar `bits[11:10]`, `funct6` y `funct2` para distinguir shifts de operaciones ALU registradas.

## 4.1 Uso del bit 12

El bit `instr16[12]` es importante y cambia de significado segun el formato:

| Instruccion | Uso de `instr16[12]` |
|---|---|
| `c.addi` | bit de signo del inmediato |
| `c.slli` | bit alto del `shamt`; en RV32 normalmente debe ser 0 |
| `c.lui` | bit de signo/parte alta del inmediato |
| `c.andi` | bit de signo del inmediato |
| `c.add` | debe ser 1 para distinguirlo de `c.mv`, `c.jr` y `c.jalr` |
| `c.sub`, `c.xor`, `c.or`, `c.and` | forma parte de `funct6=instr16[15:10]` |

## 5. Registros comprimidos

Algunas instrucciones usan registros comprimidos de 3 bits. Esos registros no representan `x0` a `x7`, sino `x8` a `x15`.

```verilog
reg_comp = 5'd8 + instr16[9:7]; // rd'/rs1'
reg_comp = 5'd8 + instr16[4:2]; // rs2'
```

Ejemplo:

```text
instr16[9:7] = 001
registro real = x9
```

## 6. Ejemplo de expansion

### `c.addi`

Comprimida:

```asm
c.addi x5, 1
```

Equivalente:

```asm
addi x5, x5, 1
```

### `c.add`

Comprimida:

```asm
c.add x5, x6
```

Equivalente:

```asm
add x5, x5, x6
```

### `c.sub`

Comprimida:

```asm
c.sub x9, x10
```

Equivalente:

```asm
sub x9, x9, x10
```

## 7. Forma recomendada del modulo

Archivo futuro:

```text
compressed_decoder.v
```

Este modulo ya fue creado con soporte para toda la Entrega 2 Parte 1:

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

Interfaz sugerida:

```verilog
module compressed_decoder(
  input  [15:0] instr16,
  output reg [31:0] instr32,
  output reg        illegal
);
```

Uso conceptual:

```verilog
always @* begin
  illegal = 1'b0;
  case ({instr16[15:13], instr16[1:0]})
    5'b000_01: instr32 = expand_c_addi(instr16); // implementado
    5'b000_10: instr32 = expand_c_slli(instr16); // implementado
    5'b011_01: instr32 = expand_c_lui(instr16);  // implementado
    5'b100_10: instr32 = expand_c_add(instr16);  // implementado
    5'b100_01: instr32 = expand_c_alu_or_shift(instr16);
    default: begin
      instr32 = 32'h00000013; // NOP
      illegal = 1'b1;
    end
  endcase
end
```

## 9. Programa de prueba implementado

Archivo:

```text
mem/compressed_part1_test.mem
```

Este programa prueba todas las instrucciones comprimidas de la Parte 1 y finaliza escribiendo `25` en `mem[100]`.

Comando:

```bash
./run_sim.sh mem/compressed_part1_test.mem
```

Resultado esperado:

```text
Simulation succeeded
Final store: mem[100] <= 25
```

## 10. Tabla para Entrega 2 Parte 2

Estas instrucciones comprimidas de memoria y salto tambien se expanden a instrucciones de 32 bits ya soportadas por el pipeline.

| Instruccion comprimida | Estado | Equivalente de 32 bits |
|---|---|---|
| `c.lw rd', offset(rs1')` | Implementada | `lw rd', offset(rs1')` |
| `c.sw rs2', offset(rs1')` | Implementada | `sw rs2', offset(rs1')` |
| `c.lwsp rd, offset(x2)` | Implementada | `lw rd, offset(x2)` |
| `c.swsp rs2, offset(x2)` | Implementada | `sw rs2, offset(x2)` |
| `c.beqz rs1', offset` | Implementada | `beq rs1', x0, offset` |
| `c.bnez rs1', offset` | Implementada | `bne rs1', x0, offset` |
| `c.j offset` | Implementada | `jal x0, offset` |
| `c.jal offset` | Implementada | `jal x1, offset` |
| `c.jr rs1` | Implementada | `jalr x0, 0(rs1)` |
| `c.jalr rs1` | Implementada | `jalr x1, 0(rs1)` |

Archivo de prueba:

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

## 8. Por que no modificar directamente `maindec.v`

No conviene que `maindec.v` decodifique instrucciones de 16 bits directamente porque el resto del pipeline ya espera campos de 32 bits:

```text
opcode  = instr[6:0]
rd      = instr[11:7]
funct3  = instr[14:12]
rs1     = instr[19:15]
rs2     = instr[24:20]
funct7  = instr[31:25]
```

Si se expande la instruccion comprimida a 32 bits, esos campos quedan en el lugar correcto y se reutilizan todas las tablas existentes.
