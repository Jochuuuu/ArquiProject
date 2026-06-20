# Entrega 2 Parte 1: cambios en el datapath

Este documento resume que cambios deben mostrarse en el diagrama de datapath para soportar instrucciones comprimidas de 16 bits de la Parte 1.

## 1. Idea principal

Antes, el procesador asumía que todas las instrucciones eran de 32 bits:

```text
PC -> Instruction Memory -> InstrF -> IF/ID
PC -> PC + 4
```

Ahora, la memoria de instrucciones puede contener instrucciones de 16 y 32 bits. Por eso, el Fetch debe:

1. Leer halfwords de 16 bits.
2. Detectar si la instrucción es comprimida.
3. Avanzar el PC en 2 o 4 bytes.
4. Expandir instrucciones comprimidas a instrucciones equivalentes de 32 bits.
5. Entregar al pipeline una instrucción final de 32 bits.

El resto del pipeline sigue trabajando con instrucciones de 32 bits:

```text
InstrF -> InstrD -> InstrE -> InstrM -> InstrW
```

## 2. Cambios que se deben dibujar

### 2.1 Memoria de instrucciones por halfwords

Antes:

```text
imem -> InstrF[31:0]
```

Ahora:

```text
imem -> halfword0[15:0]
     -> halfword1[15:0]
```

La instrucción normal de 32 bits se arma como:

```verilog
{halfword1, halfword0}
```

Esto se debe a que el `.mem` está organizado en líneas de 16 bits, con el halfword bajo primero y el halfword alto después.

## 2.2 Detector 16/32 bits

Se agrega una lógica de detección usando los bits bajos del primer halfword:

```verilog
IsCompressedF = (halfword0[1:0] != 2'b11);
```

Regla:

```text
halfword0[1:0] == 2'b11 -> instrucción normal de 32 bits
halfword0[1:0] != 2'b11 -> instrucción comprimida de 16 bits
```

En el diagrama, este bloque puede llamarse:

```text
Compressed Detector
```

Entrada:

```text
halfword0[1:0]
```

Salida:

```text
IsCompressedF
```

## 2.3 PC +2 / PC +4

Antes:

```text
PCSeqF = PCF + 4
```

Ahora:

```verilog
PCSeqF = PCF + (IsCompressedF ? 32'd2 : 32'd4);
```

En el diagrama se puede dibujar como:

```text
PC + 2 ----\
            mux -> PCSeqF
PC + 4 ----/
select = IsCompressedF
```

Esto permite que:

```text
instrucción comprimida -> PC + 2
instrucción normal     -> PC + 4
```

## 2.4 Compressed Decoder

Se agrega el bloque:

```text
compressed_decoder
```

Entrada:

```text
halfword0[15:0]
```

Salida:

```text
ExpandedInstrF[31:0]
```

Este bloque convierte instrucciones comprimidas de 16 bits en instrucciones RISC-V equivalentes de 32 bits.

Ejemplos:

```text
c.addi rd, imm  -> addi rd, rd, imm
c.add rd, rs2   -> add rd, rd, rs2
c.sub rd', rs2' -> sub rd', rd', rs2'
c.and rd', rs2' -> and rd', rd', rs2'
c.or rd', rs2'  -> or rd', rd', rs2'
c.xor rd', rs2' -> xor rd', rd', rs2'
c.slli rd, sh   -> slli rd, rd, sh
c.srli rd', sh  -> srli rd', rd', sh
c.srai rd', sh  -> srai rd', rd', sh
c.lui rd, imm   -> lui rd, imm
```

## 2.5 Mux de instrucción final

Se agrega un mux para elegir qué instrucción entra al pipeline.

Entradas:

```text
RawInstr32F      = {halfword1, halfword0}
ExpandedInstrF   = salida del compressed_decoder
```

Selector:

```text
IsCompressedF
```

Salida:

```text
InstrF[31:0]
```

Comportamiento:

```text
si IsCompressedF = 0 -> InstrF = RawInstr32F
si IsCompressedF = 1 -> InstrF = ExpandedInstrF
```

## 3. Diagrama conceptual

```text
                         halfword0[1:0]
                               |
                               v
PCF -> imem -> halfword0 ----> Detector 16/32 ----> IsCompressedF
             -> halfword1              |
                  |                    |
                  v                    v
          {halfword1, halfword0}   compressed_decoder
                  |                    |
                  |                    v
                  |              ExpandedInstrF
                  |                    |
                  +---------> mux <----+
                              |
                              v
                            InstrF
                              |
                              v
                            IF/ID

PCF + 2 ----\
             mux -> PCSeqF -> PC mux -> PC register
PCF + 4 ----/
select = IsCompressedF
```

## 4. Qué partes del pipeline no cambian

Como las instrucciones comprimidas se expanden a 32 bits antes de entrar al pipeline, estas partes se reutilizan:

```text
maindec.v
aludec.v
extend.v
alu.v
regfile.v
Hazard Unit
MEM
WB
```

La razón es que todas reciben una instrucción normalizada de 32 bits.

## 5. Archivos relacionados

| Archivo | Cambio |
|---|---|
| `src/mem/imem.v` | Memoria por halfwords, detección 16/32 y conexión al decoder comprimido |
| `src/core/compressed_decoder.v` | Expande instrucciones comprimidas a equivalentes de 32 bits |
| `src/core/top.v` | Conecta `RawInstrF`, `InstrF` e `IsCompressedF` |
| `src/core/riscvpipeline.v` | PC secuencial avanza +2 o +4 |
| `tb/testbench.v` | Muestra `RawInstrF`, `IsCompressedF` e `InstrF` en waveform |

## 6. Señales recomendadas para waveform

Para demostrar el cambio en el datapath:

```text
PCF
RawInstrF
IsCompressedF
InstrF
InstrD
InstrE
InstrM
InstrW
```

Interpretación:

```text
RawInstrF       -> instrucción original en memoria
IsCompressedF   -> indica si era de 16 bits
InstrF          -> instrucción expandida/final de 32 bits
```

## 7. Resumen para informe

Se modificó el datapath en la etapa Fetch para soportar instrucciones de 16 y 32 bits. La memoria de instrucciones ahora entrega halfwords de 16 bits, se agregó un detector que revisa `halfword0[1:0]`, y el PC secuencial puede avanzar 2 o 4 bytes. Además, se agregó un `compressed_decoder` que convierte instrucciones comprimidas a instrucciones RISC-V equivalentes de 32 bits. De esta forma, el resto del pipeline se mantiene igual y puede reutilizar la unidad de control, la ALU, el extensor de inmediatos y la Hazard Unit existentes.
