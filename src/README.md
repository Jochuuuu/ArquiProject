# Estructura de fuentes Verilog

## `core/`

Modulos principales del procesador y control:

- `top.v`
- `riscvpipeline.v`
- `controller.v`
- `maindec.v`
- `aludec.v`
- `extend.v`
- `compressed_decoder.v`
- versiones auxiliares/nohazard y single-cycle conservadas para comparacion

## `components/`

Bloques reutilizables del datapath:

- `alu.v`
- `regfile.v`
- `adder.v`
- `flopr.v`
- `mux2.v`
- `mux3.v`

## `mem/`

Memorias del sistema:

- `imem.v`
- `dmem.v`

Los testbenches quedaron en `tb/`.
