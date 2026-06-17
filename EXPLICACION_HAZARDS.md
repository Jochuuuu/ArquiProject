# Explicacion de hazards, forwarding, stall y flush

## 1. Que es un hazard

Un hazard es un problema que aparece en un procesador con pipeline cuando una instruccion no puede continuar normalmente porque depende de otra instruccion anterior o porque el flujo del programa cambia.

En este proyecto se manejan principalmente dos tipos:

- **Data hazard**: ocurre cuando una instruccion necesita un registro cuyo valor todavia no ha terminado de calcularse o escribirse.
- **Control hazard**: ocurre con instrucciones de salto o branch, porque el procesador ya pudo haber traido instrucciones incorrectas antes de saber si el salto se toma.

La solucion implementada en el procesador usa:

- **Forwarding** para resolver dependencias de datos cuando el resultado ya esta disponible en otra etapa.
- **Stall** para detener el pipeline cuando forwarding no es suficiente, especialmente despues de un `lw`.
- **Flush** para limpiar instrucciones incorrectas despues de un branch o jump tomado.

## 2. Forwarding

Forwarding significa reenviar un resultado directamente desde una etapa avanzada del pipeline hacia la etapa Execute, sin esperar a que se escriba en el banco de registros.

Ejemplo:

```asm
add x3, x1, x2
add x4, x3, x1
```

La segunda instruccion necesita `x3`, que fue producido por la instruccion anterior. En vez de esperar a Writeback, el resultado se manda directamente hacia la ALU.

En el codigo, el forwarding esta en `riscvpipeline.v`, dentro de la unidad de hazards:

```verilog
assign ForwardAE = ((Rs1E != 5'b0) && (Rs1E == RdM) && RegWriteM) ? 2'b10 :
                   ((Rs1E != 5'b0) && (Rs1E == RdW) && RegWriteW) ? 2'b01 :
                   2'b00;

assign ForwardBE = ((Rs2E != 5'b0) && (Rs2E == RdM) && RegWriteM) ? 2'b10 :
                   ((Rs2E != 5'b0) && (Rs2E == RdW) && RegWriteW) ? 2'b01 :
                   2'b00;
```

Las senales significan:

| Senal | Funcion |
|---|---|
| `ForwardAE` | Selecciona el dato que entra como operando A de la ALU |
| `ForwardBE` | Selecciona el dato que entra como operando B antes del mux de inmediato |
| `2'b00` | Usa el valor normal leido del registro |
| `2'b01` | Reenvia desde Writeback |
| `2'b10` | Reenvia desde Memory |

Los multiplexores que aplican el forwarding tambien estan en `riscvpipeline.v`:

```verilog
mux3 #(32) forwardamux(...);
mux3 #(32) forwardbmux(...);
```

El archivo de prueba relacionado es:

- `mem/forwarding_test.mem`

## 3. Stall

Un stall es una pausa del pipeline. Se usa cuando una instruccion debe esperar porque el dato que necesita todavia no esta disponible.

El caso principal es el **load-use hazard**:

```asm
lw  x1, 96(x0)
add x2, x1, x1
```

La instruccion `add` necesita `x1`, pero `lw` recien obtiene el dato desde memoria. En este caso forwarding no alcanza, porque el dato todavia no existe a tiempo para la etapa Execute de la siguiente instruccion.

En el codigo, el stall se detecta asi:

```verilog
assign StallD = ResultSrcE[0] && ((Rs1D == RdE) || (Rs2D == RdE));
assign StallF = StallD;
```

La condicion revisa:

- `ResultSrcE[0]`: indica que la instruccion en Execute viene de memoria, como `lw`.
- `Rs1D == RdE`: la instruccion en Decode usa como `rs1` el destino del `lw`.
- `Rs2D == RdE`: la instruccion en Decode usa como `rs2` el destino del `lw`.

Si se cumple, se detienen las etapas Fetch y Decode:

- `StallF` mantiene el PC sin avanzar.
- `StallD` mantiene la instruccion en Decode.

En `riscvpipeline.v`, el PC se mantiene usando `StallF`:

```verilog
.d(StallF ? PCF : PCNextF)
```

Y la etapa Decode solo avanza si no hay stall:

```verilog
end else if (!StallD) begin
  InstrD   <= InstrF;
  PCD      <= PCF;
  PCPlus4D <= PCPlus4F;
end
```

El archivo de prueba relacionado es:

- `mem/stalling_test.mem`

## 4. Flush

Flush significa limpiar una etapa del pipeline e insertar una instruccion neutra, normalmente un `nop`. Se usa cuando el procesador ya trajo instrucciones que no debian ejecutarse.

Esto pasa con branches y saltos:

```asm
beq x1, x1, etiqueta
addi x2, x0, 99
etiqueta:
addi x2, x0, 25
```

Si el `beq` se toma, la instruccion `addi x2, x0, 99` ya pudo haber entrado al pipeline, pero no debe ejecutarse. Por eso se hace flush.

En el codigo:

```verilog
assign FlushD = PCSrcE;
assign FlushE = StallD | PCSrcE;
```

Esto significa:

- Si `PCSrcE = 1`, se limpia Decode porque hubo branch o jump tomado.
- Execute tambien se limpia si hubo branch/jump tomado o si se necesita insertar burbuja por stall.

En Decode, cuando `FlushD` esta activo, se inserta un `nop`:

```verilog
if (reset || FlushD) begin
  InstrD <= 32'h00000013;
end
```

`32'h00000013` corresponde a:

```asm
addi x0, x0, 0
```

que funciona como `nop`.

Los archivos de prueba relacionados son:

- `mem/flushing_test.mem`
- `mem/branch_test.mem`
- `mem/jalr_test.mem`

## 5. Branches y control hazard

En la version actual se agrego una logica mas completa para branches. Antes se usaba principalmente `ZeroE`, pensado para `beq`. Ahora se evalua `funct3E` para soportar varias instrucciones:

```verilog
assign EqualE = (SrcAE == WriteDataE);
assign LessThanE = ($signed(SrcAE) < $signed(WriteDataE));

assign BranchTakenE = (funct3E == 3'b000) ? EqualE :
                      (funct3E == 3'b001) ? ~EqualE :
                      (funct3E == 3'b100) ? LessThanE :
                      (funct3E == 3'b101) ? ~LessThanE :
                      1'b0;
```

Las instrucciones soportadas por esta logica son:

| Instruccion | Condicion |
|---|---|
| `beq` | Salta si los registros son iguales |
| `bne` | Salta si los registros son diferentes |
| `blt` | Salta si `rs1 < rs2` con signo |
| `bge` | Salta si `rs1 >= rs2` con signo |

Luego se decide si cambiar el PC:

```verilog
assign PCSrcE = (BranchE & BranchTakenE) | JumpE;
```

Si `PCSrcE` vale 1, se activa el flush.

## 6. Jalr

Tambien se agrego soporte para `jalr`. Esta instruccion calcula el nuevo PC usando un registro base mas un inmediato:

```verilog
assign PCTargetJalrE = (SrcAE + ImmExtE) & 32'hfffffffe;
assign PCJumpTargetE = JalrE ? PCTargetJalrE : PCTargetE;
```

El `& 32'hfffffffe` limpia el bit menos significativo para asegurar que la direccion quede alineada.

Archivo de prueba:

- `mem/jalr_test.mem`

## 7. Archivos principales

| Archivo | Funcion |
|---|---|
| `riscvpipeline.v` | Contiene el pipeline, forwarding, stall, flush, branches y `jalr` |
| `mux3.v` | Multiplexores usados para seleccionar valores reenviados por forwarding |
| `flopr.v` | Registro del PC; se usa con `StallF` para congelar Fetch |
| `controller.v` | Control principal que genera senales como `RegWrite`, `MemWrite`, `Jump`, `ALUSrc`, `ResultSrc` |
| `maindec.v` | Decodifica opcodes principales |
| `aludec.v` | Decodifica operaciones de ALU |
| `testbench.v` | Genera el VCD y verifica resultados de simulacion |
| `imem.v` | Carga el archivo `.mem` con `$readmemh` |
| `run_sim.sh` | Script para compilar, ejecutar y generar `riscv_pipe.vcd` |
| `sim.conf` | Configuracion del archivo `.mem` que se quiere ejecutar |

## 8. Archivos de prueba `.mem`

| Archivo | Que prueba |
|---|---|
| `mem/forwarding_test.mem` | Forwarding con instrucciones dependientes |
| `mem/stalling_test.mem` | Stall por `lw` seguido de instruccion dependiente |
| `mem/flushing_test.mem` | Flush causado por branch tomado |
| `mem/branch_test.mem` | Branch `bne` |
| `mem/jalr_test.mem` | Salto indirecto con `jalr` |
| `mem/lui_test.mem` | Instruccion `lui` |
| `mem/srai_test.mem` | Desplazamiento aritmetico `srai` y `sra` |
| `mem/isa_no_dependencies.mem` | Instrucciones base sin dependencias cercanas |

## 9. Resumen para exposicion

La unidad de hazards del procesador detecta dependencias entre instrucciones del pipeline. Cuando el dato ya esta disponible en Memory o Writeback, se usa forwarding para enviarlo directamente a Execute. Cuando el dato viene de un `lw` y todavia no esta listo, se usa stall para pausar Fetch y Decode durante un ciclo. Finalmente, cuando un branch o jump cambia el PC, se usa flush para borrar las instrucciones incorrectas que ya entraron al pipeline.

Con esto el procesador puede ejecutar correctamente instrucciones dependientes, cargas desde memoria, branches y saltos sin que se escriban resultados incorrectos.
