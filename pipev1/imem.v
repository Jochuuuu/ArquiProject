module imem(input  [31:0] a,
            output [31:0] rd);
  
  reg [31:0] RAM[0:63]; 
  reg [255:0] memfile;

  initial begin
      if (!$value$plusargs("MEMFILE=%s", memfile))
        memfile = "riscvtest.txt";
      $display("Loading instruction memory from %0s", memfile);
      $readmemh(memfile, RAM);
  end

  assign rd = RAM[a[31:2]]; // word aligned
endmodule
