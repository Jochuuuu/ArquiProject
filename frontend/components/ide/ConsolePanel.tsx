import { useEffect, useRef, useState } from "react";
import { RiscvModel } from "@/domain/riscv/model";
import { WaveformPanel } from "./WaveformPanel";
import { LogEntry } from "./types";

interface ConsolePanelProps {
  entries: LogEntry[];
  simulationModel: RiscvModel | null;
}

const LOG_TYPE_CLASS: Record<LogEntry["type"], string> = {
  success: "console-log-type--success",
  error: "console-log-type--error",
  info: "console-log-type--info",
  warn: "console-log-type--warn",
};

const LOG_ROW_CLASS: Record<LogEntry["type"], string> = {
  success: "",
  error: "console-log--error",
  info: "",
  warn: "console-log--warn",
};

export function ConsolePanel({ entries, simulationModel }: ConsolePanelProps) {
  const [isWaveformOpen, setIsWaveformOpen] = useState(false);
  const [isWaveformMaximized, setIsWaveformMaximized] = useState(false);
  const [isWaveformMinimized, setIsWaveformMinimized] = useState(false);
  const [hasWaveformRendered, setHasWaveformRendered] = useState(false);
  const previousWaveformKey = useRef<string | null>(null);
  const waveformKey = simulationModel?.waveformUrl ?? simulationModel?.simulationId ?? null;

  useEffect(() => {
    if (!waveformKey) {
      previousWaveformKey.current = null;
      setIsWaveformOpen(false);
      setIsWaveformMinimized(false);
      setIsWaveformMaximized(false);
      setHasWaveformRendered(false);
      return;
    }

    if (previousWaveformKey.current !== waveformKey) {
      previousWaveformKey.current = waveformKey;
      setIsWaveformOpen(true);
      setIsWaveformMinimized(true);
      setIsWaveformMaximized(false);
      setHasWaveformRendered(false);
    }
  }, [waveformKey]);

  const openWaveform = () => {
    setIsWaveformOpen(true);
    setIsWaveformMinimized(false);
    setHasWaveformRendered(true);
  };

  const closeWaveform = () => {
    setIsWaveformOpen(false);
    setIsWaveformMinimized(false);
    setIsWaveformMaximized(false);
    setHasWaveformRendered(false);
  };

  return (
    <>
      <section className="console-panel">
        <div className="console-header">
          <div className="console-tabs">
            <button
              className="console-tab console-tab--active"
            >
              MESSAGES
            </button>
            <button className="console-tab console-tab--disabled" disabled>PROBLEMS</button>
          </div>
          <span className="console-count">
            {entries.length} message{entries.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="console-body">
          {entries.map((entry, i) => (
            <div key={i} className={`console-log ${LOG_ROW_CLASS[entry.type]}`}>
              <span className={`console-log-type ${LOG_TYPE_CLASS[entry.type]}`}>
                [{entry.type.toUpperCase()}]
              </span>
              <span className={entry.type === "error" ? "console-log-message--error" : "console-log-message"}>
                {entry.message}
              </span>
              {entry.timestamp && (
                <span className="console-timestamp">{entry.timestamp}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {isWaveformOpen && hasWaveformRendered && (
        <div
          className={`waveform-modal-backdrop ${isWaveformMinimized ? "waveform-modal-backdrop--hidden" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-hidden={isWaveformMinimized}
        >
          <div className={`waveform-modal ${isWaveformMaximized ? "waveform-modal--maximized" : ""}`}>
            <div className="waveform-modal-header">
              <div className="waveform-modal-title-group">
                <span className="waveform-modal-icon">monitoring</span>
                <span className="waveform-modal-title">riscv_pipe.vcd</span>
                <span className="waveform-modal-subtitle">
                  {simulationModel?.trace.length ?? 0} cycles
                </span>
              </div>

              <div className="waveform-modal-actions">
                <button
                  className="waveform-window-button"
                  onClick={() => setIsWaveformMinimized(true)}
                  aria-label="Minimizar waveform"
                  title="Minimizar"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <button
                  className="waveform-window-button"
                  onClick={() => setIsWaveformMaximized((value) => !value)}
                  aria-label={isWaveformMaximized ? "Restaurar waveform" : "Maximizar waveform"}
                  title={isWaveformMaximized ? "Restaurar" : "Maximizar"}
                >
                  <span className="material-symbols-outlined">
                    {isWaveformMaximized ? "filter_none" : "crop_square"}
                  </span>
                </button>
                <button
                  className="waveform-close-button"
                  onClick={closeWaveform}
                  aria-label="Cerrar waveform"
                  title="Cerrar"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="waveform-modal-body">
              <WaveformPanel simulationModel={simulationModel} showToolbar={false} />
            </div>
          </div>
        </div>
      )}

      {isWaveformOpen && isWaveformMinimized && (
        <button className="waveform-minimized-bar" onClick={openWaveform}>
          <span className="material-symbols-outlined">monitoring</span>
          riscv_pipe.vcd
        </button>
      )}
    </>
  );
}
