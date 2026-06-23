"use client";

import { useEffect, useState } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";

import { RiscvService } from "@/domain/riscv/service";
import { RiscvModel } from "@/domain/riscv/model";
import { TopNavBar } from "@/components/ide/TopNavBar";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { RegisterPanel } from "@/components/ide/RegisterPanel";
import { MemoryMapPanel } from "@/components/ide/MemoryMapPanel";
import { GeneratedMemPanel } from "@/components/ide/GeneratedMemPanel";
import { ConsolePanel } from "@/components/ide/ConsolePanel";
import { SettingsModal } from "@/components/ide/SettingsModal";
import { DEFAULT_SETTINGS, IdeSettings, LogEntry } from "@/components/ide/types";

const SETTINGS_STORAGE_KEY = "uteclator_settings";
const LEGACY_SETTINGS_STORAGE_KEY = "riscv_ide_settings";
const MEMORY_MAP_DRAG_TYPE = "uteclator/memory-map";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function IdePage() {
  const [code, setCode] = useState(
    `addi x1, x0, 4
addi x2, x0, 8
addi x3, x0, 12
addi x4, x0, 13
addi x5, x0, 20
add x6, x1, x2
sub x7, x5, x4
or x8, x1, x2
and x9, x3, x5
slt x10, x1, x2
addi x11, x0, 25
sw x11, 100(x0)
beq x0, x0, 0`
  );
  const [simulationModel, setSimulationModel] = useState<RiscvModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isBinaryMode, setIsBinaryMode] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<LogEntry[]>([]);
  const [generatedMem, setGeneratedMem] = useState<string | null>(null);
  const [showGeneratedMem, setShowGeneratedMem] = useState(true);
  const [activeSidePanel, setActiveSidePanel] = useState<"registers" | "memoryMap">("registers");
  const [isMemoryMapDetached, setIsMemoryMapDetached] = useState(false);
  const [registerPanelWidth, setRegisterPanelWidth] = useState(40);
  const [memoryPanelWidth, setMemoryPanelWidth] = useState(28);
  const [generatedMemPanelWidth, setGeneratedMemPanelWidth] = useState(34);
  const [ideSettings, setIdeSettings] = useState<IdeSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setConsoleEntries([
      {
        type: "info",
        message: "uteclator listo. Backend conectado.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  useEffect(() => {
    const savedSettings =
      localStorage.getItem(SETTINGS_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);

    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setIdeSettings({
          ...parsedSettings,
          maxSteps: Math.min(5000, Math.max(1, parsedSettings.maxSteps || DEFAULT_SETTINGS.maxSteps)),
        });
      } catch {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
      }
    }
  }, []);

  const handleSaveSettings = (newSettings: IdeSettings) => {
    setIdeSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  };

  const addConsoleEntry = (entry: Omit<LogEntry, "timestamp">) => {
    setConsoleEntries((previousEntries) => [
      ...previousEntries,
      { ...entry, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  const handleRun = async () => {
    setIsLoading(true);
    addConsoleEntry({ type: "info", message: `Compiling and running (max steps: ${ideSettings.maxSteps})...` });

    try {
      const startTime = performance.now();
      const result = await RiscvService.runCode(code, ideSettings.maxSteps);
      const endTime = performance.now();

      setSimulationModel(result);
      setGeneratedMem(result.annotatedMem ?? null);
      addConsoleEntry({
        type: "success",
        message: `Compilation finished in ${(endTime - startTime).toFixed(0)}ms. 0 errors.`,
      });

      if (result.hitLimit) {
        addConsoleEntry({
          type: "warn",
          message: `Execution reached limit of ${ideSettings.maxSteps} steps. (Possible infinite loop)`,
        });
      } else {
        addConsoleEntry({
          type: "info",
          message: `Execution completed naturally in ${result.stepsExecuted} steps.`,
        });
      }
    } catch (error) {
      addConsoleEntry({ type: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssemble = async () => {
    setIsLoading(true);
    addConsoleEntry({ type: "info", message: "Assembling ASM to .mem..." });

    try {
      const result = await RiscvService.assemble(code);
      setGeneratedMem(result.annotatedMem);
      setSimulationModel(null);
      setIsDebugging(false);
      setIsBinaryMode(false);
      addConsoleEntry({
        type: "success",
        message: `Assembly generated ${result.mem.trim().split(/\s+/).length} halfwords.`,
      });
    } catch (error) {
      addConsoleEntry({ type: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugStart = async () => {
    setIsLoading(true);
    addConsoleEntry({ type: "info", message: "Iniciando sesion de debug interactivo..." });
    try {
      const result = await RiscvService.startDebugSession(code, ideSettings.maxSteps);
      setSimulationModel(result);
      setGeneratedMem(result.annotatedMem ?? null);
      setIsDebugging(true);
      addConsoleEntry({ type: "success", message: `Sesion de debug iniciada (ID: ${result.sessionId}).` });
    } catch (error) {
      addConsoleEntry({ type: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep = async () => {
    if (!simulationModel?.sessionId) return;
    try {
      const result = await RiscvService.stepSession(simulationModel.sessionId);
      setSimulationModel(result);
      if (result.isFinished) {
        addConsoleEntry({ type: "info", message: `Programa finalizado en el paso ${result.stepsExecuted}.` });
      }
    } catch (error) {
      addConsoleEntry({ type: "error", message: error instanceof Error ? error.message : String(error) });
      setIsDebugging(false);
    }
  };

  const handleStop = async () => {
    if (simulationModel?.sessionId) {
      await RiscvService.stopSession(simulationModel.sessionId);
    }
    setIsDebugging(false);
    addConsoleEntry({ type: "info", message: "Sesion de debug terminada." });
  };

  const handleUploadBin = async (file: File) => {
    setIsLoading(true);
    addConsoleEntry({ type: "info", message: `Cargando archivo de memoria: ${file.name}...` });
    try {
      const text = await file.text();
      setCode(text);
      setGeneratedMem(null);
      setSimulationModel(null);
      setIsBinaryMode(false);
      setIsDebugging(false);
      addConsoleEntry({ type: "success", message: "Archivo .mem cargado en el editor." });
    } catch (error) {
      addConsoleEntry({ type: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (simulationModel?.sessionId) {
      await RiscvService.stopSession(simulationModel.sessionId);
    }
    setSimulationModel(null);
    setGeneratedMem(null);
    setIsDebugging(false);
    setIsBinaryMode(false);
    addConsoleEntry({ type: "info", message: "CPU state reset. Memory and registers cleared." });
  };

  const startColumnResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    column: "registers" | "memory" | "generatedMem"
  ) => {
    event.preventDefault();
    const startX = event.clientX;
    const rowWidth = event.currentTarget.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
    const startRegisterWidth = registerPanelWidth;
    const startMemoryWidth = memoryPanelWidth;
    const startGeneratedMemWidth = generatedMemPanelWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaPercent = ((moveEvent.clientX - startX) / rowWidth) * 100;

      if (column === "registers") {
        const maxRegisterWidth = isMemoryMapDetached ? 48 : 70;
        setRegisterPanelWidth(clamp(startRegisterWidth + deltaPercent, 22, maxRegisterWidth));
      } else if (column === "memory") {
        setMemoryPanelWidth(clamp(startMemoryWidth + deltaPercent, 18, 45));
      } else {
        setGeneratedMemPanelWidth(clamp(startGeneratedMemWidth - deltaPercent, 20, 58));
      }
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  };

  const handleMemoryMapDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("text/plain", MEMORY_MAP_DRAG_TYPE);
    event.dataTransfer.effectAllowed = "move";
  };

  const handlePanelDrop = (event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.getData("text/plain") !== MEMORY_MAP_DRAG_TYPE) return;
    event.preventDefault();
    setIsMemoryMapDetached(true);
    setActiveSidePanel("registers");
  };

  return (
    <>
      <TopNavBar
        isLoading={isLoading}
        simulationModel={simulationModel}
        onRun={handleRun}
        onAssemble={handleAssemble}
        showGeneratedMem={showGeneratedMem}
        onToggleGeneratedMem={() => setShowGeneratedMem((current) => !current)}
        onReset={handleReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDebugging={isDebugging}
        onDebugStart={handleDebugStart}
        onStep={handleStep}
        onStop={handleStop}
        onUploadBin={handleUploadBin}
      />

      <main className="ide-main">
        <div className="ide-workspace">
          <div
            className="ide-panel-row"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handlePanelDrop}
          >
            <section
              className="ide-left-panel"
              style={{ flexBasis: `${registerPanelWidth}%` }}
            >
              <div className="ide-tab-bar">
                <button
                  onClick={() => setActiveSidePanel("registers")}
                  className={`ide-tab ${
                    activeSidePanel === "registers"
                      ? "ide-tab--active"
                      : "ide-tab--inactive"
                  }`}
                >
                  <span className="ide-label">REGISTERS</span>
                </button>
                <button
                  onClick={() => setActiveSidePanel("memoryMap")}
                  draggable
                  onDragStart={handleMemoryMapDragStart}
                  className={`ide-tab ${
                    activeSidePanel === "memoryMap"
                      ? "ide-tab--active"
                      : "ide-tab--inactive"
                  }`}
                  disabled={isMemoryMapDetached}
                  title="Arrastra esta pestana para separarla en otra columna"
                >
                  <span className="ide-label">MEMORY MAP</span>
                </button>
                <button
                  className="ide-tab-action"
                  onClick={() => {
                    setIsMemoryMapDetached((current) => !current);
                    setActiveSidePanel("registers");
                  }}
                  title={isMemoryMapDetached ? "Volver a pestanas" : "Separar Memory Map"}
                >
                  {isMemoryMapDetached ? "JOIN" : "SPLIT"}
                </button>
              </div>

              {isMemoryMapDetached || activeSidePanel === "registers" ? (
                <RegisterPanel
                  simulationModel={simulationModel}
                  displayFormat={ideSettings.displayFormat}
                  showZeroRegisters={ideSettings.showZeroRegisters}
                />
              ) : (
                <MemoryMapPanel simulationModel={simulationModel} />
              )}
            </section>

            <div
              className="ide-resizer"
              role="separator"
              aria-label="Redimensionar panel izquierdo"
              onPointerDown={(event) => startColumnResize(event, "registers")}
            />

            {isMemoryMapDetached && (
              <>
                <section
                  className="ide-detached-panel"
                  style={{ flexBasis: `${memoryPanelWidth}%` }}
                >
                  <div className="ide-detached-header">
                    <span className="ide-label">MEMORY MAP</span>
                    <button
                      className="ide-panel-command"
                      onClick={() => setIsMemoryMapDetached(false)}
                    >
                      Volver
                    </button>
                  </div>
                  <MemoryMapPanel simulationModel={simulationModel} />
                </section>

                <div
                  className="ide-resizer"
                  role="separator"
                  aria-label="Redimensionar mapa de memoria"
                  onPointerDown={(event) => startColumnResize(event, "memory")}
                />
              </>
            )}

            <div className="editor-split">
              <CodeEditor code={code} onChange={setCode} fontSize={ideSettings.fontSize} isBinaryMode={isBinaryMode} />
              {showGeneratedMem && (
                <>
                  <div
                    className="ide-resizer"
                    role="separator"
                    aria-label="Redimensionar .mem generado"
                    onPointerDown={(event) => startColumnResize(event, "generatedMem")}
                  />
                  <div
                    className="generated-mem-shell"
                    style={{ flexBasis: `${generatedMemPanelWidth}%` }}
                  >
                    <GeneratedMemPanel annotatedMem={generatedMem} />
                  </div>
                </>
              )}
            </div>
          </div>

          <ConsolePanel entries={consoleEntries} simulationModel={simulationModel} />
        </div>
      </main>

      <footer className="ide-status-bar">
        <div className="ide-status-group">
          <span className="flex items-center gap-1">
            <span className={`ide-status-dot ${isLoading ? "ide-status-dot--running" : "ide-status-dot--ready"}`} />
            {isLoading ? "Running..." : "Ready"}
          </span>
          <span className="ide-separator">|</span>
          <span>RV32I Toolchain v2.0</span>
          {simulationModel && (
            <>
              <span className="ide-separator">|</span>
              <span className={`ide-status-steps ${simulationModel.hitLimit ? "ide-status-steps--limit" : "ide-status-steps--ok"}`}>
                {simulationModel.stepsExecuted} steps {simulationModel.hitLimit && " (limit)"}
              </span>
            </>
          )}
        </div>
        <div className="ide-footer-links">
          <a className="ide-footer-link" href="#">
            Docs
          </a>
          <a className="ide-footer-link" href="#">
            Report Bug
          </a>
        </div>
      </footer>

      {isSettingsOpen && (
        <SettingsModal
          initialSettings={ideSettings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
}

export default IdePage;
