import { useState } from "react";
import type React from "react";
import { IdeSettings } from "./types";

interface SettingsModalProps {
  initialSettings: IdeSettings;
  onSave: (settings: IdeSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ initialSettings, onSave, onClose }: SettingsModalProps) {
  const [draftSettings, setDraftSettings] = useState<IdeSettings>(initialSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draftSettings);
    onClose();
  };

  return (
    <div className="settings-backdrop">
      <div className="settings-dialog">
        <div className="settings-header">
          <h2 className="settings-title">Configuracion uteclator</h2>
          <button onClick={onClose} className="settings-close">
            <span className="settings-close-icon">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-body">
            <div className="settings-field">
              <label className="ide-section-label">LIMITE DE PASOS DE SIMULACION</label>
              <div className="settings-inline">
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={100}
                  value={draftSettings.maxSteps}
                  onChange={(e) => {
                    const nextValue = Math.min(5000, Math.max(1, parseInt(e.target.value) || 5000));
                    setDraftSettings({ ...draftSettings, maxSteps: nextValue });
                  }}
                  className="settings-number"
                />
                <span className="settings-limit">Max 5000</span>
              </div>
              <p className="settings-help">
                Previene loops infinitos. Si el programa alcanza este limite, se detendra automaticamente.
              </p>
            </div>

            <div className="settings-divider" />

            <div className="settings-field">
              <label className="ide-section-label">FORMATO DE REGISTROS</label>
              <div className="settings-choice-group">
                <label className="settings-choice">
                  <input
                    type="radio"
                    name="displayFormat"
                    value="hex"
                    checked={draftSettings.displayFormat === "hex"}
                    onChange={() => setDraftSettings({ ...draftSettings, displayFormat: "hex" })}
                    className="settings-input-choice"
                  />
                  Hexadecimal
                </label>
                <label className="settings-choice">
                  <input
                    type="radio"
                    name="displayFormat"
                    value="dec"
                    checked={draftSettings.displayFormat === "dec"}
                    onChange={() => setDraftSettings({ ...draftSettings, displayFormat: "dec" })}
                    className="settings-input-choice"
                  />
                  Decimal
                </label>
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-choice">
                <input
                  type="checkbox"
                  checked={draftSettings.showZeroRegisters}
                  onChange={(e) => setDraftSettings({ ...draftSettings, showZeroRegisters: e.target.checked })}
                  className="settings-input-choice"
                />
                Mostrar registros con valor 0 (sin modificar)
              </label>
            </div>

            <div className="settings-divider" />

            <div className="settings-field">
              <label className="ide-section-label">TAMANO DE FUENTE DEL EDITOR</label>
              <select
                value={draftSettings.fontSize}
                onChange={(e) => setDraftSettings({ ...draftSettings, fontSize: e.target.value as "sm" | "md" | "lg" })}
                className="settings-select"
              >
                <option value="sm">Pequeno</option>
                <option value="md">Mediano (Normal)</option>
                <option value="lg">Grande</option>
              </select>
            </div>
          </div>

          <div className="settings-actions">
            <button type="button" onClick={onClose} className="settings-cancel">
              Cancelar
            </button>
            <button type="submit" className="settings-save">
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
