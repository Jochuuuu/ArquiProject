# RISC-V C Pipeline Simulator

Este proyecto implementa un procesador RISC-V pipelined en Verilog. Soporta
instrucciones normales de 32 bits y tambien instrucciones comprimidas RVC de
16 bits.

El flujo principal es simple: se carga un archivo `.mem`, se compila el
procesador con Icarus Verilog y se ejecuta la simulacion. El backend y el
frontend son herramientas extra para usar el simulador de forma mas visual.

## Estructura

- `src/`: codigo Verilog del procesador.
- `src/core/`: pipeline, control, hazard unit y decoder RVC.
- `src/components/`: ALU, registros, multiplexores y bloques reutilizables.
- `src/mem/`: memoria de instrucciones y memoria de datos.
- `tb/`: testbench.
- `mem/`: programas de prueba `.mem`.
- `run_sim.sh`: script para compilar y correr simulaciones.
- `sim.conf`: configuracion de memoria por defecto.
- `backend/`: API opcional para correr simulaciones.
- `frontend/`: interfaz web opcional.

## Requisitos

Para correr la simulacion Verilog necesitas:

```text
iverilog
vvp
```

Para usar la interfaz web tambien necesitas:

```text
Node.js
npm
```

## Correr una simulacion

El archivo `run_sim.sh` compila el procesador con `iverilog` y luego corre la
simulacion con `vvp`.

Si el archivo no existe o se quiere recrear, la idea es guardar en
`run_sim.sh` el comando de compilacion de Verilog. El script usa este comando
base:

```bash
iverilog -g2005 -o build/riscv_pipe_sim \
  tb/testbench.v \
  src/core/top.v src/core/riscvpipeline.v src/core/controller.v \
  src/core/maindec.v src/core/aludec.v src/core/extend.v \
  src/core/compressed_decoder.v \
  src/components/regfile.v src/components/alu.v src/components/mux2.v \
  src/components/mux3.v src/components/flopr.v src/components/adder.v \
  src/mem/imem.v src/mem/dmem.v
```

Luego ejecuta el simulador generado con:

```bash
vvp build/riscv_pipe_sim
```

Primero pon la memoria que quieres probar en `sim.conf`:

```bash
MEMFILE=mem/compressed_part1_test.mem
```

Luego ejecuta:

```bash
./run_sim.sh
```

Para cambiar de prueba, solo cambia `MEMFILE`. Por ejemplo:

```bash
MEMFILE=mem/compressed_part2_test.mem
```

Tambien puedes pasar el `.mem` directo al script:

```bash
./run_sim.sh mem/compressed_part1_test.mem
```

Si todo sale bien, veras algo como:

```text
Simulation succeeded
Final store: mem[100] <= 25
```

La simulacion tambien genera un archivo VCD para ver señales en GTKWave:

```text
build/riscv_pipe.vcd
```

Si quieres que el script abra GTKWave al terminar, en `sim.conf` puedes poner:

```bash
OPEN_VCD=1
```

## Formato de los archivos .mem

La memoria de instrucciones esta organizada en halfwords de 16 bits. Por eso
cada linea del archivo `.mem` tiene 16 bits.

Una instruccion normal de 32 bits ocupa dos lineas:

```text
0093  // low  de 00000093
0000  // high de 00000093
```

La parte baja (`low`) va primero y la parte alta (`high`) va despues. Dentro de
la memoria se reconstruye asi:

```verilog
{halfword1, halfword0}
```

Una instruccion comprimida de 16 bits ocupa una sola linea:

```text
0095  // c.addi x1, 5
```

El procesador detecta el tamaño revisando los bits bajos:

```verilog
assign iscompressed = (halfword0[1:0] != 2'b11);
```

Si la instruccion es comprimida, se expande en `compressed_decoder.v` a una
instruccion equivalente de 32 bits. Asi el resto del pipeline sigue trabajando
con instrucciones de 32 bits.

## Pruebas disponibles

Algunos archivos utiles en `mem/`:

```text
compressed_part1_test.mem      instrucciones RVC aritmeticas y logicas
compressed_part2_test.mem      memoria, branches y jumps comprimidos
forwarding_test.mem            forwarding
stalling_test.mem              stall por load-use
flushing_test.mem              flush por cambio de PC
branch_test.mem                branches
jalr_test.mem                  jalr
lui_test.mem                   lui
srai_test.mem                  shifts aritmeticos
```

## Backend opcional

El backend sirve para correr simulaciones desde una API.

```bash
cd backend
npm install
npm run start:dev
```

Las corridas generadas se guardan en `backend/runs/`.

## Frontend opcional

El frontend sirve para usar el simulador desde el navegador.

```bash
cd frontend
npm install
npm run dev
```

Luego abre:

```text
http://localhost:3000
```
