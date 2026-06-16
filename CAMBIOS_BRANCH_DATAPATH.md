# Cambios al pipeline y datapath

Este documento resume los cambios agregados sobre el datapath pipeline original.

## 1. Branches: bne, blt y bge

Antes el pipeline solo soportaba correctamente `beq`, porque la decision de salto usaba:

```verilog
assign PCSrcE = (BranchE & ZeroE) | JumpE;
```

Eso solo permite saltar cuando `rs1 == rs2`.

Ahora se agrego soporte para:

- `beq`
- `bne`
- `blt`
- `bge`

### Cambios realizados

En `riscvpipeline.v`:

- Se agrego el registro de pipeline `funct3E`.
- Se agregaron comparadores en Execute:
  - `EqualE`
  - `LessThanE`
- Se agrego `BranchTakenE`.
- Se cambio la generacion de `PCSrcE`.

Logica nueva:

```verilog
assign EqualE = (SrcAE == WriteDataE);
assign LessThanE = ($signed(SrcAE) < $signed(WriteDataE));

assign BranchTakenE = (funct3E == 3'b000) ? EqualE :
                      (funct3E == 3'b001) ? ~EqualE :
                      (funct3E == 3'b100) ? LessThanE :
                      (funct3E == 3'b101) ? ~LessThanE :
                      1'b0;

assign PCSrcE = (BranchE & BranchTakenE) | JumpE;
```

| Instruccion | funct3 | Condicion |
| --- | --- | --- |
| `beq` | `000` | `rs1 == rs2` |
| `bne` | `001` | `rs1 != rs2` |
| `blt` | `100` | `rs1 < rs2` con signo |
| `bge` | `101` | `rs1 >= rs2` con signo |

## 2. Shifts aritmeticos: sra y srai

Antes la ALU tenia operaciones para `sll` y `srl`, pero no para shift right aritmetico.

### Cambios realizados

Se amplio `ALUControl` de 3 bits a 4 bits en:

- `alu.v`
- `aludec.v`
- `controller.v`
- `datapath.v`
- `riscvsingle.v`
- `riscvpipeline.v`

Se agrego en `alu.v`:

```verilog
4'b1000: result_reg = $signed(a) >>> b[4:0]; // sra
```

En `aludec.v`, `funct3 = 101` ahora distingue:

- `funct7b5 = 0`: `srl` / `srli`
- `funct7b5 = 1`: `sra` / `srai`

## 3. LUI

Se agrego soporte para:

- `lui rd, imm`

`lui` escribe:

```text
rd = imm << 12
```

### Cambios realizados

Se amplio `ImmSrc` de 2 bits a 3 bits para poder representar el inmediato U-type.

Archivos modificados:

- `maindec.v`
- `extend.v`
- `controller.v`
- `datapath.v`
- `riscvsingle.v`
- `riscvpipeline.v`

En `extend.v` se agrego el inmediato U-type:

```verilog
3'b100: immext_reg = {instr[31:12], 12'b0};
```

En `maindec.v` se agrego el opcode de `lui`:

```verilog
7'b0110111: controls = 12'b1_100_1_0_00_0_11_0; // lui
```

En `aludec.v`, `ALUOp = 2'b11` genera una operacion especial para pasar el inmediato:

```verilog
2'b11: ALUControl_reg = 4'b1001; // pass immediate for lui
```

En `alu.v` se agrego:

```verilog
4'b1001: result_reg = b; // lui/pass immediate
```

## 4. Que se agrego al datapath original del pipeline

Sobre el datapath pipeline original se agregaron estas partes:

1. Comparadores en Execute para branches:
   - `EqualE`
   - `LessThanE`

2. Registro de pipeline adicional:
   - `funct3E`, para saber en Execute si el branch es `beq`, `bne`, `blt` o `bge`.

3. Logica de decision de branch:
   - `BranchTakenE`

4. Senal de control mas ancha para la ALU:
   - `ALUControl` paso de 3 bits a 4 bits.

5. Senal de seleccion de inmediato mas ancha:
   - `ImmSrc` paso de 2 bits a 3 bits.

6. Generador de inmediato U-type en `extend.v`.

7. Operacion interna de ALU para `lui`:
   - pasar `ImmExt` como resultado de ALU.

No se agrego una memoria nueva ni un nuevo banco de registros. El pipeline sigue teniendo las mismas 5 etapas:

```text
Fetch -> Decode -> Execute -> Memory -> Writeback
```

## 5. Programas de prueba agregados

- `branch_test.mem`: prueba branches.
- `srai_test.mem`: prueba `srai` / `sra`.
- `lui_test.mem`: prueba `lui`.

## Conclusion

El datapath original se mantiene como pipeline de 5 etapas, pero se ampliaron la logica de branch, la decodificacion de inmediatos y la ALU para cubrir mas instrucciones de la ISA.
