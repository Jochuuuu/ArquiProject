export interface CreateSimulationRequest {
  mem?: string;
  asm?: string;
  sourceType?: "mem" | "asm";
  debug?: boolean;
  waveform?: boolean;
  maxCycles?: number;
}

export interface AssembleRequest {
  asm: string;
}

export interface AssembleResponse {
  mem: string;
  annotatedMem: string;
  instructions: Array<{
    line: number;
    asm: string;
    hex: string;
    mem: string[];
  }>;
}

export interface SimulationSummaryResponse {
  id: string;
  status: string;
  exitCode: number | null;
  createdAt: string;
  sourceType: "mem" | "asm";
  assembledInstructions: AssembleResponse["instructions"];
  annotatedMem: string | null;
  traceCycles: number;
  stores: Array<{ address: number; value: number }>;
  finalStore: { address: number; value: number } | null;
  waveformAvailable: boolean;
  endpoints: {
    trace: string;
    waveform: string;
  };
  stdout: string;
  stderr: string;
}

export interface TraceCycle {
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

export interface SimulationTraceResponse {
  id: string;
  trace: TraceCycle[];
}

export interface RiscvRunResponse {
  status: string;
  steps_executed: number;
  hit_limit: boolean;
  pc: number;
  registers: number[];
  unknown_registers?: boolean[];
  memory: number[];
  program_memory?: number[];
  program_size: number;
  session_id?: string;
  is_finished?: boolean;
  trace?: TraceCycle[];
  current_trace_index?: number;
  simulation_id?: string;
  waveform_url?: string;
  annotated_mem?: string | null;
}
