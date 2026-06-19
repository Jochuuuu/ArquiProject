module riscvpipeline(input  clk, reset,
                     output [31:0] PCF,
                     input  [31:0] RawInstrF,
                     input  [31:0] InstrF,
                     input         IsCompressedF,
                     output reg    MemWriteM,
                     output reg [31:0] ALUResultM, WriteDataM,
                     input  [31:0] ReadDataM);

  reg        RegWriteW;
  reg [4:0]  RdW;
  wire [31:0] ResultW;

  // Fetch stage
  wire [31:0] PCNextF, PCPlus4F;
  wire        StallF, StallD, FlushD, FlushE;

  flopr #(32) pcreg(
    .clk(clk),
    .reset(reset),
    .d(StallF ? PCF : PCNextF),
    .q(PCF)
  );

  assign PCPlus4F = PCF + (IsCompressedF ? 32'd2 : 32'd4);

  // Decode stage
  reg [31:0] InstrD, PCD, PCPlus4D;
  wire [6:0] opD;
  wire [2:0] funct3D;
  wire       funct7b5D;
  wire [4:0] Rs1D, Rs2D, RdD;
  wire [31:0] RD1D, RD2D, RD1RawD, RD2RawD, ImmExtD;
  wire [1:0] ResultSrcD;
  wire [2:0] ImmSrcD;
  wire       MemWriteD, PCSrcE, ALUSrcD, RegWriteD, JumpD;
  wire [3:0] ALUControlD;

  always @(posedge clk or posedge reset) begin
    if (reset || FlushD) begin
      InstrD   <= 32'h00000013;
      PCD      <= 32'b0;
      PCPlus4D <= 32'b0;
    end else if (!StallD) begin
      InstrD   <= InstrF;
      PCD      <= PCF;
      PCPlus4D <= PCPlus4F;
    end
  end

  assign opD      = InstrD[6:0];
  assign funct3D  = InstrD[14:12];
  assign funct7b5D = InstrD[30];
  assign Rs1D     = InstrD[19:15];
  assign Rs2D     = InstrD[24:20];
  assign RdD      = InstrD[11:7];

  controller c(
    .op(opD),
    .funct3(funct3D),
    .funct7b5(funct7b5D),
    .Zero(1'b0),
    .ResultSrc(ResultSrcD),
    .MemWrite(MemWriteD),
    .PCSrc(),
    .ALUSrc(ALUSrcD),
    .RegWrite(RegWriteD),
    .Jump(JumpD),
    .ImmSrc(ImmSrcD),
    .ALUControl(ALUControlD)
  );

  regfile rf(
    .clk(clk),
    .we3(RegWriteW),
    .a1(Rs1D),
    .a2(Rs2D),
    .a3(RdW),
    .wd3(ResultW),
    .rd1(RD1RawD),
    .rd2(RD2RawD)
  );

  assign RD1D = ((Rs1D != 5'b0) && (Rs1D == RdW) && RegWriteW) ? ResultW : RD1RawD;
  assign RD2D = ((Rs2D != 5'b0) && (Rs2D == RdW) && RegWriteW) ? ResultW : RD2RawD;

  extend ext(
    .instr(InstrD[31:7]),
    .immsrc(ImmSrcD),
    .immext(ImmExtD)
  );

  // Execute stage
  reg [1:0]  ResultSrcE;
  reg [2:0]  ImmSrcE;
  reg        MemWriteE, ALUSrcE, RegWriteE, JumpE, JalrE, BranchE;
  reg [3:0]  ALUControlE;
  reg [2:0]  funct3E;
  reg [31:0] InstrE, RD1E, RD2E, PCE, Rs1EData, Rs2EData, ImmExtE, PCPlus4E;
  reg [4:0]  Rs1E, Rs2E, RdE;
  wire [31:0] SrcAE, SrcBE, WriteDataE, ALUResultE, PCTargetE, PCTargetJalrE, PCJumpTargetE;
  wire        ZeroE, EqualE, LessThanE, BranchTakenE;
  wire [1:0]  ForwardAE, ForwardBE;

  always @(posedge clk or posedge reset) begin
    if (reset || FlushE) begin
      ResultSrcE <= 2'b0;
      ImmSrcE    <= 3'b0;
      MemWriteE  <= 1'b0;
      ALUSrcE    <= 1'b0;
      RegWriteE  <= 1'b0;
      JumpE      <= 1'b0;
      JalrE      <= 1'b0;
      BranchE    <= 1'b0;
      ALUControlE <= 4'b0;
      funct3E    <= 3'b0;
      InstrE      <= 32'h00000013;
      RD1E       <= 32'b0;
      RD2E       <= 32'b0;
      PCE        <= 32'b0;
      ImmExtE    <= 32'b0;
      PCPlus4E   <= 32'b0;
      Rs1E       <= 5'b0;
      Rs2E       <= 5'b0;
      RdE        <= 5'b0;
    end else begin
      ResultSrcE <= ResultSrcD;
      ImmSrcE    <= ImmSrcD;
      MemWriteE  <= MemWriteD;
      ALUSrcE    <= ALUSrcD;
      RegWriteE  <= RegWriteD;
      JumpE      <= JumpD;
      JalrE      <= (opD == 7'b1100111);
      BranchE    <= (opD == 7'b1100011);
      ALUControlE <= ALUControlD;
      funct3E    <= funct3D;
      InstrE      <= InstrD;
      RD1E       <= RD1D;
      RD2E       <= RD2D;
      PCE        <= PCD;
      ImmExtE    <= ImmExtD;
      PCPlus4E   <= PCPlus4D;
      Rs1E       <= Rs1D;
      Rs2E       <= Rs2D;
      RdE        <= RdD;
    end
  end

  mux3 #(32) forwardamux(
    .d0(RD1E),
    .d1(ResultW),
    .d2(ALUResultM),
    .s(ForwardAE),
    .y(SrcAE)
  );

  mux3 #(32) forwardbmux(
    .d0(RD2E),
    .d1(ResultW),
    .d2(ALUResultM),
    .s(ForwardBE),
    .y(WriteDataE)
  );

  mux2 #(32) srcbmux(
    .d0(WriteDataE),
    .d1(ImmExtE),
    .s(ALUSrcE),
    .y(SrcBE)
  );

  alu alu(
    .a(SrcAE),
    .b(SrcBE),
    .alucontrol(ALUControlE),
    .result(ALUResultE),
    .zero(ZeroE)
  );

  adder pcaddbranch(
    .a(PCE),
    .b(ImmExtE),
    .y(PCTargetE)
  );

  assign PCTargetJalrE = (SrcAE + ImmExtE) & 32'hfffffffe;
  assign PCJumpTargetE = JalrE ? PCTargetJalrE : PCTargetE;

  assign EqualE = (SrcAE == WriteDataE);
  assign LessThanE = ($signed(SrcAE) < $signed(WriteDataE));

  assign BranchTakenE = (funct3E == 3'b000) ? EqualE :       // beq
                        (funct3E == 3'b001) ? ~EqualE :      // bne
                        (funct3E == 3'b100) ? LessThanE :    // blt
                        (funct3E == 3'b101) ? ~LessThanE :   // bge
                        1'b0;

  assign PCSrcE = (BranchE & BranchTakenE) | JumpE;

  mux2 #(32) pcmux(
    .d0(PCPlus4F),
    .d1(PCJumpTargetE),
    .s(PCSrcE),
    .y(PCNextF)
  );

  // Memory stage
  reg [1:0]  ResultSrcM;
  reg        RegWriteM;
  reg [31:0] InstrM, PCPlus4M;
  reg [4:0]  RdM;

  always @(posedge clk or posedge reset) begin
    if (reset) begin
      ResultSrcM <= 2'b0;
      MemWriteM  <= 1'b0;
      RegWriteM  <= 1'b0;
      ALUResultM <= 32'b0;
      WriteDataM <= 32'b0;
      InstrM     <= 32'h00000013;
      PCPlus4M   <= 32'b0;
      RdM        <= 5'b0;
    end else begin
      ResultSrcM <= ResultSrcE;
      MemWriteM  <= MemWriteE;
      RegWriteM  <= RegWriteE;
      ALUResultM <= ALUResultE;
      WriteDataM <= WriteDataE;
      InstrM     <= InstrE;
      PCPlus4M   <= PCPlus4E;
      RdM        <= RdE;
    end
  end

  // Writeback stage
  reg [1:0]  ResultSrcW;
  reg [31:0] InstrW, ALUResultW, ReadDataW, PCPlus4W;

  always @(posedge clk or posedge reset) begin
    if (reset) begin
      ResultSrcW <= 2'b0;
      RegWriteW  <= 1'b0;
      InstrW     <= 32'h00000013;
      ALUResultW <= 32'b0;
      ReadDataW  <= 32'b0;
      PCPlus4W   <= 32'b0;
      RdW        <= 5'b0;
    end else begin
      ResultSrcW <= ResultSrcM;
      RegWriteW  <= RegWriteM;
      InstrW     <= InstrM;
      ALUResultW <= ALUResultM;
      ReadDataW  <= ReadDataM;
      PCPlus4W   <= PCPlus4M;
      RdW        <= RdM;
    end
  end

  mux3 #(32) resultmux(
    .d0(ALUResultW),
    .d1(ReadDataW),
    .d2(PCPlus4W),
    .s(ResultSrcW),
    .y(ResultW)
  );

  // Hazard unit
  assign ForwardAE = ((Rs1E != 5'b0) && (Rs1E == RdM) && RegWriteM) ? 2'b10 :
                     ((Rs1E != 5'b0) && (Rs1E == RdW) && RegWriteW) ? 2'b01 :
                     2'b00;

  assign ForwardBE = ((Rs2E != 5'b0) && (Rs2E == RdM) && RegWriteM) ? 2'b10 :
                     ((Rs2E != 5'b0) && (Rs2E == RdW) && RegWriteW) ? 2'b01 :
                     2'b00;

  assign StallD = ResultSrcE[0] && ((Rs1D == RdE) || (Rs2D == RdE));
  assign StallF = StallD;
  assign FlushD = PCSrcE;
  assign FlushE = StallD | PCSrcE;

endmodule
