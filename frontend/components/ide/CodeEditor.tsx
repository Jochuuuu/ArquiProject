import type React from "react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  fontSize?: "sm" | "md" | "lg";
  isBinaryMode?: boolean;
}

const FONT_SIZE_MAP = {
  sm: { text: "11px", lineH: "20px" },
  md: { text: "13px", lineH: "24px" },
  lg: { text: "15px", lineH: "28px" },
};

export function CodeEditor({ code, onChange, fontSize = "md", isBinaryMode = false }: CodeEditorProps) {
  const lines = code.split("\n");
  const { text, lineH } = FONT_SIZE_MAP[fontSize];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Insertar 2 espacios
      const tabStr = "  ";
      const newCode = code.substring(0, start) + tabStr + code.substring(end);
      onChange(newCode);

      // Restaurar la posición del cursor después de que React actualice el valor
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + tabStr.length;
      }, 0);
    }
  };

  return (
    <section className="editor-panel">
      <div className="editor-tabbar">
        <div className="editor-file-label">
          <span className="editor-file-icon">description</span>
          <span className="editor-file-name">PROGRAM.MEM</span>
        </div>
        <span className="editor-line-count">{lines.length} lines</span>
      </div>

      <div
        className="editor-body"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: text }}
      >
        <div
          className="editor-line-numbers"
          style={{ lineHeight: lineH }}
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {isBinaryMode ? (
          <div className="editor-binary-state">
            <span className="editor-binary-icon">memory</span>
            <p className="editor-binary-text">
              Archivo binario cargado en memoria.
              <br/>
              <span className="editor-binary-hint">Haz clic en Reset para volver al editor de texto.</span>
            </p>
          </div>
        ) : (
          <textarea
            value={code}
            onChange={(e) => onChange(e.target.value)}
            className="editor-textarea"
            style={{ lineHeight: lineH, fontSize: text }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            wrap="off"
            onKeyDown={handleKeyDown}
            aria-label="RISC-V memory file editor"
          />
        )}
      </div>
    </section>
  );
}
