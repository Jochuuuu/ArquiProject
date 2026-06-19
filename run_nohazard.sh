#!/usr/bin/env bash
set -euo pipefail

SIM_OUT="riscv_nohazard_sim"
MEMFILE="${1:-mem/forwarding_test.mem}"

if [ ! -f "$MEMFILE" ]; then
  echo "Error: memory file not found: $MEMFILE"
  exit 1
fi

echo "Compiling pipeline without Hazard Unit..."
iverilog -g2012 -o "$SIM_OUT" \
  testbench_nohazard.v top_nohazard.v riscvpipeline_nohazard.v \
  controller.v maindec.v aludec.v regfile.v alu.v extend.v \
  mux2.v mux3.v flopr.v adder.v imem.v dmem.v

echo "Running no-hazard simulation with MEMFILE=$MEMFILE"
vvp "$SIM_OUT" "+MEMFILE=$MEMFILE"

echo "VCD generated: riscv_nohazard.vcd"
