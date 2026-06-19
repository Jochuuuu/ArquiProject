module imem(input  [31:0] a,
            output [31:0] rd,
            output [31:0] rawrd,
            output        iscompressed);
  
  // Instruction memory is halfword-addressed for future compressed support.
  // Capacity is unchanged from the old 64x32 memory:
  // 64 * 32 bits = 128 * 16 bits = 2048 bits.
  reg [15:0] RAM[0:127]; 
  reg [1023:0] memfile;
  wire [15:0] halfword0, halfword1;
  wire [31:0] expanded;
  wire        compressed_illegal;

  initial begin
      if (!$value$plusargs("MEMFILE=%s", memfile))
        memfile = "riscvtest.txt";
      $display("Loading halfword instruction memory from %0s", memfile);
      $readmemh(memfile, RAM);
  end

  assign halfword0 = RAM[a[31:1]];
  assign halfword1 = RAM[a[31:1] + 1];
  assign iscompressed = (halfword0[1:0] != 2'b11);

  // rawrd shows the instruction bits before expansion/normalization.
  assign rawrd = iscompressed ? {16'b0, halfword0} : {halfword1, halfword0};

  compressed_decoder cdec(
    .instr16(halfword0),
    .instr32(expanded),
    .illegal(compressed_illegal)
  );

  // 32-bit instructions have low bits 2'b11 and are assembled from two
  // consecutive halfwords. Compressed instructions are expanded to their
  // 32-bit equivalents when supported; unsupported ones become NOPs.
  assign rd = iscompressed ? expanded : {halfword1, halfword0};
endmodule
