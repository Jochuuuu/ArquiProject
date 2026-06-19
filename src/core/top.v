module top(input  clk, reset, 
           output [31:0] WriteData, DataAdr, 
           output MemWrite);
  
  wire [31:0] PC, Instr, RawInstr, ReadData;
  wire        IsCompressed; 
  
  // instantiate processor and memories
  riscvpipeline rvcore(
    .clk(clk), 
    .reset(reset), 
    .PCF(PC), 
    .RawInstrF(RawInstr),
    .InstrF(Instr), 
    .IsCompressedF(IsCompressed),
    .MemWriteM(MemWrite), 
    .ALUResultM(DataAdr), 
    .WriteDataM(WriteData), 
    .ReadDataM(ReadData)
  ); 

  imem imem(
    .a(PC), 
    .rd(Instr),
    .rawrd(RawInstr),
    .iscompressed(IsCompressed)
  ); 

  dmem dmem(
    .clk(clk), 
    .we(MemWrite), 
    .a(DataAdr), 
    .wd(WriteData), 
    .rd(ReadData)
  ); 
endmodule
