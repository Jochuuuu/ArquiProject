import { useEffect, useState, type CSSProperties } from "react";
import { RiscvModel } from "@/domain/riscv/model";
import { TraceCycle } from "@/domain/riscv/type";

interface WaveformPanelProps {
  simulationModel: RiscvModel | null;
  showToolbar?: boolean;
}

type SignalRow = {
  name: string;
  label?: string;
  values: string[];
  kind?: "bit" | "bus";
};

const MAX_VISIBLE_CYCLES = 80;
const SIGNAL_STORAGE_KEY = "uteclator.waveform.enabledSignals";
const COLUMN_WIDTH_STORAGE_KEY = "uteclator.waveform.columnWidth";
const ROW_HEIGHT_STORAGE_KEY = "uteclator.waveform.rowHeight";
const DEFAULT_COLUMN_WIDTH_REM = 2.75;
const MIN_COLUMN_WIDTH_REM = 1.75;
const MAX_COLUMN_WIDTH_REM = 7;
const COLUMN_WIDTH_STEP_REM = 0.5;
const DEFAULT_ROW_HEIGHT_REM = 1.75;
const MIN_ROW_HEIGHT_REM = 1.25;
const MAX_ROW_HEIGHT_REM = 3;
const ROW_HEIGHT_STEP_REM = 0.25;
const DEFAULT_SIGNAL_LABELS = new Set([
  "PCF [31:0]",
  "RawInstrF [31:0]",
  "InstrF [31:0]",
  "InstrD [31:0]",
  "InstrE [31:0]",
  "InstrM [31:0]",
  "InstrW [31:0]",
  "IsCompressedF",
  "StallF",
  "StallD",
  "FlushD",
  "FlushE",
  "ForwardAE [1:0]",
  "ForwardBE [1:0]",
  "RegWriteW",
  "RdW [4:0]",
  "ResultW [31:0]",
  "MemWrite",
  "DataAdr [31:0]",
  "WriteData [31:0]",
]);

export function WaveformPanel({ simulationModel, showToolbar = true }: WaveformPanelProps) {
  const [enabledSignals, setEnabledSignals] = useState<string[] | null>(null);
  const [columnWidthRem, setColumnWidthRem] = useState(DEFAULT_COLUMN_WIDTH_REM);
  const [rowHeightRem, setRowHeightRem] = useState(DEFAULT_ROW_HEIGHT_REM);
  const [vcdRows, setVcdRows] = useState<SignalRow[] | null>(null);
  const [isLoadingVcd, setIsLoadingVcd] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIGNAL_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        setEnabledSignals(parsed.length > 0 ? parsed : null);
      }
    } catch {
      window.localStorage.removeItem(SIGNAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY));
    if (Number.isFinite(saved)) {
      setColumnWidthRem(clampColumnWidth(saved));
    }
  }, []);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(ROW_HEIGHT_STORAGE_KEY));
    if (Number.isFinite(saved)) {
      setRowHeightRem(clampRowHeight(saved));
    }
  }, []);

  useEffect(() => {
    if (!simulationModel?.waveformUrl) {
      setVcdRows(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingVcd(true);
    fetch(simulationModel.waveformUrl)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error("VCD not available"))))
      .then((text) => {
        if (!isCancelled) {
          setVcdRows(parseVcdSignals(text));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setVcdRows(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingVcd(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [simulationModel?.waveformUrl]);

  if (!simulationModel || simulationModel.trace.length === 0) {
    return (
      <div className="waveform-empty">
        <span className="waveform-empty-icon">timeline</span>
        <p className="waveform-empty-text">
          Ejecuta o depura un programa para ver señales
        </p>
      </div>
    );
  }

  const visibleTrace = simulationModel.trace.slice(0, MAX_VISIBLE_CYCLES);
  const rows = vcdRows?.length ? vcdRows : buildSignalRows(visibleTrace);
  const defaultSignals = getDefaultSignalNames(rows);
  const storedActiveSignals = enabledSignals?.filter((signal) => rows.some((row) => row.name === signal)) ?? [];
  const activeSignals = storedActiveSignals.length > 0 ? storedActiveSignals : defaultSignals;
  const visibleRows = rows.filter((row) => activeSignals.includes(row.name));
  const enabledSignalSet = new Set(activeSignals);
  const cycleCount = Math.max(...rows.map((row) => row.values.length), visibleTrace.length, 1);
  const cycleLabels = Array.from({ length: Math.min(cycleCount, MAX_VISIBLE_CYCLES) }, (_, index) => index + 1);

  const toggleSignal = (name: string) => {
    setEnabledSignals((current) => {
      const base = current ?? rows.map((row) => row.name);
      const next = base.includes(name)
        ? base.filter((signal) => signal !== name)
        : [...base, name];
      const safeNext = next.length > 0 ? next : [name];
      window.localStorage.setItem(SIGNAL_STORAGE_KEY, JSON.stringify(safeNext));
      return safeNext;
    });
  };

  const selectAllSignals = () => {
    const next = rows.map((row) => row.name);
    setEnabledSignals(next);
    window.localStorage.setItem(SIGNAL_STORAGE_KEY, JSON.stringify(next));
  };

  const resetSignals = () => {
    setEnabledSignals(defaultSignals);
    window.localStorage.setItem(SIGNAL_STORAGE_KEY, JSON.stringify(defaultSignals));
  };

  const changeColumnWidth = (delta: number) => {
    setColumnWidthRem((current) => {
      const next = clampColumnWidth(current + delta);
      window.localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, String(next));
      return next;
    });
  };

  const changeRowHeight = (delta: number) => {
    setRowHeightRem((current) => {
      const next = clampRowHeight(current + delta);
      window.localStorage.setItem(ROW_HEIGHT_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="waveform-panel">
      {showToolbar && (
        <div className="waveform-toolbar">
          <span className="waveform-title">
            {visibleTrace.length} cycles
          </span>
          {simulationModel.waveformUrl && (
            <a
              className="waveform-download"
              href={simulationModel.waveformUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download VCD
            </a>
          )}
        </div>
      )}

      <div className="waveform-content">
        <aside className="waveform-signal-picker">
          <div className="waveform-signal-picker-header">
            <span>Signals</span>
            <span>{visibleRows.length}/{rows.length}</span>
          </div>
          <div className="waveform-signal-picker-actions">
            <button onClick={selectAllSignals}>All</button>
            <button onClick={resetSignals}>Default</button>
          </div>
          <div className="waveform-zoom-controls">
            <button
              onClick={() => changeColumnWidth(-COLUMN_WIDTH_STEP_REM)}
              disabled={columnWidthRem <= MIN_COLUMN_WIDTH_REM}
              title="Reducir ancho de columnas"
            >
              -
            </button>
            <span>W {columnWidthRem.toFixed(2)}rem</span>
            <button
              onClick={() => changeColumnWidth(COLUMN_WIDTH_STEP_REM)}
              disabled={columnWidthRem >= MAX_COLUMN_WIDTH_REM}
              title="Aumentar ancho de columnas"
            >
              +
            </button>
          </div>
          <div className="waveform-zoom-controls">
            <button
              onClick={() => changeRowHeight(-ROW_HEIGHT_STEP_REM)}
              disabled={rowHeightRem <= MIN_ROW_HEIGHT_REM}
              title="Reducir alto de filas"
            >
              -
            </button>
            <span>H {rowHeightRem.toFixed(2)}rem</span>
            <button
              onClick={() => changeRowHeight(ROW_HEIGHT_STEP_REM)}
              disabled={rowHeightRem >= MAX_ROW_HEIGHT_REM}
              title="Aumentar alto de filas"
            >
              +
            </button>
          </div>
          <div className="waveform-signal-picker-list">
            {isLoadingVcd && (
              <div className="waveform-signal-loading">Loading VCD...</div>
            )}
            {rows.map((row) => (
              <label key={row.name} className="waveform-signal-option">
                <input
                  type="checkbox"
                  checked={enabledSignalSet.has(row.name)}
                  onChange={() => toggleSignal(row.name)}
                />
                <span>{row.label ?? row.name}</span>
              </label>
            ))}
          </div>
        </aside>

        <div className="waveform-scroll">
          <div
            className="waveform-grid"
            style={{
              "--waveform-cycles": cycleLabels.length,
              "--waveform-column-width": `${columnWidthRem}rem`,
              "--waveform-row-height": `${rowHeightRem}rem`,
            } as CSSProperties}
          >
            <div className="waveform-corner">SIGNAL</div>
            {cycleLabels.map((cycle) => (
              <div key={cycle} className="waveform-cycle-head">
                {cycle}
              </div>
            ))}

            {visibleRows.map((row) => (
              <SignalWaveRow key={row.name} row={row} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalWaveRow({ row }: { row: SignalRow }) {
  const runLabelIndexes = getRunLabelIndexes(row.values);

  return (
    <>
      <div className="waveform-signal-name" title={row.name}>{row.label ?? row.name}</div>
      {row.values.map((value, index) => (
        <div
          key={`${row.name}-${index}`}
          className={`waveform-cell ${cellRunClass(row.values, index)} ${
            row.kind === "bit" ? `waveform-cell--bit ${bitClass(value)}` : busClass(value)
          }`}
          title={`${row.name} = ${value}`}
        >
          {runLabelIndexes.has(index) ? (row.kind === "bit" ? bitLabel(value) : formatWaveValue(value)) : ""}
        </div>
      ))}
    </>
  );
}

function getRunLabelIndexes(values: string[]) {
  const indexes = new Set<number>();
  let start = 0;

  while (start < values.length) {
    let end = start;
    while (end + 1 < values.length && values[end + 1] === values[start]) {
      end += 1;
    }

    indexes.add(Math.floor((start + end) / 2));
    start = end + 1;
  }

  return indexes;
}

function cellRunClass(values: string[], index: number) {
  const previousSame = index > 0 && values[index - 1] === values[index];
  const nextSame = index + 1 < values.length && values[index + 1] === values[index];

  return [
    previousSame ? "waveform-cell--same-prev" : "waveform-cell--changed",
    nextSame ? "waveform-cell--same-next" : "",
  ].join(" ");
}

function buildSignalRows(trace: TraceCycle[]): SignalRow[] {
  return [
    bus("PCF", trace.map((cycle) => cycle.pc)),
    bus("rawInstrF", trace.map((cycle) => cycle.rawInstrF)),
    bus("instrF", trace.map((cycle) => cycle.instrF)),
    bus("instrD", trace.map((cycle) => cycle.instrD)),
    bus("instrE", trace.map((cycle) => cycle.instrE)),
    bus("instrM", trace.map((cycle) => cycle.instrM)),
    bus("instrW", trace.map((cycle) => cycle.instrW)),
    bit("stallF", trace.map((cycle) => boolValue(cycle.stallF))),
    bit("stallD", trace.map((cycle) => boolValue(cycle.stallD))),
    bit("flushD", trace.map((cycle) => boolValue(cycle.flushD))),
    bit("flushE", trace.map((cycle) => boolValue(cycle.flushE))),
    bus("forwardAE", trace.map((cycle) => cycle.forwardAE)),
    bus("forwardBE", trace.map((cycle) => cycle.forwardBE)),
    bit("regWriteW", trace.map((cycle) => boolValue(cycle.regWriteW))),
    bus("rdW", trace.map((cycle) => String(cycle.rdW ?? 0))),
    bus("resultW", trace.map((cycle) => cycle.resultW)),
    bit("memWrite", trace.map((cycle) => boolValue(cycle.memWrite))),
    bus("dataAdr", trace.map((cycle) => cycle.dataAdr)),
    bus("writeData", trace.map((cycle) => cycle.writeData)),
  ];
}

function parseVcdSignals(vcd: string): SignalRow[] {
  const lines = vcd.split(/\r?\n/);
  const scopes: string[] = [];
  const signals = new Map<string, { name: string; width: number }>();
  const valuesById = new Map<string, string[]>();
  const currentValues = new Map<string, string>();
  let inDefinitions = true;
  let samples = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (inDefinitions) {
      const scopeMatch = line.match(/^\$scope\s+\S+\s+(\S+)\s+\$end$/);
      if (scopeMatch) {
        scopes.push(scopeMatch[1]);
        continue;
      }

      if (line.startsWith("$upscope")) {
        scopes.pop();
        continue;
      }

      const varMatch = line.match(/^\$var\s+\S+\s+(\d+)\s+(\S+)\s+(.+?)\s+\$end$/);
      if (varMatch) {
        const [, widthText, id, rawName] = varMatch;
        const normalizedName = rawName.replace(/\s+/g, " ");
        const scopedName = [...scopes, normalizedName].join(".");
        signals.set(id, {
          name: scopedName,
          width: Number(widthText),
        });
        currentValues.set(id, unknownValue(Number(widthText)));
        valuesById.set(id, []);
        continue;
      }

      if (line.startsWith("$enddefinitions")) {
        inDefinitions = false;
      }
      continue;
    }

    if (line.startsWith("#")) {
      if (samples >= MAX_VISIBLE_CYCLES) {
        break;
      }

      for (const [id, signal] of signals) {
        valuesById.get(id)?.push(formatVcdValue(currentValues.get(id), signal.width));
      }
      samples += 1;
      continue;
    }

    const scalarMatch = line.match(/^([01xXzZ])(.+)$/);
    if (scalarMatch) {
      const [, value, id] = scalarMatch;
      if (signals.has(id)) {
        currentValues.set(id, value.toLowerCase());
      }
      continue;
    }

    const vectorMatch = line.match(/^b([01xXzZ]+)\s+(.+)$/);
    if (vectorMatch) {
      const [, value, id] = vectorMatch;
      if (signals.has(id)) {
        currentValues.set(id, value.toLowerCase());
      }
    }
  }

  return Array.from(signals.entries()).map(([id, signal]) => ({
    name: signal.name,
    label: shortSignalName(signal.name),
    kind: signal.width === 1 ? "bit" : "bus",
    values: valuesById.get(id) ?? [],
  }));
}

function shortSignalName(name: string) {
  return name
    .replace(/^testbench\.dut\.rvcore\./, "")
    .replace(/^testbench\.dut\./, "")
    .replace(/^testbench\./, "");
}

function clampColumnWidth(value: number) {
  return Math.min(MAX_COLUMN_WIDTH_REM, Math.max(MIN_COLUMN_WIDTH_REM, value));
}

function clampRowHeight(value: number) {
  return Math.min(MAX_ROW_HEIGHT_REM, Math.max(MIN_ROW_HEIGHT_REM, value));
}

function getDefaultSignalNames(rows: SignalRow[]) {
  const defaults = rows
    .filter((row) => DEFAULT_SIGNAL_LABELS.has(row.label ?? row.name))
    .map((row) => row.name);

  return defaults.length > 0 ? defaults : rows.slice(0, 20).map((row) => row.name);
}

function unknownValue(width: number) {
  return "x".repeat(Math.max(width, 1));
}

function formatVcdValue(value: string | undefined, width: number) {
  const safeValue = value || unknownValue(width);
  if (width === 1) {
    return safeValue[0] ?? "x";
  }

  if (/[xz]/i.test(safeValue)) {
    return `0x${safeValue}`;
  }

  return `0x${Number.parseInt(safeValue, 2).toString(16)}`;
}

function bit(name: string, values: string[]): SignalRow {
  return { name, values, kind: "bit" };
}

function bus(name: string, values: string[]): SignalRow {
  return { name, values, kind: "bus" };
}

function boolValue(value: boolean) {
  return value ? "1" : "0";
}

function formatWaveValue(value: string) {
  if (!value) {
    return "";
  }

  if (/^0x[0-9a-fA-F]+$/i.test(value)) {
    const compactHex = value.replace(/^0x/i, "").replace(/^0+(?=[0-9a-fA-F])/, "") || "0";
    return `0x${compactHex}`;
  }

  if (/^0x[0-9a-fA-FxX]+$/i.test(value)) {
    return value.replace(/^0x/i, "0x").replace(/^0x0+(?=[0-9a-fA-FxX])/, "0x");
  }

  if (/^0[xX]+$/.test(value) || hasUnknownDigits(value)) {
    return "x";
  }

  return value;
}

function bitClass(value: string) {
  if (value === "1") {
    return "waveform-cell--high";
  }

  if (value === "0") {
    return "waveform-cell--low";
  }

  return "waveform-cell--unknown";
}

function busClass(value: string) {
  return hasUnknownDigits(value)
    ? "waveform-cell--bus waveform-cell--unknown"
    : "waveform-cell--bus";
}

function hasUnknownDigits(value: string) {
  const payload = value.replace(/^0x/i, "");
  return /[xz]/i.test(payload);
}

function bitLabel(value: string) {
  return value === "1" || value === "0" ? value : "x";
}
