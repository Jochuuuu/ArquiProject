module imem(input  [31:0] a,
            output [31:0] rd);
  
  reg [31:0] RAM[0:63]; 

  initial begin
      $readmemh("riscvtest.txt",RAM); 
  end

  assign rd = RAM[a[31:2]]; // word aligned
endmodule
