// Settings compartidos por toda la sesión del IDE
export interface IdeSettings {
  maxSteps: number;           // 1–100_000
  displayFormat: "hex" | "dec"; // formato de registros
  showZeroRegisters: boolean; // mostrar registros con valor 0
  fontSize: "sm" | "md" | "lg";
}

export const DEFAULT_SETTINGS: IdeSettings = {
  maxSteps: 5000,
  displayFormat: "hex",
  showZeroRegisters: true,
  fontSize: "md",
};

// Tipo del log de la consola
export type LogEntry = {
  type: "success" | "error" | "info" | "warn";
  message: string;
  timestamp?: string;
};
