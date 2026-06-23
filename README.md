# Proyecto RISC-V Pipeline

Este proyecto tiene un procesador RISC-V en Verilog, pruebas en memoria `.mem`,
un backend para correr simulaciones y un frontend para usarlo desde una interfaz web.

## Que contiene

- `src/`: codigo Verilog del procesador.
- `mem/`: programas de prueba en formato `.mem`.
- `tb/`: testbench de simulacion.
- `backend/`: API que compila y corre simulaciones.
- `frontend/`: interfaz web.
- `docs/`: apuntes e informe.

## Requisitos

Para correr todo necesitas:

- Node.js y npm.
- Icarus Verilog (`iverilog` y `vvp`).

No se sube `node_modules/`. En otra laptop se instala con `npm install`.

## Correr simulacion Verilog

Desde la raiz del proyecto:

```bash
./run_sim.sh mem/compressed_part1_test.mem
```

Para la parte 2:

```bash
./run_sim.sh mem/compressed_part2_test.mem
```

Si todo sale bien debe aparecer algo como:

```text
Simulation succeeded
Final store: mem[100] <= 25
```

## Correr backend

```bash
cd backend
npm install
npm run start:dev
```

El backend genera carpetas dentro de `backend/runs/`. Eso es normal y no se sube
al repo.

## Correr frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

## Notas

- No subir `node_modules/`, `dist/`, `.next/`, `build/` ni `backend/runs/`.
- Los archivos `.mem` mezclan instrucciones de 16 y 32 bits.
- Las instrucciones de 32 bits se guardan en dos lineas: primero `low`, luego
  `high`.
- Las instrucciones comprimidas de 16 bits usan una sola linea.
