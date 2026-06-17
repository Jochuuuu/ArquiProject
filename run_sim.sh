#!/usr/bin/env bash
set -euo pipefail

SIM_OUT="riscv_pipe_sim"
VCD_OUT="riscv_pipe.vcd"
MEMFILE=""
OPEN_VCD="0"

if [ -f "sim.conf" ]; then
  # shellcheck disable=SC1091
  source "sim.conf"
fi

if [ "${1:-}" != "" ]; then
  MEMFILE="$1"
fi

if [ "$MEMFILE" = "" ]; then
  echo "Error: MEMFILE is empty. Edit sim.conf or run: ./run_sim.sh mem/file.mem"
  exit 1
fi

if [ ! -f "$MEMFILE" ]; then
  echo "Error: memory file not found: $MEMFILE"
  exit 1
fi

echo "Compiling pipeline..."
iverilog -g2012 -o "$SIM_OUT" \
  testbench.v top.v riscvpipeline.v controller.v maindec.v aludec.v \
  regfile.v alu.v extend.v mux2.v mux3.v flopr.v adder.v imem.v dmem.v

echo "Running simulation with MEMFILE=$MEMFILE"
vvp "$SIM_OUT" "+MEMFILE=$MEMFILE"

echo "VCD generated: $VCD_OUT"

if [ "$OPEN_VCD" = "1" ]; then
  echo "Opening GTKWave..."
  gtkwave "$VCD_OUT"
fi
