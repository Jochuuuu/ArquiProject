#!/usr/bin/env bash
set -euo pipefail

BUILD_DIR="build"
SIM_OUT="$BUILD_DIR/riscv_pipe_sim"
VCD_OUT="$BUILD_DIR/riscv_pipe.vcd"
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

mkdir -p "$BUILD_DIR"

echo "Compiling pipeline..."
iverilog -g2005 -o "$SIM_OUT" \
  tb/testbench.v \
  src/core/top.v src/core/riscvpipeline.v src/core/controller.v \
  src/core/maindec.v src/core/aludec.v src/core/extend.v \
  src/core/compressed_decoder.v \
  src/components/regfile.v src/components/alu.v src/components/mux2.v \
  src/components/mux3.v src/components/flopr.v src/components/adder.v \
  src/mem/imem.v src/mem/dmem.v

MAX_CYCLES="${MAX_CYCLES:-5000}"
echo "Running simulation with MEMFILE=$MEMFILE MAX_CYCLES=$MAX_CYCLES"
(cd "$BUILD_DIR" && vvp "./riscv_pipe_sim" "+MEMFILE=../$MEMFILE" "+MAX_CYCLES=$MAX_CYCLES")

echo "VCD generated: $VCD_OUT"

if [ "$OPEN_VCD" = "1" ]; then
  echo "Opening GTKWave..."
  gtkwave "$VCD_OUT"
fi
