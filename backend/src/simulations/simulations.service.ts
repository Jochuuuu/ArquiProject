import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { mkdir, readdir, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { AssemblerService, AssembledInstruction } from './assembler.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';

type SimulationStatus = 'success' | 'failed';

interface TraceCycle {
  cycle: number;
  pc: string;
  rawInstrF: string;
  instrF: string;
  instrD: string;
  instrE: string;
  instrM: string;
  instrW: string;
  stallF: boolean;
  stallD: boolean;
  flushD: boolean;
  flushE: boolean;
  forwardAE: string;
  forwardBE: string;
  rdW: number;
  regWriteW: boolean;
  resultW: string;
  memWrite: boolean;
  dataAdr: string;
  writeData: string;
  registerWrite?: {
    register: string;
    value: string;
  };
  memoryWrite?: {
    address: string;
    value: string;
  };
}

interface SimulationRecord {
  id: string;
  status: SimulationStatus;
  runDir: string;
  memPath: string;
  asmPath: string | null;
  waveformPath: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  trace: TraceCycle[];
  stores: Array<{ address: number; value: number }>;
  sourceType: 'mem' | 'asm';
  assembledInstructions: AssembledInstruction[];
  annotatedMem: string | null;
  createdAt: string;
}

@Injectable()
export class SimulationsService {
  private readonly records = new Map<string, SimulationRecord>();
  private readonly repoRoot = path.resolve(__dirname, '..', '..', '..');
  private readonly runsRoot = path.join(this.repoRoot, 'backend', 'runs');
  private readonly maxRunAgeMs = 24 * 60 * 60 * 1000;
  private readonly maxRunDirectories = 20;

  constructor(private readonly assemblerService: AssemblerService) {}

  async create(dto: CreateSimulationDto) {
    await this.cleanupRuns();

    const source = this.resolveSource(dto);
    const id = randomUUID();
    const runDir = path.join(this.runsRoot, id);
    const memPath = path.join(runDir, 'program.mem');
    const asmPath = source.sourceType === 'asm' ? path.join(runDir, 'program.asm') : null;
    const waveformPath = path.join(runDir, 'riscv_pipe.vcd');

    await mkdir(runDir, { recursive: true });
    await writeFile(memPath, source.mem, 'utf8');
    if (asmPath && dto.asm) {
      await writeFile(asmPath, dto.asm, 'utf8');
    }

    const compile = await this.runCommand(
      'iverilog',
      [
        '-g2005',
        '-o',
        path.join(runDir, 'riscv_pipe_sim'),
        this.repoPath('tb/testbench.v'),
        this.repoPath('src/core/top.v'),
        this.repoPath('src/core/riscvpipeline.v'),
        this.repoPath('src/core/controller.v'),
        this.repoPath('src/core/maindec.v'),
        this.repoPath('src/core/aludec.v'),
        this.repoPath('src/core/extend.v'),
        this.repoPath('src/core/compressed_decoder.v'),
        this.repoPath('src/components/regfile.v'),
        this.repoPath('src/components/alu.v'),
        this.repoPath('src/components/mux2.v'),
        this.repoPath('src/components/mux3.v'),
        this.repoPath('src/components/flopr.v'),
        this.repoPath('src/components/adder.v'),
        this.repoPath('src/mem/imem.v'),
        this.repoPath('src/mem/dmem.v'),
      ],
      this.repoRoot,
      20_000,
    );

    let run = { stdout: '', stderr: '', exitCode: null as number | null };
    if (compile.exitCode === 0) {
      const plusArgs = [`+MEMFILE=${memPath}`, '+TRACE'];
      if (dto.waveform === false) {
        plusArgs.push('+NO_VCD');
      }
      if (dto.maxCycles) {
        plusArgs.push(`+MAX_CYCLES=${dto.maxCycles}`);
      }

      run = await this.runCommand(
        'vvp',
        [path.join(runDir, 'riscv_pipe_sim'), ...plusArgs],
        runDir,
        20_000,
      );
    }

    const stdout = [compile.stdout, run.stdout].filter(Boolean).join('\n');
    const stderr = [compile.stderr, run.stderr].filter(Boolean).join('\n');
    const exitCode = compile.exitCode !== 0 ? compile.exitCode : run.exitCode;
    const trace = this.parseTrace(stdout);
    const stores = this.parseStores(stdout);

    const record: SimulationRecord = {
      id,
      status: exitCode === 0 ? 'success' : 'failed',
      runDir,
      memPath,
      asmPath,
      waveformPath,
      stdout,
      stderr,
      exitCode,
      trace,
      stores,
      sourceType: source.sourceType,
      assembledInstructions: source.assembledInstructions,
      annotatedMem: source.annotatedMem,
      createdAt: new Date().toISOString(),
    };

    this.records.set(id, record);
    await writeFile(path.join(runDir, 'summary.json'), JSON.stringify(this.toSummary(record), null, 2));
    await writeFile(path.join(runDir, 'trace.json'), JSON.stringify(trace, null, 2));

    return this.toSummary(record);
  }

  getSummary(id: string) {
    return this.toSummary(this.getRecord(id));
  }

  getTrace(id: string) {
    return {
      id,
      trace: this.getRecord(id).trace,
    };
  }

  async getWaveformPath(id: string) {
    const record = this.getRecord(id);
    if (!existsSync(record.waveformPath)) {
      return null;
    }

    const info = await stat(record.waveformPath);
    return info.isFile() ? record.waveformPath : null;
  }

  private getRecord(id: string) {
    const record = this.records.get(id);
    if (!record) {
      throw new NotFoundException(`Simulation ${id} not found`);
    }
    return record;
  }

  private toSummary(record: SimulationRecord) {
    return {
      id: record.id,
      status: record.status,
      exitCode: record.exitCode,
      createdAt: record.createdAt,
      traceCycles: record.trace.length,
      sourceType: record.sourceType,
      assembledInstructions: record.assembledInstructions,
      annotatedMem: record.annotatedMem,
      stores: record.stores,
      finalStore: record.stores.at(-1) ?? null,
      waveformAvailable: existsSync(record.waveformPath),
      endpoints: {
        trace: `/simulations/${record.id}/trace`,
        waveform: `/simulations/${record.id}/waveform`,
      },
      stdout: record.stdout,
      stderr: record.stderr,
    };
  }

  private normalizeMem(mem: string) {
    const normalized = mem
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, '').trim())
      .map((line) => line.match(/^[0-9a-fA-F]+/)?.[0] ?? '')
      .filter((line) => line.length > 0)
      .join('\n');

    if (!normalized) {
      throw new BadRequestException('mem cannot be empty');
    }

    return `${normalized}\n`;
  }

  private resolveSource(dto: CreateSimulationDto) {
    const sourceType = dto.sourceType ?? (dto.asm ? 'asm' : 'mem');

    if (sourceType === 'asm') {
      if (!dto.asm) {
        throw new BadRequestException('asm cannot be empty');
      }
      const assembled = this.assemblerService.assemble(dto.asm);
      return {
        sourceType,
        mem: assembled.mem,
        assembledInstructions: assembled.instructions,
        annotatedMem: assembled.annotatedMem,
      };
    }

    if (!dto.mem) {
      throw new BadRequestException('mem cannot be empty');
    }

    return {
      sourceType,
      mem: this.normalizeMem(dto.mem),
      assembledInstructions: [],
      annotatedMem: null,
    };
  }

  private repoPath(relativePath: string) {
    return path.join(this.repoRoot, relativePath);
  }

  private async cleanupRuns() {
    await mkdir(this.runsRoot, { recursive: true });

    const entries = await readdir(this.runsRoot, { withFileTypes: true });
    const now = Date.now();
    const directories = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const fullPath = path.join(this.runsRoot, entry.name);
          const info = await stat(fullPath);
          return {
            id: entry.name,
            path: fullPath,
            modifiedAt: info.mtimeMs,
          };
        }),
    );

    const expired = directories.filter((directory) => now - directory.modifiedAt > this.maxRunAgeMs);
    const overflow = directories
      .filter((directory) => now - directory.modifiedAt <= this.maxRunAgeMs)
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
      .slice(this.maxRunDirectories);

    for (const directory of [...expired, ...overflow]) {
      await rm(directory.path, { recursive: true, force: true });
      this.records.delete(directory.id);
    }
  }

  private parseTrace(stdout: string): TraceCycle[] {
    return stdout
      .split(/\r?\n/)
      .filter((line) => line.startsWith('TRACE '))
      .map((line) => {
        const fields = this.parseKeyValueLine(line.slice('TRACE '.length));
        const rdW = Number(fields.rdW ?? 0);
        const regWriteW = fields.regWriteW === '1';
        const memWrite = fields.memWrite === '1';
        const cycle: TraceCycle = {
          cycle: Number(fields.cycle ?? 0),
          pc: this.hex(fields.pc),
          rawInstrF: this.hex(fields.rawInstrF),
          instrF: this.hex(fields.instrF),
          instrD: this.hex(fields.instrD),
          instrE: this.hex(fields.instrE),
          instrM: this.hex(fields.instrM),
          instrW: this.hex(fields.instrW),
          stallF: fields.stallF === '1',
          stallD: fields.stallD === '1',
          flushD: fields.flushD === '1',
          flushE: fields.flushE === '1',
          forwardAE: fields.forwardAE ?? '00',
          forwardBE: fields.forwardBE ?? '00',
          rdW,
          regWriteW,
          resultW: this.hex(fields.resultW),
          memWrite,
          dataAdr: this.hex(fields.dataAdr),
          writeData: this.hex(fields.writeData),
        };

        if (regWriteW && rdW !== 0) {
          cycle.registerWrite = {
            register: `x${rdW}`,
            value: cycle.resultW,
          };
        }

        if (memWrite) {
          cycle.memoryWrite = {
            address: cycle.dataAdr,
            value: cycle.writeData,
          };
        }

        return cycle;
      });
  }

  private parseStores(stdout: string) {
    const stores: Array<{ address: number; value: number }> = [];
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/^Store: mem\[(\d+)] <= (-?\d+)/);
      if (match) {
        stores.push({ address: Number(match[1]), value: Number(match[2]) });
      }
    }
    return stores;
  }

  private parseKeyValueLine(line: string) {
    const fields: Record<string, string> = {};
    for (const part of line.split(/\s+/)) {
      const [key, value] = part.split('=');
      if (key && value !== undefined) {
        fields[key] = value;
      }
    }
    return fields;
  }

  private hex(value?: string) {
    if (!value) {
      return '0x00000000';
    }
    const cleaned = value.replace(/^0x/i, '').toLowerCase();
    return `0x${cleaned.padStart(8, '0')}`;
  }

  private runCommand(command: string, args: string[], cwd: string, timeoutMs: number) {
    return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
      const child = spawn(command, args, {
        cwd,
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill();
        stderr += `\nCommand timed out after ${timeoutMs}ms`;
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code });
      });
      child.on('error', async (error) => {
        clearTimeout(timeout);
        stderr += `\n${error.message}`;
        resolve({ stdout, stderr, exitCode: 1 });
      });
    });
  }
}
