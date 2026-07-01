import { useState } from "react";
import { RiscvModel } from "@/domain/riscv/model";

interface MemoryMapPanelProps {
  simulationModel: RiscvModel | null;
  displayFormat?: "hex" | "dec";
}

const BYTES_PER_ROW = 16;
const PAGE_SIZE = 64;

export function MemoryMapPanel({ simulationModel, displayFormat = "hex" }: MemoryMapPanelProps) {
  const [page, setPage] = useState(0);
  const [view, setView] = useState<"program" | "data">("program");

  if (!simulationModel) {
    return (
      <div className="ide-empty-state">
        <span className="ide-empty-icon">memory</span>
        <p className="ide-empty-text">
          Ejecuta un programa para inspeccionar la memoria
        </p>
      </div>
    );
  }

  const { start: progStart, end: progEnd } = simulationModel.getProgramRange();
  const memory = view === "program" ? simulationModel.programMemory : simulationModel.memory;
  const startAddr = page * PAGE_SIZE * BYTES_PER_ROW;
  const length = PAGE_SIZE * BYTES_PER_ROW;

  const rows = view === "program"
    ? simulationModel.getProgramMemoryRows(startAddr, length, BYTES_PER_ROW)
    : simulationModel.getDataMemoryRows(startAddr, length, BYTES_PER_ROW);
  const totalPages = Math.max(1, Math.ceil(memory.length / (PAGE_SIZE * BYTES_PER_ROW)));
  const memoryWrites = simulationModel.trace
    .slice(0, simulationModel.currentTraceIndex + 1)
    .filter((cycle) => cycle.memoryWrite)
    .map((cycle) => ({
      cycle: cycle.cycle,
      address: parseHex(cycle.memoryWrite!.address),
      value: parseHex(cycle.memoryWrite!.value),
    }));
  const changedByteAddresses = new Set(
    memoryWrites.flatMap((write) => [write.address, write.address + 1, write.address + 2, write.address + 3])
  );
  const lastWrite = memoryWrites.at(-1);

  const isInProgram = (addr: number) => addr >= progStart && addr < progEnd;

  return (
    <div className="memory-panel">
      <div className="memory-toolbar">
        <div className="memory-toolbar-group">
          <span className="ide-section-label">
            {view === "program" ? "IMEM PROGRAMA" : `${simulationModel.memory.length / 1024} KB DMEM DATOS`}
          </span>
          <span className="memory-range">
            .text: 0x{progStart.toString(16).padStart(8, "0").toUpperCase()}-0x{progEnd.toString(16).padStart(8, "0").toUpperCase()}
          </span>
          {view === "data" && lastWrite && (
            <span className="memory-range">
              store[{lastWrite.cycle}]: {displayFormat === "hex"
                ? `0x${lastWrite.address.toString(16).padStart(8, "0").toUpperCase()} = 0x${lastWrite.value.toString(16).padStart(8, "0").toUpperCase()}`
                : `addr ${lastWrite.address} = ${lastWrite.value >>> 0}`}
            </span>
          )}
        </div>
        <div className="memory-view-toggle">
          <button
            className={`memory-view-button ${view === "program" ? "memory-view-button--active" : ""}`}
            onClick={() => {
              setView("program");
              setPage(0);
            }}
          >
            IMEM
          </button>
          <button
            className={`memory-view-button ${view === "data" ? "memory-view-button--active" : ""}`}
            onClick={() => {
              setView("data");
              setPage(0);
            }}
          >
            DMEM
          </button>
        </div>
      </div>

      <div className="memory-table-scroll">
        <table className="memory-table">
          <thead>
            <tr className="memory-table-head">
              <th className="memory-address-head">ADDRESS</th>
              {Array.from({ length: BYTES_PER_ROW }, (_, i) => (
                <th key={i} className="memory-byte-head">
                  {i.toString(16).toUpperCase().padStart(2, "0")}
                </th>
              ))}
              <th className="memory-ascii-head">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ address, bytes, ascii }) => {
              const inProg = isInProgram(address);
              return (
                <tr
                  key={address}
                  className={`memory-row ${inProg ? "memory-row--program" : ""}`}
                >
                  <td className="memory-address-cell">
                    0x{address.toString(16).padStart(8, "0").toUpperCase()}
                  </td>

                  {bytes.map((byte, j) => {
                    const byteAddr = address + j;
                    const isCode = byteAddr >= progStart && byteAddr < progEnd;
                    const changed = view === "data" && changedByteAddresses.has(byteAddr);
                    return (
                      <td
                        key={j}
                        className={`memory-byte-cell ${
                          changed
                            ? "memory-byte-cell--changed"
                            : byte === 0
                            ? "memory-byte-cell--zero"
                            : isCode
                            ? "memory-byte-cell--code"
                            : "memory-byte-cell--data"
                        }`}
                      >
                        {displayFormat === "hex"
                          ? byte.toString(16).toUpperCase().padStart(2, "0")
                          : byte.toString(10).padStart(3, " ")}
                      </td>
                    );
                  })}

                  <td className="memory-ascii-cell">
                    {ascii}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="memory-pagination">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="memory-page-button"
        >
          <span className="memory-page-icon">chevron_left</span>
          Anterior
        </button>
        <span className="memory-page-label">
          {view.toUpperCase()} - Pagina {page + 1} / {totalPages} - 0x{(page * PAGE_SIZE * BYTES_PER_ROW).toString(16).toUpperCase().padStart(6, "0")}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="memory-page-button"
        >
          Siguiente
          <span className="memory-page-icon">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

function parseHex(value: string) {
  const cleaned = value.replace(/^0x/i, "");
  if (!cleaned || cleaned.includes("x") || cleaned.includes("z")) {
    return 0;
  }
  return Number.parseInt(cleaned, 16) >>> 0;
}
