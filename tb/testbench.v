module testbench;
  reg          clk;
  reg          reset;
  wire [31:0]  WriteData;
  wire [31:0]  DataAdr;
  wire         MemWrite;
  reg          done;

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

  // initialize test
  initial begin
    done = 0;
    reset = 1; # 22;
    reset = 0;
  end

  task print_state;
    begin
      $display("Registers:");
      $display("x1  = %0d", $signed(dut.rvcore.rf.rf[1]));
      $display("x2  = %0d", $signed(dut.rvcore.rf.rf[2]));
      $display("x3  = %0d", $signed(dut.rvcore.rf.rf[3]));
      $display("x4  = %0d", $signed(dut.rvcore.rf.rf[4]));
      $display("x5  = %0d", $signed(dut.rvcore.rf.rf[5]));
      $display("x7  = %0d", $signed(dut.rvcore.rf.rf[7]));
            $display("x8  = %0d", $signed(dut.rvcore.rf.rf[8]));

      $display("x9  = %0d", $signed(dut.rvcore.rf.rf[9]));
      $display("Memory:");
      $display("mem[96]  = %0d", dut.dmem.RAM[24]);
      $display("mem[100] = %0d", dut.dmem.RAM[25]);
    end
  endtask

  initial begin
    #1000;
    if (!done) begin
      $display("Simulation ended: timeout/status dump");
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
    if(MemWrite) begin
      $display("Store: mem[%0d] <= %0d", DataAdr, $signed(WriteData));
      if(DataAdr === 100 & WriteData === 25) begin
        done = 1;
        $display("Simulation succeeded");
        $display("Final store: mem[%0d] <= %0d", DataAdr, WriteData);
        #20;
        print_state();
        $finish;
      end
    end
  end
endmodule
