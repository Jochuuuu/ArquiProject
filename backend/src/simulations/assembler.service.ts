import { BadRequestException, Injectable } from '@nestjs/common';

export interface AssembledInstruction {
  line: number;
  asm: string;
  hex: string;
  mem: string[];
}

export interface AssembleResult {
  mem: string;
  annotatedMem: string;
  instructions: AssembledInstruction[];
}

type ParsedInstruction = {
  line: number;
  asm: string;
  pc: number;
};

type RegisterInstruction = {
  opcode: number;
  funct3: number;
  funct7: number;
};

const R_INSTRUCTIONS: Record<string, RegisterInstruction> = {
  add: { opcode: 0x33, funct3: 0x0, funct7: 0x00 },
  sub: { opcode: 0x33, funct3: 0x0, funct7: 0x20 },
  slt: { opcode: 0x33, funct3: 0x2, funct7: 0x00 },
  or: { opcode: 0x33, funct3: 0x6, funct7: 0x00 },
  and: { opcode: 0x33, funct3: 0x7, funct7: 0x00 },
};

const REGISTER_ALIASES: Record<string, number> = {
  zero: 0,
  ra: 1,
  sp: 2,
  gp: 3,
  tp: 4,
  t0: 5,
  t1: 6,
  t2: 7,
  s0: 8,
  fp: 8,
  s1: 9,
  a0: 10,
  a1: 11,
  a2: 12,
  a3: 13,
  a4: 14,
  a5: 15,
  a6: 16,
  a7: 17,
  s2: 18,
  s3: 19,
  s4: 20,
  s5: 21,
  s6: 22,
  s7: 23,
  s8: 24,
  s9: 25,
  s10: 26,
  s11: 27,
  t3: 28,
  t4: 29,
  t5: 30,
  t6: 31,
};

@Injectable()
export class AssemblerService {
  assemble(source: string): AssembleResult {
    const parsed = this.parseSource(source);
    const instructions = parsed.instructions.map((instruction) =>
      this.assembleLine(instruction.asm, instruction.line, instruction.pc, parsed.labels),
    );

    if (instructions.length === 0) {
      throw new BadRequestException('asm cannot be empty');
    }

    return {
      mem: `${instructions.flatMap((instruction) => instruction.mem).join('\n')}\n`,
      annotatedMem: `${instructions.flatMap((instruction) => this.annotateInstruction(instruction)).join('\n')}\n`,
      instructions,
    };
  }

  private assembleLine(asm: string, line: number, pc = 0, labels = new Map<string, number>()): AssembledInstruction {
    const normalized = asm
      .replace(/,/g, ' ')
      .replace(/\(/g, ' ')
      .replace(/\)/g, ' ')
      .trim()
      .toLowerCase();
    const [mnemonic, ...args] = normalized.split(/\s+/);
    let word: number;

    if (mnemonic === 'nop') {
      word = this.encodeI(0x13, 0x0, 0, 0, 0);
    } else if (mnemonic.startsWith('c.')) {
      return this.assembleCompressed(mnemonic, args, asm, line, pc, labels);
    } else if (mnemonic === 'li') {
      this.expectArgCount(mnemonic, args, 2, line);
      word = this.encodeI(0x13, 0x0, this.reg(args[0], line), 0, this.imm(args[1], 12, line));
    } else if (mnemonic === 'mv') {
      this.expectArgCount(mnemonic, args, 2, line);
      word = this.encodeI(0x13, 0x0, this.reg(args[0], line), this.reg(args[1], line), 0);
    } else if (mnemonic in R_INSTRUCTIONS) {
      this.expectArgCount(mnemonic, args, 3, line);
      const instruction = R_INSTRUCTIONS[mnemonic];
      word = this.encodeR(
        instruction.opcode,
        instruction.funct3,
        instruction.funct7,
        this.reg(args[0], line),
        this.reg(args[1], line),
        this.reg(args[2], line),
      );
    } else if (mnemonic === 'addi') {
      this.expectArgCount(mnemonic, args, 3, line);
      word = this.encodeI(
        0x13,
        0x0,
        this.reg(args[0], line),
        this.reg(args[1], line),
        this.imm(args[2], 12, line),
      );
    } else if (mnemonic === 'lw') {
      this.expectArgCount(mnemonic, args, 3, line);
      word = this.encodeI(
        0x03,
        0x2,
        this.reg(args[0], line),
        this.reg(args[2], line),
        this.imm(args[1], 12, line),
      );
    } else if (mnemonic === 'jalr') {
      this.expectArgCount(mnemonic, args, 3, line);
      word = this.encodeI(
        0x67,
        0x0,
        this.reg(args[0], line),
        this.reg(args[2], line),
        this.imm(args[1], 12, line),
      );
    } else if (mnemonic === 'sw') {
      this.expectArgCount(mnemonic, args, 3, line);
      word = this.encodeS(
        0x23,
        0x2,
        this.reg(args[0], line),
        this.reg(args[2], line),
        this.imm(args[1], 12, line),
      );
    } else if (mnemonic === 'beq') {
      this.expectArgCount(mnemonic, args, 3, line);
      word = this.encodeB(
        0x63,
        0x0,
        this.reg(args[0], line),
        this.reg(args[1], line),
        this.branchTarget(args[2], 13, line, pc, labels),
      );
    } else if (mnemonic === 'bne') {
      this.expectArgCount(mnemonic, args, 3, line);
      word = this.encodeB(
        0x63,
        0x1,
        this.reg(args[0], line),
        this.reg(args[1], line),
        this.branchTarget(args[2], 13, line, pc, labels),
      );
    } else if (mnemonic === 'jal') {
      this.expectArgCount(mnemonic, args, 2, line);
      word = this.encodeJ(0x6f, this.reg(args[0], line), this.branchTarget(args[1], 21, line, pc, labels));
    } else if (mnemonic === 'j') {
      this.expectArgCount(mnemonic, args, 1, line);
      word = this.encodeJ(0x6f, 0, this.branchTarget(args[0], 21, line, pc, labels));
    } else {
      throw new BadRequestException(`line ${line}: unsupported instruction "${mnemonic}"`);
    }

    const hex = this.wordHex(word);
    return {
      line,
      asm,
      hex,
      mem: [hex.slice(4), hex.slice(0, 4)],
    };
  }

  private assembleCompressed(
    mnemonic: string,
    args: string[],
    asm: string,
    line: number,
    pc = 0,
    labels = new Map<string, number>(),
  ): AssembledInstruction {
    const halfword = this.encodeCompressed(mnemonic, args, line, pc, labels);
    const hex = this.halfwordHex(halfword);
    return {
      line,
      asm,
      hex,
      mem: [hex],
    };
  }

  private annotateInstruction(instruction: AssembledInstruction) {
    if (instruction.mem.length === 1) {
      return [
        `${instruction.mem[0]}  // ${instruction.asm.padEnd(24)} ; compressed 16-bit`,
      ];
    }

    return [
      `${instruction.mem[0]}  // low  de ${instruction.hex} ; ${instruction.asm}`,
      `${instruction.mem[1]}  // high de ${instruction.hex} ; ${instruction.asm}`,
    ];
  }

  private encodeCompressed(mnemonic: string, args: string[], line: number, pc = 0, labels = new Map<string, number>()) {
    switch (mnemonic) {
      case 'c.nop':
        this.expectArgCount(mnemonic, args, 0, line);
        return this.cAddi(0, 0);

      case 'c.addi':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cAddi(this.reg(args[0], line), this.imm(args[1], 6, line));

      case 'c.slli':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cSlli(this.reg(args[0], line), this.shamt(args[1], line));

      case 'c.lui':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cLui(this.reg(args[0], line), this.imm(args[1], 6, line), line);

      case 'c.add':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cAdd(this.reg(args[0], line), this.reg(args[1], line), line);

      case 'c.sub':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cAlu(this.reg(args[0], line), this.reg(args[1], line), 0b00, line);

      case 'c.xor':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cAlu(this.reg(args[0], line), this.reg(args[1], line), 0b01, line);

      case 'c.or':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cAlu(this.reg(args[0], line), this.reg(args[1], line), 0b10, line);

      case 'c.and':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cAlu(this.reg(args[0], line), this.reg(args[1], line), 0b11, line);

      case 'c.srli':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cShiftOrAndi(this.reg(args[0], line), this.shamt(args[1], line), 0b00, line);

      case 'c.srai':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cShiftOrAndi(this.reg(args[0], line), this.shamt(args[1], line), 0b01, line);

      case 'c.andi':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cShiftOrAndi(this.reg(args[0], line), this.imm(args[1], 6, line), 0b10, line);

      case 'c.lw':
        this.expectArgCount(mnemonic, args, 3, line);
        return this.cLoadStore(0b010, this.reg(args[0], line), this.reg(args[2], line), this.uimm(args[1], 7, line), line);

      case 'c.sw':
        this.expectArgCount(mnemonic, args, 3, line);
        return this.cLoadStore(0b110, this.reg(args[0], line), this.reg(args[2], line), this.uimm(args[1], 7, line), line);

      case 'c.lwsp':
        this.expectArgCount(mnemonic, args, 3, line);
        return this.cLwsp(this.reg(args[0], line), this.reg(args[2], line), this.uimm(args[1], 8, line), line);

      case 'c.swsp':
        this.expectArgCount(mnemonic, args, 3, line);
        return this.cSwsp(this.reg(args[0], line), this.reg(args[2], line), this.uimm(args[1], 8, line), line);

      case 'c.beqz':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cBranch(0b110, this.reg(args[0], line), this.branchTarget(args[1], 13, line, pc, labels), line);

      case 'c.bnez':
        this.expectArgCount(mnemonic, args, 2, line);
        return this.cBranch(0b111, this.reg(args[0], line), this.branchTarget(args[1], 13, line, pc, labels), line);

      case 'c.j':
        this.expectArgCount(mnemonic, args, 1, line);
        return this.cJump(0b101, this.branchTarget(args[0], 12, line, pc, labels));

      case 'c.jal':
        this.expectArgCount(mnemonic, args, 1, line);
        return this.cJump(0b001, this.branchTarget(args[0], 12, line, pc, labels));

      case 'c.jr':
        this.expectArgCount(mnemonic, args, 1, line);
        return this.cJrJalr(this.reg(args[0], line), false, line);

      case 'c.jalr':
        this.expectArgCount(mnemonic, args, 1, line);
        return this.cJrJalr(this.reg(args[0], line), true, line);

      default:
        throw new BadRequestException(`line ${line}: unsupported compressed instruction "${mnemonic}"`);
    }
  }

  private stripComment(line: string) {
    return line.replace(/\/\/.*$/, '').replace(/#.*$/, '').trim();
  }

  private parseSource(source: string) {
    const labels = new Map<string, number>();
    const instructions: ParsedInstruction[] = [];
    let pc = 0;

    for (const [index, raw] of source.replace(/\r\n/g, '\n').split('\n').entries()) {
      let rest = this.stripComment(raw);
      const line = index + 1;

      while (rest.length > 0) {
        const labelMatch = rest.match(/^([A-Za-z_.$][\w.$]*):\s*(.*)$/);
        if (!labelMatch) {
          break;
        }

        const label = labelMatch[1].toLowerCase();
        if (labels.has(label)) {
          throw new BadRequestException(`line ${line}: duplicate label "${label}"`);
        }
        labels.set(label, pc);
        rest = labelMatch[2].trim();
      }

      if (!rest) {
        continue;
      }

      instructions.push({ line, asm: rest, pc });
      pc += this.instructionSize(rest, line);
    }

    return { labels, instructions };
  }

  private instructionSize(asm: string, line: number) {
    const mnemonic = asm
      .replace(/,/g, ' ')
      .replace(/\(/g, ' ')
      .replace(/\)/g, ' ')
      .trim()
      .toLowerCase()
      .split(/\s+/)[0];

    if (!mnemonic) {
      throw new BadRequestException(`line ${line}: missing instruction`);
    }

    return mnemonic.startsWith('c.') ? 2 : 4;
  }

  private reg(value: string, line: number) {
    if (!value) {
      throw new BadRequestException(`line ${line}: missing register`);
    }

    const match = value.match(/^x(\d+)$/);
    if (match) {
      const register = Number(match[1]);
      if (register >= 0 && register <= 31) {
        return register;
      }
    }

    if (value in REGISTER_ALIASES) {
      return REGISTER_ALIASES[value];
    }

    throw new BadRequestException(`line ${line}: invalid register "${value}"`);
  }

  private imm(value: string, bits: number, line: number) {
    const immediate = this.number(value, line);
    const min = -(2 ** (bits - 1));
    const max = 2 ** (bits - 1) - 1;
    if (immediate < min || immediate > max) {
      throw new BadRequestException(`line ${line}: immediate ${immediate} is outside ${bits}-bit signed range`);
    }
    return immediate;
  }

  private uimm(value: string, bits: number, line: number) {
    const immediate = this.number(value, line);
    const max = 2 ** bits - 1;
    if (immediate < 0 || immediate > max) {
      throw new BadRequestException(`line ${line}: immediate ${immediate} is outside ${bits}-bit unsigned range`);
    }
    return immediate;
  }

  private shamt(value: string, line: number) {
    const amount = this.number(value, line);
    if (amount < 0 || amount > 31) {
      throw new BadRequestException(`line ${line}: shift amount must be between 0 and 31`);
    }
    return amount;
  }

  private branchImm(value: string, bits: number, line: number) {
    const immediate = this.imm(value, bits, line);
    if (immediate % 2 !== 0) {
      throw new BadRequestException(`line ${line}: branch/jump immediate must be aligned to 2 bytes`);
    }
    return immediate;
  }

  private branchTarget(value: string, bits: number, line: number, pc: number, labels: Map<string, number>) {
    const target = labels.get(value.toLowerCase());
    if (target === undefined) {
      return this.branchImm(value, bits, line);
    }

    const offset = target - pc;
    const min = -(2 ** (bits - 1));
    const max = 2 ** (bits - 1) - 1;
    if (offset < min || offset > max) {
      throw new BadRequestException(`line ${line}: label "${value}" is outside ${bits}-bit branch/jump range`);
    }
    if (offset % 2 !== 0) {
      throw new BadRequestException(`line ${line}: label "${value}" is not 2-byte aligned`);
    }
    return offset;
  }

  private number(value: string, line: number) {
    if (!value) {
      throw new BadRequestException(`line ${line}: missing immediate`);
    }

    const hexMatch = value.match(/^(-?)0x([0-9a-f]+)$/i);
    const parsed = hexMatch
      ? (hexMatch[1] === '-' ? -1 : 1) * Number.parseInt(hexMatch[2], 16)
      : Number(value);

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(`line ${line}: invalid immediate "${value}"`);
    }

    return parsed;
  }

  private expectArgCount(mnemonic: string, args: string[], expected: number, line: number) {
    if (args.length !== expected) {
      throw new BadRequestException(
        `line ${line}: ${mnemonic} expects ${expected} argument(s), received ${args.length}`,
      );
    }
  }

  private compressedReg(register: number, line: number) {
    if (register < 8 || register > 15) {
      throw new BadRequestException(`line ${line}: compressed register must be x8..x15`);
    }
    return register - 8;
  }

  private requireWordAligned(immediate: number, line: number) {
    if (immediate % 4 !== 0) {
      throw new BadRequestException(`line ${line}: load/store offset must be aligned to 4 bytes`);
    }
  }

  private encodeR(opcode: number, funct3: number, funct7: number, rd: number, rs1: number, rs2: number) {
    return (
      ((funct7 & 0x7f) << 25) |
      ((rs2 & 0x1f) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x07) << 12) |
      ((rd & 0x1f) << 7) |
      (opcode & 0x7f)
    ) >>> 0;
  }

  private encodeI(opcode: number, funct3: number, rd: number, rs1: number, imm: number) {
    return (
      ((imm & 0xfff) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x07) << 12) |
      ((rd & 0x1f) << 7) |
      (opcode & 0x7f)
    ) >>> 0;
  }

  private encodeS(opcode: number, funct3: number, rs2: number, rs1: number, imm: number) {
    const encodedImm = imm & 0xfff;
    return (
      (((encodedImm >>> 5) & 0x7f) << 25) |
      ((rs2 & 0x1f) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x07) << 12) |
      ((encodedImm & 0x1f) << 7) |
      (opcode & 0x7f)
    ) >>> 0;
  }

  private encodeB(opcode: number, funct3: number, rs1: number, rs2: number, imm: number) {
    const encodedImm = imm & 0x1fff;
    return (
      (((encodedImm >>> 12) & 0x1) << 31) |
      (((encodedImm >>> 5) & 0x3f) << 25) |
      ((rs2 & 0x1f) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x07) << 12) |
      (((encodedImm >>> 1) & 0x0f) << 8) |
      (((encodedImm >>> 11) & 0x1) << 7) |
      (opcode & 0x7f)
    ) >>> 0;
  }

  private encodeJ(opcode: number, rd: number, imm: number) {
    const encodedImm = imm & 0x1fffff;
    return (
      (((encodedImm >>> 20) & 0x1) << 31) |
      (((encodedImm >>> 1) & 0x3ff) << 21) |
      (((encodedImm >>> 11) & 0x1) << 20) |
      (((encodedImm >>> 12) & 0xff) << 12) |
      ((rd & 0x1f) << 7) |
      (opcode & 0x7f)
    ) >>> 0;
  }

  private wordHex(word: number) {
    return (word >>> 0).toString(16).padStart(8, '0').toUpperCase();
  }

  private halfwordHex(halfword: number) {
    return (halfword & 0xffff).toString(16).padStart(4, '0').toUpperCase();
  }

  private cAddi(rd: number, imm: number) {
    const encodedImm = imm & 0x3f;
    return (
      (0b000 << 13) |
      (((encodedImm >>> 5) & 0x1) << 12) |
      ((rd & 0x1f) << 7) |
      ((encodedImm & 0x1f) << 2) |
      0b01
    );
  }

  private cSlli(rd: number, shamt: number) {
    if (rd === 0) {
      throw new BadRequestException('c.slli rd cannot be x0');
    }
    return (
      (0b000 << 13) |
      ((rd & 0x1f) << 7) |
      ((shamt & 0x1f) << 2) |
      0b10
    );
  }

  private cLui(rd: number, imm: number, line: number) {
    if (rd === 0 || rd === 2) {
      throw new BadRequestException(`line ${line}: c.lui rd cannot be x0 or x2`);
    }
    if (imm === 0) {
      throw new BadRequestException(`line ${line}: c.lui immediate cannot be 0`);
    }
    const encodedImm = imm & 0x3f;
    return (
      (0b011 << 13) |
      (((encodedImm >>> 5) & 0x1) << 12) |
      ((rd & 0x1f) << 7) |
      ((encodedImm & 0x1f) << 2) |
      0b01
    );
  }

  private cAdd(rd: number, rs2: number, line: number) {
    if (rd === 0 || rs2 === 0) {
      throw new BadRequestException(`line ${line}: c.add/c.mv registers cannot be x0`);
    }
    return (
      (0b100 << 13) |
      (1 << 12) |
      ((rd & 0x1f) << 7) |
      ((rs2 & 0x1f) << 2) |
      0b10
    );
  }

  private cAlu(rd: number, rs2: number, funct2: number, line: number) {
    const rdPrime = this.compressedReg(rd, line);
    const rs2Prime = this.compressedReg(rs2, line);
    return (
      (0b100 << 13) |
      (0b11 << 10) |
      (rdPrime << 7) |
      ((funct2 & 0x3) << 5) |
      (rs2Prime << 2) |
      0b01
    );
  }

  private cShiftOrAndi(rd: number, value: number, funct2: number, line: number) {
    const rdPrime = this.compressedReg(rd, line);
    const encodedValue = value & 0x3f;
    if (funct2 !== 0b10 && encodedValue > 31) {
      throw new BadRequestException(`line ${line}: compressed shift amount must be 0..31`);
    }
    return (
      (0b100 << 13) |
      (((encodedValue >>> 5) & 0x1) << 12) |
      ((funct2 & 0x3) << 10) |
      (rdPrime << 7) |
      ((encodedValue & 0x1f) << 2) |
      0b01
    );
  }

  private cLoadStore(funct3: number, rs2OrRd: number, rs1: number, offset: number, line: number) {
    this.requireWordAligned(offset, line);
    const rs1Prime = this.compressedReg(rs1, line);
    const rs2OrRdPrime = this.compressedReg(rs2OrRd, line);
    return (
      ((funct3 & 0x7) << 13) |
      (((offset >>> 5) & 0x1) << 5) |
      (((offset >>> 3) & 0x7) << 10) |
      (((offset >>> 2) & 0x1) << 6) |
      (rs1Prime << 7) |
      (rs2OrRdPrime << 2)
    );
  }

  private cLwsp(rd: number, rs1: number, offset: number, line: number) {
    this.requireWordAligned(offset, line);
    if (rd === 0) {
      throw new BadRequestException(`line ${line}: c.lwsp rd cannot be x0`);
    }
    if (rs1 !== 2) {
      throw new BadRequestException(`line ${line}: c.lwsp base register must be x2/sp`);
    }
    return (
      (0b010 << 13) |
      (((offset >>> 6) & 0x3) << 2) |
      (((offset >>> 5) & 0x1) << 12) |
      (((offset >>> 2) & 0x7) << 4) |
      ((rd & 0x1f) << 7) |
      0b10
    );
  }

  private cSwsp(rs2: number, rs1: number, offset: number, line: number) {
    this.requireWordAligned(offset, line);
    if (rs1 !== 2) {
      throw new BadRequestException(`line ${line}: c.swsp base register must be x2/sp`);
    }
    return (
      (0b110 << 13) |
      (((offset >>> 6) & 0x3) << 7) |
      (((offset >>> 2) & 0xf) << 9) |
      ((rs2 & 0x1f) << 2) |
      0b10
    );
  }

  private cBranch(funct3: number, rs1: number, offset: number, line: number) {
    const rs1Prime = this.compressedReg(rs1, line);
    const encoded = offset & 0x1fff;
    return (
      ((funct3 & 0x7) << 13) |
      (((encoded >>> 12) & 0x1) << 12) |
      (((encoded >>> 6) & 0x3) << 5) |
      (((encoded >>> 5) & 0x1) << 2) |
      (((encoded >>> 3) & 0x3) << 10) |
      (((encoded >>> 1) & 0x3) << 3) |
      (rs1Prime << 7) |
      0b01
    );
  }

  private cJump(funct3: number, offset: number) {
    const encoded = offset & 0xfff;
    return (
      ((funct3 & 0x7) << 13) |
      (((encoded >>> 11) & 0x1) << 12) |
      (((encoded >>> 10) & 0x1) << 8) |
      (((encoded >>> 8) & 0x3) << 9) |
      (((encoded >>> 7) & 0x1) << 6) |
      (((encoded >>> 6) & 0x1) << 7) |
      (((encoded >>> 5) & 0x1) << 2) |
      (((encoded >>> 4) & 0x1) << 11) |
      (((encoded >>> 1) & 0x7) << 3) |
      0b01
    );
  }

  private cJrJalr(rs1: number, link: boolean, line: number) {
    if (rs1 === 0) {
      throw new BadRequestException(`line ${line}: c.jr/c.jalr rs1 cannot be x0`);
    }
    return (
      (0b100 << 13) |
      ((link ? 1 : 0) << 12) |
      ((rs1 & 0x1f) << 7) |
      0b10
    );
  }
}
