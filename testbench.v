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
    $dumpvars(0, testbench);
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
      $display("x1  = %0d", $signed(dut.rvsingle.rf.rf[1]));
      $display("x2  = %0d", $signed(dut.rvsingle.rf.rf[2]));
      $display("x3  = %0d", $signed(dut.rvsingle.rf.rf[3]));
      $display("x4  = %0d", $signed(dut.rvsingle.rf.rf[4]));
      $display("x5  = %0d", $signed(dut.rvsingle.rf.rf[5]));
      $display("x7  = %0d", $signed(dut.rvsingle.rf.rf[7]));
      $display("x9  = %0d", $signed(dut.rvsingle.rf.rf[9]));
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
