module compressed_decoder(input  [15:0] instr16,
                          output [31:0] instr32,
                          output        illegal);

  reg [31:0] instr32_reg;
  reg        illegal_reg;

  wire [2:0] funct3;
  wire [1:0] quadrant;
  wire [4:0] rd_rs1;
  wire [4:0] rs2;
  wire [4:0] rd_rs1_p;
  wire [4:0] rs2_p;
  wire [5:0] addi_imm;
  wire [5:0] shamt;
  wire [5:0] lui_imm;

  assign funct3 = instr16[15:13];
  assign quadrant = instr16[1:0];
  assign rd_rs1 = instr16[11:7];
  assign rs2 = instr16[6:2];
  assign rd_rs1_p = {2'b01, instr16[9:7]};
  assign rs2_p = {2'b01, instr16[4:2]};
  assign addi_imm = {instr16[12], instr16[6:2]};
  assign shamt = {instr16[12], instr16[6:2]};
  assign lui_imm = {instr16[12], instr16[6:2]};

  assign instr32 = instr32_reg;
  assign illegal = illegal_reg;

  always @* begin
    instr32_reg = 32'h00000013; // nop
    illegal_reg = 1'b0;

    case ({funct3, quadrant})
      5'b000_01: begin // c.addi -> addi rd, rd, imm
        instr32_reg = {{6{addi_imm[5]}}, addi_imm, rd_rs1, 3'b000, rd_rs1, 7'b0010011};
      end

      5'b000_10: begin // c.slli -> slli rd, rd, shamt
        if (!instr16[12] && (rd_rs1 != 5'b0)) begin
          instr32_reg = {7'b0000000, shamt[4:0], rd_rs1, 3'b001, rd_rs1, 7'b0010011};
        end else begin
          illegal_reg = 1'b1;
        end
      end

      5'b011_01: begin // c.lui -> lui rd, imm
        if ((rd_rs1 != 5'b0) && (rd_rs1 != 5'd2) && (lui_imm != 6'b0)) begin
          instr32_reg = {{14{lui_imm[5]}}, lui_imm, rd_rs1, 7'b0110111};
        end else begin
          illegal_reg = 1'b1;
        end
      end

      5'b100_01: begin
        case (instr16[11:10])
          2'b00: begin // c.srli -> srli rd', rd', shamt
            if (!instr16[12]) begin
              instr32_reg = {7'b0000000, shamt[4:0], rd_rs1_p, 3'b101, rd_rs1_p, 7'b0010011};
            end else begin
              illegal_reg = 1'b1;
            end
          end

          2'b01: begin // c.srai -> srai rd', rd', shamt
            if (!instr16[12]) begin
              instr32_reg = {7'b0100000, shamt[4:0], rd_rs1_p, 3'b101, rd_rs1_p, 7'b0010011};
            end else begin
              illegal_reg = 1'b1;
            end
          end

          2'b11: begin
            if (instr16[12] == 1'b0) begin
              case (instr16[6:5])
                2'b00: instr32_reg = {7'b0100000, rs2_p, rd_rs1_p, 3'b000, rd_rs1_p, 7'b0110011}; // c.sub
                2'b01: instr32_reg = {7'b0000000, rs2_p, rd_rs1_p, 3'b100, rd_rs1_p, 7'b0110011}; // c.xor
                2'b10: instr32_reg = {7'b0000000, rs2_p, rd_rs1_p, 3'b110, rd_rs1_p, 7'b0110011}; // c.or
                2'b11: instr32_reg = {7'b0000000, rs2_p, rd_rs1_p, 3'b111, rd_rs1_p, 7'b0110011}; // c.and
              endcase
            end else begin
              illegal_reg = 1'b1;
            end
          end

          default: begin
            illegal_reg = 1'b1;
          end
        endcase
      end

      5'b100_10: begin
        if (instr16[12] && (rd_rs1 != 5'b0) && (rs2 != 5'b0)) begin
          instr32_reg = {7'b0000000, rs2, rd_rs1, 3'b000, rd_rs1, 7'b0110011}; // c.add -> add rd, rd, rs2
        end else begin
          illegal_reg = 1'b1;
        end
      end

      default: begin
        illegal_reg = 1'b1;
      end
    endcase
  end

endmodule
