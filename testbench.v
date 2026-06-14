module testbench;
  reg          clk;
  reg          reset;
  wire [31:0]  WriteData;
  wire [31:0]  DataAdr;
  wire         MemWrite;

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
    reset = 1; # 22;
    reset = 0;
  end

  // generate clock to sequence tests
  always begin
    clk = 1;
    # 5; clk = 0; # 5;
  end

  // check results
  always @(negedge clk) begin
    if(MemWrite) begin
      if(DataAdr === 100 & WriteData === 25) begin
        $display("Simulation succeeded");
        $display("Final store: mem[%0d] <= %0d", DataAdr, WriteData);
        #20;
        $display("Registers:");
        $display("x2  = %0d", dut.rvsingle.rf.rf[2]);
        $display("x3  = %0d", dut.rvsingle.rf.rf[3]);
        $display("x4  = %0d", dut.rvsingle.rf.rf[4]);
        $display("x5  = %0d", dut.rvsingle.rf.rf[5]);
        $display("x7  = %0d", dut.rvsingle.rf.rf[7]);
        $display("x9  = %0d", dut.rvsingle.rf.rf[9]);
        $display("Memory:");
        $display("mem[96]  = %0d", dut.dmem.RAM[24]);
        $display("mem[100] = %0d", dut.dmem.RAM[25]);
        $finish;
      end else if (DataAdr !== 96) begin
        $display("Simulation failed");
        $finish;
      end
    end
  end
endmodule
