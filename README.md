# Proyecto RISC-V Pipeline

Este proyecto implementa un procesador RISC-V pipelined en Verilog. Lo principal
de la entrega es correr las pruebas `.mem` con el simulador y verificar el
resultado final. El backend y el frontend son solo una ayuda visual adicional.

## Que contiene

- `src/`: codigo Verilog del procesador.
- `src/core/`: pipeline, control y decoder de instrucciones comprimidas.
- `src/mem/`: memoria de instrucciones y memoria de datos.
- `tb/`: testbench de simulacion.
- `mem/`: programas de prueba en formato `.mem`.
- `run_sim.sh`: script para compilar y correr una prueba.
- `sim.conf`: archivo para elegir una prueba por defecto.
- `backend/` y `frontend/`: interfaz opcional para visualizar mejor.

## Requisito principal

Para la parte Verilog necesitas Icarus Verilog:

```text
iverilog
vvp
```

## Como correr una prueba

Desde la raiz del proyecto, puedes correr una prueba pasando el archivo `.mem`
directamente:

```bash
./run_sim.sh mem/compressed_part1_test.mem
```

Para la parte 2:

```bash
./run_sim.sh mem/compressed_part2_test.mem
```

Si todo funciona, debe salir algo como:

```text
Simulation succeeded
Final store: mem[100] <= 25
```

## Alternativa: usar sim.conf

Tambien puedes cambiar el archivo que se corre desde `sim.conf`.

Ejemplo:

```bash
MEMFILE=mem/compressed_part1_test.mem
```

Luego corres:

```bash
./run_sim.sh
```

Si quieres probar otra memoria, cambias `MEMFILE`:

```bash
MEMFILE=mem/compressed_part2_test.mem
```

## Como funcionan los archivos .mem

Los `.mem` estan escritos por halfwords de 16 bits. Eso permite mezclar
instrucciones normales de 32 bits con instrucciones comprimidas de 16 bits.

Una instruccion normal de 32 bits ocupa dos lineas:

```text
0093  // low  de 00000093
0000  // high de 00000093
```

La parte `low` va primero y la parte `high` va despues. El procesador las une
asi:

```verilog
{halfword1, halfword0}
```

Una instruccion comprimida de 16 bits ocupa una sola linea:

```text
0095  // c.addi x1, 5
```

El procesador detecta si es de 16 o 32 bits revisando los bits bajos:

```verilog
assign iscompressed = (halfword0[1:0] != 2'b11);
```

Si es comprimida, se manda al `compressed_decoder.v` y se expande a una
instruccion equivalente de 32 bits. Si no es comprimida, se usa como instruccion
normal de 32 bits.

## Pruebas importantes

Parte 1, instrucciones logicas y aritmeticas comprimidas:

```bash
./run_sim.sh mem/compressed_part1_test.mem
```

Prueba:

```text
c.addi, c.add, c.sub, c.and, c.or, c.xor, c.slli, c.srli, c.srai, c.lui
```

Parte 2, memoria y control:

```bash
./run_sim.sh mem/compressed_part2_test.mem
```

Prueba:

```text
c.lw, c.sw, c.lwsp, c.swsp, c.beqz, c.bnez, c.j, c.jal, c.jr, c.jalr
```

## Backend y frontend opcional

Esto no es lo principal de la entrega. Sirve para ver y correr simulaciones de
forma mas comoda.

Backend:

```bash
cd backend
npm install
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

## Notas para Git

No subir carpetas generadas:

```text
node_modules/
dist/
.next/
build/
backend/runs/
```
