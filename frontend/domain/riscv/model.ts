import { RiscvRunResponse, TraceCycle } from "./type";

export const ABI_NAMES = [
  "zero", "ra",  "sp",   "gp",  "tp", "t0", "t1", "t2",
  "s0/fp","s1",  "a0",   "a1",  "a2", "a3", "a4", "a5",
  "a6",   "a7",  "s2",   "s3",  "s4", "s5", "s6", "s7",
  "s8",   "s9",  "s10",  "s11", "t3", "t4", "t5", "t6",
];

export class RiscvModel {
  public status: string;
  public stepsExecuted: number;
  public hitLimit: boolean;
  public pc: number;
  public registers: number[];
  public unknownRegisters: boolean[];
  public memory: number[];
  public programMemory: number[];
  public programSize: number;
  public sessionId?: string;
  public isFinished?: boolean;
  public trace: TraceCycle[];
  public currentTraceIndex: number;
  public simulationId?: string;
  public waveformUrl?: string;
  public annotatedMem?: string | null;

  constructor(data: RiscvRunResponse) {
    this.status = data.status;
    this.stepsExecuted = data.steps_executed;
    this.hitLimit = data.hit_limit;
    this.pc = data.pc || 0;
    this.registers = data.registers || Array(32).fill(0);
    this.unknownRegisters = (data as RiscvRunResponse & { unknown_registers?: boolean[] }).unknown_registers || Array(32).fill(false);
    this.memory = data.memory || Array(4096).fill(0);
    this.programMemory = (data as RiscvRunResponse & { program_memory?: number[] }).program_memory || [];
    this.programSize = data.program_size || 0;
    this.sessionId = data.session_id;
    this.isFinished = data.is_finished;
    this.trace = data.trace || [];
    this.currentTraceIndex = data.current_trace_index ?? Math.max(0, this.trace.length - 1);
    this.simulationId = data.simulation_id;
    this.waveformUrl = data.waveform_url;
    this.annotatedMem = data.annotated_mem;
  }

  static fromTrace(params: {
    status: string;
    trace: TraceCycle[];
    traceIndex: number;
    hitLimit: boolean;
    simulationId?: string;
    waveformUrl?: string;
    annotatedMem?: string | null;
  }) {
    const clampedIndex = Math.min(Math.max(params.traceIndex, 0), Math.max(params.trace.length - 1, 0));
    const visibleTrace = params.trace.slice(0, clampedIndex + 1);
    const registers = Array(32).fill(0);
    const unknownRegisters = Array(32).fill(false);
    const memory = Array(4096).fill(0);
    const programMemory = buildProgramMemory(params.annotatedMem, params.trace);

    for (const cycle of visibleTrace) {
      if (cycle.registerWrite) {
        const index = Number(cycle.registerWrite.register.replace("x", ""));
        if (index > 0 && index < 32) {
          if (isKnownHex(cycle.registerWrite.value)) {
            registers[index] = parseHex(cycle.registerWrite.value);
            unknownRegisters[index] = false;
          } else {
            registers[index] = 0;
            unknownRegisters[index] = true;
          }
        }
      }

      if (cycle.memoryWrite) {
        const address = parseHex(cycle.memoryWrite.address);
        const value = parseHex(cycle.memoryWrite.value);
        if (address >= 0 && address + 3 < memory.length) {
          memory[address] = value & 0xff;
          memory[address + 1] = (value >>> 8) & 0xff;
          memory[address + 2] = (value >>> 16) & 0xff;
          memory[address + 3] = (value >>> 24) & 0xff;
        }
      }
    }

    return new RiscvModel({
      status: params.status,
      steps_executed: countArchitecturalSteps(visibleTrace),
      hit_limit: params.hitLimit,
      pc: estimateArchitecturalPc(visibleTrace),
      registers,
      unknown_registers: unknownRegisters,
      memory,
      program_memory: programMemory,
      program_size: Math.max(programMemory.length, estimateProgramSize(params.trace)),
      session_id: params.simulationId,
      is_finished: clampedIndex >= params.trace.length - 1,
      trace: params.trace,
      current_trace_index: clampedIndex,
      simulation_id: params.simulationId,
      waveform_url: params.waveformUrl,
      annotated_mem: params.annotatedMem,
    });
  }

  getAbiName(index: number): string {
    return ABI_NAMES[index] || `x${index}`;
  }

  getHexValue(index: number): string {
    if (this.unknownRegisters[index]) {
      return "0xXXXXXXXX";
    }
    const unsigned = this.registers[index] >>> 0;
    return "0x" + unsigned.toString(16).padStart(8, "0").toUpperCase();
  }

  getDecValue(index: number): string {
    if (this.unknownRegisters[index]) {
      return "X";
    }
    const signed = this.registers[index] | 0;
    return signed.toString();
  }

  isChanged(index: number): boolean {
    return this.unknownRegisters[index] || this.registers[index] !== 0;
  }

  isSuccessful(): boolean {
    return this.status === "success";
  }

  getPcHex(): string {
    return "0x" + (this.pc >>> 0).toString(16).padStart(8, "0").toUpperCase();
  }

  getMemoryRows(
    startAddr = 0,
    length = this.memory.length,
    bytesPerRow = 16
  ): { address: number; bytes: number[]; ascii: string }[] {
    const rows = [];
    const end = Math.min(startAddr + length, this.memory.length);
    for (let addr = startAddr; addr < end; addr += bytesPerRow) {
      const bytes = this.memory.slice(addr, addr + bytesPerRow);
      const ascii = bytes
        .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
        .join("");
      rows.push({ address: addr, bytes, ascii });
    }
    return rows;
  }

  getProgramMemoryRows(
    startAddr = 0,
    length = this.programMemory.length,
    bytesPerRow = 16
  ): { address: number; bytes: number[]; ascii: string }[] {
    return this.getRowsFromBytes(this.programMemory, startAddr, length, bytesPerRow);
  }

  getDataMemoryRows(
    startAddr = 0,
    length = this.memory.length,
    bytesPerRow = 16
  ): { address: number; bytes: number[]; ascii: string }[] {
    return this.getRowsFromBytes(this.memory, startAddr, length, bytesPerRow);
  }

  private getRowsFromBytes(
    bytesSource: number[],
    startAddr: number,
    length: number,
    bytesPerRow: number
  ): { address: number; bytes: number[]; ascii: string }[] {
    const rows = [];
    const end = Math.min(startAddr + length, bytesSource.length);
    for (let addr = startAddr; addr < end; addr += bytesPerRow) {
      const bytes = bytesSource.slice(addr, addr + bytesPerRow);
      const ascii = bytes
        .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
        .join("");
      rows.push({ address: addr, bytes, ascii });
    }
    return rows;
  }

  getProgramRange(): { start: number; end: number } {
    return { start: 0, end: this.programSize };
  }
}

function parseHex(value: string) {
  if (!value) {
    return 0;
  }

  const cleaned = value.replace(/^0x/i, "");
  if (cleaned.includes("x") || cleaned.includes("z")) {
    return 0;
  }

  return Number.parseInt(cleaned, 16) >>> 0;
}

function estimateProgramSize(trace: TraceCycle[]) {
  return getFetchedInstructions(trace).reduce(
    (max, instruction) => Math.max(max, instruction.pc + instruction.size),
    0
  );
}

function countArchitecturalSteps(trace: TraceCycle[]) {
  return trace.filter(hasRetiredInstruction).length;
}

function estimateArchitecturalPc(trace: TraceCycle[]) {
  const steps = countArchitecturalSteps(trace);
  if (steps === 0) {
    return getFetchedInstructions(trace)[0]?.pc ?? 0;
  }

  const fetchedInstructions = getFetchedInstructions(trace);
  const lastRetired = fetchedInstructions[Math.min(steps - 1, fetchedInstructions.length - 1)];
  if (!lastRetired) {
    return steps * 4;
  }

  return lastRetired.pc + lastRetired.size;
}

function getFetchedInstructions(trace: TraceCycle[]) {
  const instructions: Array<{ pc: number; raw: number; size: 2 | 4 }> = [];

  for (const cycle of trace) {
    if (!isKnownHex(cycle.pc) || !isKnownHex(cycle.rawInstrF)) {
      continue;
    }

    const pc = parseHex(cycle.pc);
    const raw = parseHex(cycle.rawInstrF);
    const previous = instructions.at(-1);
    if (previous?.pc === pc && previous.raw === raw) {
      continue;
    }

    instructions.push({
      pc,
      raw,
      size: (raw & 0b11) === 0b11 ? 4 : 2,
    });
  }

  return instructions;
}

function hasRetiredInstruction(cycle: TraceCycle) {
  if (!isKnownHex(cycle.instrW)) {
    return false;
  }

  return parseHex(cycle.instrW) !== 0x00000013;
}

function buildProgramMemory(annotatedMem: string | null | undefined, trace: TraceCycle[]) {
  const halfwords = annotatedMem
    ? annotatedMem
        .split(/\r?\n/)
        .map((line) => line.replace(/\/\/.*$/, "").trim())
        .map((line) => line.match(/^[0-9a-fA-F]{4}/)?.[0] ?? "")
        .filter(Boolean)
    : [];

  if (halfwords.length > 0) {
    return halfwords.flatMap((halfword) => halfwordToBytes(Number.parseInt(halfword, 16)));
  }

  const bytes: number[] = [];
  for (const instruction of getFetchedInstructions(trace)) {
    if (instruction.size === 2) {
      bytes[instruction.pc] = instruction.raw & 0xff;
      bytes[instruction.pc + 1] = (instruction.raw >>> 8) & 0xff;
    } else {
      bytes[instruction.pc] = instruction.raw & 0xff;
      bytes[instruction.pc + 1] = (instruction.raw >>> 8) & 0xff;
      bytes[instruction.pc + 2] = (instruction.raw >>> 16) & 0xff;
      bytes[instruction.pc + 3] = (instruction.raw >>> 24) & 0xff;
    }
  }

  return bytes.map((byte) => byte ?? 0);
}

function halfwordToBytes(halfword: number) {
  return [halfword & 0xff, (halfword >>> 8) & 0xff];
}

function isKnownHex(value: string) {
  if (!value) {
    return false;
  }

  const cleaned = value.replace(/^0x/i, "");
  return cleaned.length > 0 && !cleaned.includes("x") && !cleaned.includes("z");
}
