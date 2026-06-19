#!/usr/bin/env bash
set -euo pipefail

BUILD_DIR="build"
SIM_OUT="$BUILD_DIR/riscv_nohazard_sim"
VCD_OUT="$BUILD_DIR/riscv_nohazard.vcd"
MEMFILE="${1:-mem/forwarding_test.mem}"

if [ ! -f "$MEMFILE" ]; then
  echo "Error: memory file not found: $MEMFILE"
  exit 1
fi

mkdir -p "$BUILD_DIR"

echo "Compiling pipeline without Hazard Unit..."
iverilog -g2012 -o "$SIM_OUT" \
  tb/testbench_nohazard.v \
  src/core/top_nohazard.v src/core/riscvpipeline_nohazard.v \
  src/core/controller.v src/core/maindec.v src/core/aludec.v \
  src/core/extend.v src/core/compressed_decoder.v \
  src/components/regfile.v src/components/alu.v src/components/mux2.v \
  src/components/mux3.v src/components/flopr.v src/components/adder.v \
  src/mem/imem.v src/mem/dmem.v

echo "Running no-hazard simulation with MEMFILE=$MEMFILE"
(
  cd "$BUILD_DIR"
  vvp "./riscv_nohazard_sim" "+MEMFILE=../$MEMFILE"
)

echo "VCD generated: $VCD_OUT"
