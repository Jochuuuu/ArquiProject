# Tablas logicas del pipeline RISC-V de 32 bits

Este documento resume las tablas logicas principales del procesador pipeline actual. Estas tablas corresponden al flujo normal de instrucciones RISC-V de 32 bits.

## 1. Main Decoder

Archivo: `maindec.v`

El Main Decoder recibe el opcode:

```verilog
op = Instr[6:0]
```

y genera las senales generales de control:

```text
RegWrite, ImmSrc, ALUSrc, MemWrite, ResultSrc, Branch, ALUOp, Jump
```

| Instruccion | Opcode | RegWrite | ImmSrc | ALUSrc | MemWrite | ResultSrc | Branch | ALUOp | Jump |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `lw` | `0000011` | 1 | I | 1 | 0 | Mem | 0 | 00 | 0 |
| `sw` | `0100011` | 0 | S | 1 | 1 | X | 0 | 00 | 0 |
| R-type | `0110011` | 1 | X | 0 | 0 | ALU | 0 | 10 | 0 |
| Branch | `1100011` | 0 | B | 0 | 0 | X | 1 | 01 | 0 |
| I-type ALU | `0010011` | 1 | I | 1 | 0 | ALU | 0 | 10 | 0 |
| `jal` | `1101111` | 1 | J | 0 | 0 | PC+4 | 0 | 00 | 1 |
| `jalr` | `1100111` | 1 | I | 1 | 0 | PC+4 | 0 | 00 | 1 |
| `lui` | `0110111` | 1 | U | 1 | 0 | ALU | 0 | 11 | 0 |

## 2. ALU Decoder

Archivo: `aludec.v`

El ALU Decoder recibe:

```text
ALUOp, funct3, funct7b5, opb5
```

y genera:

```text
ALUControl
```

| Instruccion | `funct3` | `funct7b5` | `ALUControl` | Operacion |
|---|---:|---:|---:|---|
| `add`, `addi`, `lw`, `sw`, `jalr` | `000` | 0 | `0000` | suma |
| `sub` | `000` | 1 | `0001` | resta |
| `and`, `andi` | `111` | 0 | `0010` | AND |
| `or`, `ori` | `110` | 0 | `0011` | OR |
| `xor`, `xori` | `100` | 0 | `0100` | XOR |
| `slt`, `slti` | `010` | 0 | `0101` | menor que |
| `sll`, `slli` | `001` | 0 | `0110` | shift left logical |
| `srl`, `srli` | `101` | 0 | `0111` | shift right logical |
| `sra`, `srai` | `101` | 1 | `1000` | shift right arithmetic |
| `lui` | X | X | `1001` | pasa inmediato |

## 3. Immediate Extender

Archivo: `extend.v`

El extensor recibe:

```text
ImmSrc
```

y genera:

```text
ImmExt
```

| `ImmSrc` | Tipo | Instrucciones | Formato de inmediato |
|---:|---|---|---|
| `000` | I-type | `lw`, `addi`, `jalr`, ALU immediate | `instr[31:20]` con extension de signo |
| `001` | S-type | `sw` | `instr[31:25]` + `instr[11:7]` |
| `010` | B-type | `beq`, `bne`, `blt`, `bge` | inmediato de branch con bit bajo 0 |
| `011` | J-type | `jal` | inmediato de jump con bit bajo 0 |
| `100` | U-type | `lui` | `instr[31:12] << 12` |

## 4. ALU

Archivo: `alu.v`

La ALU ejecuta la operacion indicada por `ALUControl`.

| `ALUControl` | Operacion |
|---:|---|
| `0000` | `a + b` |
| `0001` | `a - b` |
| `0010` | `a & b` |
| `0011` | `a \| b` |
| `0100` | `a ^ b` |
| `0101` | `a < b` con signo |
| `0110` | `a << b[4:0]` |
| `0111` | `a >> b[4:0]` |
| `1000` | `$signed(a) >>> b[4:0]` |
| `1001` | `b` para `lui` |

## 5. Branch Logic

Archivo: `riscvpipeline.v`

La logica de branch usa `funct3E` para decidir si el salto se toma.

| `funct3E` | Instruccion | Condicion |
|---:|---|---|
| `000` | `beq` | `rs1 == rs2` |
| `001` | `bne` | `rs1 != rs2` |
| `100` | `blt` | `rs1 < rs2` con signo |
| `101` | `bge` | `rs1 >= rs2` con signo |

La senal final es:

```verilog
PCSrcE = (BranchE & BranchTakenE) | JumpE
```

## 6. Hazard Unit

Archivo: `riscvpipeline.v`

La Hazard Unit genera senales de forwarding, stall y flush.

### Entradas principales

| Senal | Uso |
|---|---|
| `Rs1E`, `Rs2E` | fuentes de la instruccion en Execute |
| `RdM`, `RdW` | destinos en Memory y Writeback |
| `RegWriteM`, `RegWriteW` | indican si MEM/WB escriben registro |
| `Rs1D`, `Rs2D` | fuentes de la instruccion en Decode |
| `RdE` | destino de la instruccion en Execute |
| `ResultSrcE` | detecta si la instruccion en Execute es `lw` |
| `PCSrcE` | indica branch/jump tomado |

### Salidas principales

| Senal | Funcion |
|---|---|
| `ForwardAE` | selecciona operando A de ALU |
| `ForwardBE` | selecciona operando B de ALU |
| `StallF` | congela Fetch |
| `StallD` | congela Decode |
| `FlushD` | limpia Decode |
| `FlushE` | limpia Execute |

## 7. Fetch para 16/32 bits

Archivos: `imem.v`, `top.v`, `riscvpipeline.v`

Este cambio prepara el datapath para instrucciones comprimidas.

| Senal | Funcion |
|---|---|
| `RawInstrF` | bits leidos desde memoria antes de normalizar |
| `IsCompressedF` | vale 1 si los bits bajos no son `2'b11` |
| `InstrF` | instruccion final de 32 bits que entra al pipeline |

Regla de deteccion:

```verilog
IsCompressedF = (halfword0[1:0] != 2'b11)
```

PC secuencial:

```verilog
PCNext = PC + 2  // si es comprimida
PCNext = PC + 4  // si es normal de 32 bits
```

Por ahora las instrucciones comprimidas detectadas se convierten en NOP hasta agregar el decoder de 16 bits.
