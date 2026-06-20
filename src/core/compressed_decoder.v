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
  wire [6:0] clsw_imm;
  wire [7:0] lwsp_imm;
  wire [7:0] swsp_imm;
  wire [12:0] cb_imm;
  wire [11:0] cj_imm12;
  wire [20:0] cj_imm;

  assign funct3 = instr16[15:13];
  assign quadrant = instr16[1:0];
  assign rd_rs1 = instr16[11:7];
  assign rs2 = instr16[6:2];
  assign rd_rs1_p = {2'b01, instr16[9:7]};
  assign rs2_p = {2'b01, instr16[4:2]};
  assign addi_imm = {instr16[12], instr16[6:2]};
  assign shamt = {instr16[12], instr16[6:2]};
  assign lui_imm = {instr16[12], instr16[6:2]};
  assign clsw_imm = {instr16[5], instr16[12:10], instr16[6], 2'b00};
  assign lwsp_imm = {instr16[3:2], instr16[12], instr16[6:4], 2'b00};
  assign swsp_imm = {instr16[8:7], instr16[12:9], 2'b00};
  assign cb_imm = {{4{instr16[12]}}, instr16[12], instr16[6:5], instr16[2], instr16[11:10], instr16[4:3], 1'b0};
  assign cj_imm12 = {instr16[12], instr16[8], instr16[10:9], instr16[6], instr16[7], instr16[2], instr16[11], instr16[5:3], 1'b0};
  assign cj_imm = {{9{cj_imm12[11]}}, cj_imm12};

  assign instr32 = instr32_reg;
  assign illegal = illegal_reg;

  always @* begin
    instr32_reg = 32'h00000013; // nop
    illegal_reg = 1'b0;

    case ({funct3, quadrant})
      5'b010_00: begin // c.lw -> lw rd', offset(rs1')
        instr32_reg = {5'b00000, clsw_imm, rd_rs1_p, 3'b010, rs2_p, 7'b0000011};
      end

      5'b110_00: begin // c.sw -> sw rs2', offset(rs1')
        instr32_reg = {5'b00000, clsw_imm[6:5], rs2_p, rd_rs1_p, 3'b010, clsw_imm[4:0], 7'b0100011};
      end

      5'b000_01: begin // c.addi -> addi rd, rd, imm
        instr32_reg = {{6{addi_imm[5]}}, addi_imm, rd_rs1, 3'b000, rd_rs1, 7'b0010011};
      end

      5'b001_01: begin // c.jal -> jal x1, offset
        instr32_reg = {cj_imm[20], cj_imm[10:1], cj_imm[11], cj_imm[19:12], 5'd1, 7'b1101111};
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

      5'b101_01: begin // c.j -> jal x0, offset
        instr32_reg = {cj_imm[20], cj_imm[10:1], cj_imm[11], cj_imm[19:12], 5'd0, 7'b1101111};
      end

      5'b110_01: begin // c.beqz -> beq rs1', x0, offset
        instr32_reg = {cb_imm[12], cb_imm[10:5], 5'd0, rd_rs1_p, 3'b000, cb_imm[4:1], cb_imm[11], 7'b1100011};
      end

      5'b111_01: begin // c.bnez -> bne rs1', x0, offset
        instr32_reg = {cb_imm[12], cb_imm[10:5], 5'd0, rd_rs1_p, 3'b001, cb_imm[4:1], cb_imm[11], 7'b1100011};
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

          2'b10: begin // c.andi -> andi rd', rd', imm
            instr32_reg = {{6{addi_imm[5]}}, addi_imm, rd_rs1_p, 3'b111, rd_rs1_p, 7'b0010011};
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
        if (!instr16[12] && (rd_rs1 != 5'b0) && (rs2 == 5'b0)) begin
          instr32_reg = {12'b0, rd_rs1, 3'b000, 5'd0, 7'b1100111}; // c.jr -> jalr x0, 0(rs1)
        end else if (instr16[12] && (rd_rs1 != 5'b0) && (rs2 == 5'b0)) begin
          instr32_reg = {12'b0, rd_rs1, 3'b000, 5'd1, 7'b1100111}; // c.jalr -> jalr x1, 0(rs1)
        end else if (instr16[12] && (rd_rs1 != 5'b0) && (rs2 != 5'b0)) begin
          instr32_reg = {7'b0000000, rs2, rd_rs1, 3'b000, rd_rs1, 7'b0110011}; // c.add -> add rd, rd, rs2
        end else begin
          illegal_reg = 1'b1;
        end
      end

      5'b010_10: begin // c.lwsp -> lw rd, offset(x2)
        if (rd_rs1 != 5'b0) begin
          instr32_reg = {4'b0000, lwsp_imm, 5'd2, 3'b010, rd_rs1, 7'b0000011};
        end else begin
          illegal_reg = 1'b1;
        end
      end

      5'b110_10: begin // c.swsp -> sw rs2, offset(x2)
        instr32_reg = {4'b0000, swsp_imm[7:5], rs2, 5'd2, 3'b010, swsp_imm[4:0], 7'b0100011};
      end

      default: begin
        illegal_reg = 1'b1;
      end
    endcase
  end

endmodule
