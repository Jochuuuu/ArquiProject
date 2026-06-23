import { RiscvModel } from "./model";
import {
  AssembleResponse,
  CreateSimulationRequest,
  SimulationSummaryResponse,
  SimulationTraceResponse,
  TraceCycle,
} from "./type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CachedSimulation = {
  id: string;
  trace: TraceCycle[];
  status: string;
  hitLimit: boolean;
  waveformUrl?: string;
};

const sessions = new Map<string, CachedSimulation>();

export class RiscvService {
  static async runCode(mem: string, maxSteps = 5000): Promise<RiscvModel> {
    const boundedMaxSteps = clampMaxSteps(maxSteps);
    const simulation = await this.createSimulation({
      ...toSourcePayload(mem),
      debug: true,
      waveform: true,
      maxCycles: boundedMaxSteps,
    });

    const trace = await this.getTrace(simulation.id);
    const waveformUrl = `${API_BASE_URL}${simulation.endpoints.waveform}`;
    const hitLimit = trace.length >= boundedMaxSteps;

    sessions.set(simulation.id, {
      id: simulation.id,
      trace,
      status: simulation.status,
      hitLimit,
      waveformUrl,
    });

    const model = RiscvModel.fromTrace({
      status: simulation.status,
      trace,
      traceIndex: Math.max(trace.length - 1, 0),
      hitLimit,
      simulationId: simulation.id,
      waveformUrl,
      annotatedMem: simulation.annotatedMem,
    });
    currentModels.set(simulation.id, model);
    return model;
  }

  static async startDebugSession(mem: string, maxSteps = 5000): Promise<RiscvModel> {
    const boundedMaxSteps = clampMaxSteps(maxSteps);
    const simulation = await this.createSimulation({
      ...toSourcePayload(mem),
      debug: true,
      waveform: true,
      maxCycles: boundedMaxSteps,
    });
    const trace = await this.getTrace(simulation.id);
    const waveformUrl = `${API_BASE_URL}${simulation.endpoints.waveform}`;

    sessions.set(simulation.id, {
      id: simulation.id,
      trace,
      status: simulation.status,
      hitLimit: trace.length >= boundedMaxSteps,
      waveformUrl,
    });

    const model = RiscvModel.fromTrace({
      status: simulation.status,
      trace,
      traceIndex: 0,
      hitLimit: trace.length >= boundedMaxSteps,
      simulationId: simulation.id,
      waveformUrl,
      annotatedMem: simulation.annotatedMem,
    });
    currentModels.set(simulation.id, model);
    return model;
  }

  static async stepSession(sessionId: string): Promise<RiscvModel> {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error("Sesion de debug no encontrada. Ejecuta Debug otra vez.");
    }

    const currentModel = RiscvService.getCurrentModel(sessionId);
    const nextIndex = findNextInstructionStepIndex(
      session.trace,
      currentModel?.currentTraceIndex ?? 0
    );

    const nextModel = RiscvModel.fromTrace({
      status: session.status,
      trace: session.trace,
      traceIndex: nextIndex,
      hitLimit: session.hitLimit,
      simulationId: session.id,
      waveformUrl: session.waveformUrl,
      annotatedMem: currentModel?.annotatedMem,
    });

    currentModels.set(sessionId, nextModel);
    return nextModel;
  }

  static async assemble(source: string): Promise<AssembleResponse> {
    const response = await fetch(`${API_BASE_URL}/simulations/assemble`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ asm: source }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "No se pudo ensamblar el programa.");
    }

    return (await response.json()) as AssembleResponse;
  }

  static async stopSession(sessionId: string): Promise<void> {
    sessions.delete(sessionId);
    currentModels.delete(sessionId);
  }

  static async uploadBinFile(file: File): Promise<RiscvModel> {
    const text = await file.text();
    return this.startDebugSession(text);
  }

  private static async createSimulation(payload: CreateSimulationRequest) {
    const response = await fetch(`${API_BASE_URL}/simulations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "No se pudo ejecutar la simulacion.");
    }

    return (await response.json()) as SimulationSummaryResponse;
  }

  private static async getTrace(id: string) {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}/trace`);
    if (!response.ok) {
      throw new Error("No se pudo obtener la traza de la simulacion.");
    }

    const data = (await response.json()) as SimulationTraceResponse;
    return data.trace;
  }

  private static getCurrentModel(sessionId: string) {
    return currentModels.get(sessionId);
  }
}

const currentModels = new Map<string, RiscvModel>();

function clampMaxSteps(maxSteps: number) {
  return Math.min(5000, Math.max(1, Math.trunc(maxSteps || 5000)));
}

function toSourcePayload(source: string): Pick<CreateSimulationRequest, "mem" | "asm" | "sourceType"> {
  if (looksLikeMem(source)) {
    return { mem: source, sourceType: "mem" };
  }

  return { asm: source, sourceType: "asm" };
}

function looksLikeMem(source: string) {
  const lines = source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").replace(/#.*$/, "").trim())
    .filter(Boolean);

  return lines.length > 0 && lines.every((line) => /^[0-9a-fA-F]{1,8}$/.test(line));
}

function findNextInstructionStepIndex(trace: TraceCycle[], currentIndex: number) {
  if (trace.length === 0) {
    return 0;
  }

  for (let index = currentIndex + 1; index < trace.length; index += 1) {
    if (hasRetiredInstruction(trace[index])) {
      return index;
    }
  }

  return trace.length - 1;
}

function hasRetiredInstruction(cycle: TraceCycle) {
  if (!isKnownHex(cycle.instrW)) {
    return false;
  }

  return parseHex(cycle.instrW) !== 0x00000013;
}

function parseHex(value: string) {
  return Number.parseInt(value.replace(/^0x/i, ""), 16) >>> 0;
}

function isKnownHex(value: string) {
  if (!value) {
    return false;
  }

  const cleaned = value.replace(/^0x/i, "");
  return cleaned.length > 0 && !cleaned.includes("x") && !cleaned.includes("z");
}
