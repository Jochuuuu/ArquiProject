module testbench;
  reg          clk;
  reg          reset;
  wire [31:0]  WriteData;
  wire [31:0]  DataAdr;
  wire         MemWrite;
  reg          done;
  integer      cycle;
  integer      max_cycles;
  reg [31:0]   last_pc;

  // instantiate device to be tested
  top dut(
    .clk(clk),
    .reset(reset),
    .WriteData(WriteData),
    .DataAdr(DataAdr),
    .MemWrite(MemWrite)
  );

  // Generate waveform file for GTKWave or other VCD viewers.
  initial begin
    if (!$test$plusargs("NO_VCD")) begin
      $dumpfile("riscv_pipe.vcd");
      if ($test$plusargs("FULL_VCD")) begin
        $dumpvars(0, testbench);
      end else begin
        // Compact VCD: pipeline, ALU, memory, and register values.
        $dumpvars(0, clk);
        $dumpvars(0, reset);

        // Pipeline instruction flow.
        $dumpvars(0, dut.rvcore.PCF);
        $dumpvars(0, dut.rvcore.RawInstrF);
        $dumpvars(0, dut.rvcore.IsCompressedF);
        $dumpvars(0, dut.rvcore.InstrF);
        $dumpvars(0, dut.rvcore.InstrD);
        $dumpvars(0, dut.rvcore.InstrE);
        $dumpvars(0, dut.rvcore.InstrM);
        $dumpvars(0, dut.rvcore.InstrW);

        // Hazard unit: load-use stalls, flushes, and forwarding decisions.
        $dumpvars(0, dut.rvcore.Rs1D);
        $dumpvars(0, dut.rvcore.Rs2D);
        $dumpvars(0, dut.rvcore.RdE);
        $dumpvars(0, dut.rvcore.Rs1E);
        $dumpvars(0, dut.rvcore.Rs2E);
        $dumpvars(0, dut.rvcore.ResultSrcE);
        $dumpvars(0, dut.rvcore.StallF);
        $dumpvars(0, dut.rvcore.StallD);
        $dumpvars(0, dut.rvcore.FlushD);
        $dumpvars(0, dut.rvcore.FlushE);
        $dumpvars(0, dut.rvcore.ForwardAE);
        $dumpvars(0, dut.rvcore.ForwardBE);

        // Execute stage: values entering the ALU and the ALU result.
        $dumpvars(0, dut.rvcore.SrcAE);
        $dumpvars(0, dut.rvcore.SrcBE);
        $dumpvars(0, dut.rvcore.ImmExtE);
        $dumpvars(0, dut.rvcore.ALUControlE);
        $dumpvars(0, dut.rvcore.ALUResultE);
        $dumpvars(0, dut.rvcore.WriteDataE);

        // Memory stage: address/data used by lw and sw.
        $dumpvars(0, dut.rvcore.ALUResultM);
        $dumpvars(0, dut.rvcore.WriteDataM);
        $dumpvars(0, dut.rvcore.MemWriteM);
        $dumpvars(0, DataAdr);
        $dumpvars(0, WriteData);
        $dumpvars(0, MemWrite);

        // Writeback stage: value written back to the register file.
        $dumpvars(0, dut.rvcore.ResultW);
        $dumpvars(0, dut.rvcore.RegWriteW);
        $dumpvars(0, dut.rvcore.RdW);
        $dumpvars(0, dut.rvcore.ReadDataW);

        $dumpvars(0, dut.rvcore.rf.rf[1]);
        $dumpvars(0, dut.rvcore.rf.rf[2]);
        $dumpvars(0, dut.rvcore.rf.rf[3]);
        $dumpvars(0, dut.rvcore.rf.rf[4]);
        $dumpvars(0, dut.rvcore.rf.rf[5]);
        $dumpvars(0, dut.rvcore.rf.rf[6]);
        $dumpvars(0, dut.rvcore.rf.rf[7]);
        $dumpvars(0, dut.rvcore.rf.rf[8]);
        $dumpvars(0, dut.rvcore.rf.rf[9]);
        $dumpvars(0, dut.rvcore.rf.rf[10]);
        $dumpvars(0, dut.rvcore.rf.rf[11]);
      end
    end
  end

  // initialize test
  initial begin
    done = 0;
    cycle = 0;
    last_pc = 32'h0;
    max_cycles = 5000;
    if (!$value$plusargs("MAX_CYCLES=%d", max_cycles))
      max_cycles = 5000;
    reset = 1; # 22;
    reset = 0;
  end

  task print_state;
    integer i;
    begin
      $display("--- PC ---");
      $display("PC (halt instr) = 0x%08h", last_pc - 4);
      $display("PC (fetch now)  = 0x%08h", last_pc);
      $display("--- Registers ---");
      $display("x0  (zero) = %0d", $signed(dut.rvcore.rf.rf[0]));
      $display("x1  (ra)   = %0d", $signed(dut.rvcore.rf.rf[1]));
      $display("x2  (sp)   = %0d", $signed(dut.rvcore.rf.rf[2]));
      $display("x3  (gp)   = %0d", $signed(dut.rvcore.rf.rf[3]));
      $display("x4  (tp)   = %0d", $signed(dut.rvcore.rf.rf[4]));
      $display("x5  (t0)   = %0d", $signed(dut.rvcore.rf.rf[5]));
      $display("x6  (t1)   = %0d", $signed(dut.rvcore.rf.rf[6]));
      $display("x7  (t2)   = %0d", $signed(dut.rvcore.rf.rf[7]));
      $display("x8  (s0)   = %0d", $signed(dut.rvcore.rf.rf[8]));
      $display("x9  (s1)   = %0d", $signed(dut.rvcore.rf.rf[9]));
      $display("x10 (a0)   = %0d", $signed(dut.rvcore.rf.rf[10]));
      $display("x11 (a1)   = %0d", $signed(dut.rvcore.rf.rf[11]));
      $display("x12 (a2)   = %0d", $signed(dut.rvcore.rf.rf[12]));
      $display("x13 (a3)   = %0d", $signed(dut.rvcore.rf.rf[13]));
      $display("x14 (a4)   = %0d", $signed(dut.rvcore.rf.rf[14]));
      $display("x15 (a5)   = %0d", $signed(dut.rvcore.rf.rf[15]));
      $display("--- DMEM (words no-cero) ---");
      for (i = 0; i < 64; i = i + 1) begin
        if (dut.dmem.RAM[i] !== 32'h0 && ^dut.dmem.RAM[i] !== 1'bx)
          $display("  mem[%3d] (word %2d) = %0d", i*4, i, $signed(dut.dmem.RAM[i]));
      end
    end
  endtask

  initial begin
    wait(reset == 0);
    repeat(max_cycles + 10) @(negedge clk);
    if (!done) begin
      $display("Simulation ended: timeout at cycle %0d", cycle);
      print_state();
      $finish;
    end
  end

  // generate clock to sequence tests
  always begin
    clk = 1;
    # 5; clk = 0; # 5;
  end

  // check results
  always @(negedge clk) begin
    if (!reset) begin
      if (^dut.rvcore.PCF !== 1'bx) last_pc = dut.rvcore.PCF;
        cycle = cycle + 1;
      if ($test$plusargs("TRACE")) begin
        $display("TRACE cycle=%0d pc=%h rawInstrF=%h instrF=%h instrD=%h instrE=%h instrM=%h instrW=%h stallF=%b stallD=%b flushD=%b flushE=%b forwardAE=%b forwardBE=%b rdW=%0d regWriteW=%b resultW=%h memWrite=%b dataAdr=%h writeData=%h",
          cycle,
          dut.rvcore.PCF,
          dut.rvcore.RawInstrF,
          dut.rvcore.InstrF,
          dut.rvcore.InstrD,
          dut.rvcore.InstrE,
          dut.rvcore.InstrM,
          dut.rvcore.InstrW,
          dut.rvcore.StallF,
          dut.rvcore.StallD,
          dut.rvcore.FlushD,
          dut.rvcore.FlushE,
          dut.rvcore.ForwardAE,
          dut.rvcore.ForwardBE,
          dut.rvcore.RdW,
          dut.rvcore.RegWriteW,
          dut.rvcore.ResultW,
          MemWrite,
          DataAdr,
          WriteData
        );
      end
    end

    if(MemWrite) begin
      $display("Store: mem[%0d] <= %0d", DataAdr, $signed(WriteData));
    end

    // halt: beq x0,x0,0 completado en writeback
    if (!reset && cycle > 5) begin
      if (dut.rvcore.InstrW === 32'h00000063) begin
        done = 1;
        $display("Simulation finished (halt detected) at cycle %0d", cycle);
        #20;
        print_state();
        $finish;
      end
    end
  end
endmodule
