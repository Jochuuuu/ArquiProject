import React from "react";
import { RiscvModel } from "@/domain/riscv/model";

interface TopNavBarProps {
  isLoading: boolean;
  simulationModel: RiscvModel | null;
  onRun: () => void;
  onAssemble: () => void;
  showGeneratedMem: boolean;
  onToggleGeneratedMem: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
  isDebugging: boolean;
  onDebugStart: () => void;
  onStep: () => void;
  onStop: () => void;
  onUploadBin: (file: File) => void;
}

export function TopNavBar({
  isLoading,
  simulationModel,
  onRun,
  onAssemble,
  showGeneratedMem,
  onToggleGeneratedMem,
  onReset,
  onOpenSettings,
  isDebugging,
  onDebugStart,
  onStep,
  onStop,
  onUploadBin,
}: TopNavBarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onUploadBin(e.target.files[0]);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-actions">
        <span className="topbar-status">
          {simulationModel?.isFinished ? "Stopped" : isLoading ? "Running" : "Stopped"}
        </span>

        <button
          onClick={isDebugging ? onStep : onDebugStart}
          disabled={isLoading || (simulationModel?.isFinished && isDebugging)}
          className="topbar-button"
          title={isDebugging ? "Paso a paso (Step)" : "Start Debug Session"}
        >
          <span className="material-symbols-outlined">step_into</span>
          <span>{isDebugging ? "Step Into" : "Debug"}</span>
        </button>

        <button
          id="btn-run"
          onClick={onRun}
          disabled={isLoading}
          className="topbar-button"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isLoading ? "hourglass_empty" : "play_arrow"}
          </span>
          <span>{isLoading ? "Running..." : "Compile and Run"}</span>
        </button>

        <button
          onClick={onAssemble}
          disabled={isLoading}
          className="topbar-button"
          title="Convertir ASM a .mem"
        >
          <span className="material-symbols-outlined">terminal</span>
          <span>Assemble</span>
        </button>

        <button
          onClick={onToggleGeneratedMem}
          className={`topbar-button ${showGeneratedMem ? "topbar-button--active" : ""}`}
          title={showGeneratedMem ? "Ocultar .mem generado" : "Mostrar .mem generado"}
        >
          <span className="material-symbols-outlined">
            {showGeneratedMem ? "visibility" : "visibility_off"}
          </span>
          <span>{showGeneratedMem ? "Hide MEM" : "Show MEM"}</span>
        </button>

        <button
          onClick={onStop}
          disabled={!isDebugging}
          className="topbar-button"
          title="Terminar sesion de debug"
        >
          <span className="material-symbols-outlined">stop</span>
          <span>Stop</span>
        </button>

        <button onClick={onReset} className="topbar-button" title="Resetear estado">
          <span className="material-symbols-outlined">replay</span>
          <span>Restart</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="topbar-menu-button"
        >
          <span>File</span>
          <span className="material-symbols-outlined">expand_more</span>
        </button>
        <input
          type="file"
          accept=".mem,.txt"
          className="topbar-file-input"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <button
          onClick={onOpenSettings}
          className="topbar-menu-button"
        >
          <span>Configuracion</span>
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>

      <div className="topbar-brand-group">
        <a href="/" className="topbar-brand">
          uteclator
        </a>
      </div>
    </header>
  );
}
