# Datapath antes de instrucciones comprimidas

Este documento describe como estaba organizado el datapath del procesador antes de preparar el soporte para instrucciones comprimidas de 16 bits. En esta version, todas las instrucciones se consideraban de 32 bits y el PC siempre avanzaba de 4 en 4.

## 1. Vista general

El procesador usa un pipeline clasico de cinco etapas:

```text
IF -> ID -> EX -> MEM -> WB
```

Cada instruccion avanza por registros intermedios entre etapas:

```text
InstrF -> InstrD -> InstrE -> InstrM -> InstrW
```

El objetivo de estos registros es conservar la instruccion y sus senales de control mientras avanza por el pipeline.

## 2. Etapa IF: Instruction Fetch

Archivos principales:

```text
riscvpipeline.v
imem.v
top.v
flopr.v
adder.v
```

En la etapa Fetch, el PC se usa para leer una instruccion desde la memoria de instrucciones.

Antes del cambio para instrucciones comprimidas, la memoria estaba organizada por palabras de 32 bits:

```verilog
reg [31:0] RAM[0:63];
assign rd = RAM[a[31:2]];
```

Esto significa:

```text
PC = 0  -> RAM[0]
PC = 4  -> RAM[1]
PC = 8  -> RAM[2]
PC = 12 -> RAM[3]
```

Por eso el PC siempre avanzaba:

```text
PCNext = PC + 4
```

Flujo de Fetch:

```text
PCF -> imem -> InstrF
PCF -> adder +4 -> PCPlus4F
PCSrcE decide si PCNextF = PCPlus4F o target de branch/jump
```

## 3. Registro IF/ID

Archivo:

```text
riscvpipeline.v
```

La instruccion leida en Fetch se guarda en Decode:

```verilog
InstrD <= InstrF;
PCD <= PCF;
PCPlus4D <= PCPlus4F;
```

Si hay reset o flush, se inserta un NOP:

```verilog
InstrD <= 32'h00000013;
```

Ese valor equivale a:

```asm
addi x0, x0, 0
```

y se usa como burbuja segura.

## 4. Etapa ID: Instruction Decode

Archivos principales:

```text
riscvpipeline.v
controller.v
maindec.v
aludec.v
extend.v
regfile.v
```

En Decode se separan los campos de la instruccion:

```verilog
opD       = InstrD[6:0];
funct3D   = InstrD[14:12];
funct7b5D = InstrD[30];
Rs1D      = InstrD[19:15];
Rs2D      = InstrD[24:20];
RdD       = InstrD[11:7];
```

Luego:

- `controller.v` genera las senales de control.
- `regfile.v` lee los registros fuente.
- `extend.v` genera el inmediato extendido.

Flujo de Decode:

```text
InstrD -> campos rs1/rs2/rd/op/funct
InstrD -> controller -> senales de control
InstrD -> extend -> ImmExtD
rs1/rs2 -> regfile -> RD1D/RD2D
```

## 5. Registro ID/EX

Archivo:

```text
riscvpipeline.v
```

Los datos y senales de Decode pasan a Execute:

```text
RD1D -> RD1E
RD2D -> RD2E
ImmExtD -> ImmExtE
PCD -> PCE
Rs1D/Rs2D/RdD -> Rs1E/Rs2E/RdE
control D -> control E
```

Si hay flush o stall load-use, se limpia Execute:

```text
FlushE = StallD | PCSrcE
```

## 6. Etapa EX: Execute

Archivos principales:

```text
riscvpipeline.v
alu.v
mux2.v
mux3.v
adder.v
```

En Execute se calculan:

- Operaciones de ALU.
- Direcciones de memoria para `lw` y `sw`.
- Direcciones destino para branch y jump.
- Comparaciones para branches.

Los operandos de ALU pueden venir del banco de registros o del forwarding:

```text
RD1E / ResultW / ALUResultM -> forwardamux -> SrcAE
RD2E / ResultW / ALUResultM -> forwardbmux -> WriteDataE
WriteDataE o ImmExtE -> srcbmux -> SrcBE
```

La ALU calcula:

```text
ALUResultE = ALU(SrcAE, SrcBE)
```

La logica de branch calcula:

```text
EqualE = SrcAE == WriteDataE
LessThanE = signed(SrcAE) < signed(WriteDataE)
```

y decide:

```text
BranchTakenE
PCSrcE = (BranchE & BranchTakenE) | JumpE
```

Para `jalr`, el target se calcula como:

```verilog
PCTargetJalrE = (SrcAE + ImmExtE) & 32'hfffffffe;
```

## 7. Registro EX/MEM

Archivo:

```text
riscvpipeline.v
```

Los resultados de Execute pasan a Memory:

```text
ALUResultE -> ALUResultM
WriteDataE -> WriteDataM
RdE -> RdM
control E -> control M
```

## 8. Etapa MEM: Memory Access

Archivos principales:

```text
riscvpipeline.v
dmem.v
top.v
```

En esta etapa se accede a memoria de datos:

```text
ALUResultM -> direccion
WriteDataM -> dato para sw
MemWriteM -> habilita escritura
ReadDataM -> dato leido por lw
```

Para `sw`:

```text
dmem[ALUResultM] = WriteDataM
```

Para `lw`:

```text
ReadDataM = dmem[ALUResultM]
```

## 9. Registro MEM/WB

Archivo:

```text
riscvpipeline.v
```

Los valores pasan a Writeback:

```text
ALUResultM -> ALUResultW
ReadDataM -> ReadDataW
PCPlus4M -> PCPlus4W
RdM -> RdW
control M -> control W
```

## 10. Etapa WB: Write Back

Archivos principales:

```text
riscvpipeline.v
regfile.v
mux3.v
```

En Writeback se decide que valor se escribe al banco de registros:

```text
ResultW = ALUResultW  // operaciones ALU, lui, direcciones
ResultW = ReadDataW   // lw
ResultW = PCPlus4W    // jal, jalr
```

Luego:

```text
if RegWriteW:
    rf[RdW] = ResultW
```

## 11. Hazard Unit

Archivo:

```text
riscvpipeline.v
```

La Hazard Unit resuelve tres problemas:

### Forwarding

Si una instruccion en Execute necesita un resultado que esta en Memory o Writeback, se reenvia:

```text
ForwardAE
ForwardBE
```

### Stall

Si una instruccion depende inmediatamente de un `lw`, forwarding no alcanza. Entonces:

```text
StallF = 1
StallD = 1
FlushE = 1
```

### Flush

Si un branch o jump cambia el PC:

```text
FlushD = PCSrcE
FlushE = StallD | PCSrcE
```

## 12. Resumen del datapath antes de C

Antes de instrucciones comprimidas:

```text
imem entregaba 32 bits completos.
PC siempre avanzaba +4.
InstrF era directamente la instruccion de memoria.
No existia RawInstrF.
No existia IsCompressedF.
No existia decoder 16 -> 32.
```

Flujo completo:

```text
PCF
 -> imem[PCF >> 2]
 -> InstrF
 -> InstrD
 -> controller/regfile/extend
 -> InstrE + ALU/branch/forwarding
 -> InstrM + dmem
 -> InstrW + writeback
```

## 13. Diferencia con la preparacion para C

Con la preparacion para instrucciones comprimidas:

```text
imem entrega halfwords de 16 bits.
Se agrego RawInstrF.
Se agrego IsCompressedF.
El PC puede avanzar +2 o +4.
InstrF pasa a ser la instruccion normalizada que entra al pipeline.
```

Todavia falta agregar:

```text
compressed_decoder.v
```

Ese modulo convertira instrucciones `c.*` de 16 bits en instrucciones equivalentes de 32 bits.
