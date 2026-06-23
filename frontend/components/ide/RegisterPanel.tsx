import { RiscvModel, ABI_NAMES } from "@/domain/riscv/model";

interface RegisterPanelProps {
  simulationModel: RiscvModel | null;
  displayFormat: "hex" | "dec";
  showZeroRegisters: boolean;
}

export function RegisterPanel({ simulationModel, displayFormat, showZeroRegisters }: RegisterPanelProps) {
  const pcValue = simulationModel
    ? displayFormat === "hex"
      ? simulationModel.getPcHex()
      : String(simulationModel.pc >>> 0)
    : displayFormat === "hex"
    ? "0x00000000"
    : "0";
  const pcChanged = (simulationModel?.pc ?? 0) !== 0;

  const getValue = (i: number) => {
    if (!simulationModel) return displayFormat === "hex" ? "0x00000000" : "0";
    return displayFormat === "hex" ? simulationModel.getHexValue(i) : simulationModel.getDecValue(i);
  };

  const isChanged = (i: number) => simulationModel?.isChanged(i) ?? false;

  const rows = ABI_NAMES.map((name, i) => ({ name, i })).filter(
    ({ i }) => showZeroRegisters || isChanged(i) || i === 0
  );

  return (
    <div className="register-panel">
      <div className="register-header">
        <span className="ide-section-label">
          {rows.length === 32 ? "32 REGISTROS" : `${rows.length} MODIFICADOS`}
        </span>
        <span className="register-format">
          {displayFormat.toUpperCase()}
        </span>
      </div>

      <div className="register-grid">
        <div className="register-grid-heading">REG</div>
        <div className="register-grid-heading">VALUE ({displayFormat.toUpperCase()})</div>

        <div className="contents">
          <div
            className={`register-row-name ${
              pcChanged ? "register-row-name--changed" : "register-row-name--idle"
            }`}
          >
            pc <span className="register-alias">(program counter)</span>
          </div>
          <div
            className={`register-row-value ${
              pcChanged ? "register-row-value--changed" : "register-row-value--idle"
            }`}
          >
            {pcValue}
          </div>
        </div>

        {rows.map(({ name, i }) => {
          const changed = isChanged(i);
          return (
            <div key={i} className="contents">
              <div
                className={`register-row-name ${
                  changed ? "register-row-name--changed" : "register-row-name--idle"
                }`}
              >
                x{i}{" "}
                <span className="register-alias">({name})</span>
              </div>
              <div
                className={`register-row-value ${
                  changed
                    ? "register-row-value--changed"
                    : "register-row-value--idle"
                }`}
              >
                {getValue(i)}
              </div>
            </div>
          );
        })}
      </div>

      {!simulationModel && (
        <p className="ide-empty-text mt-6 text-center">
          Ejecuta un programa para ver los registros
        </p>
      )}
    </div>
  );
}
