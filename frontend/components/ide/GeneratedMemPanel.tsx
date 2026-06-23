interface GeneratedMemPanelProps {
  annotatedMem: string | null;
}

export function GeneratedMemPanel({ annotatedMem }: GeneratedMemPanelProps) {
  const lines = annotatedMem?.trimEnd().split("\n") ?? [];

  return (
    <section className="generated-mem-panel">
      <div className="generated-mem-header">
        <div className="editor-file-label">
          <span className="editor-file-icon">memory</span>
          <span className="editor-file-name">GENERATED.MEM</span>
        </div>
        <span className="editor-line-count">{lines.length} lines</span>
      </div>

      {lines.length === 0 ? (
        <div className="generated-mem-empty">
          <span className="generated-mem-empty-icon">data_object</span>
          <p className="generated-mem-empty-text">
            Ensambla ASM para ver el .mem generado
          </p>
        </div>
      ) : (
        <div className="generated-mem-body">
          {lines.map((line, index) => {
            const [hex, comment] = line.split(/\s+\/\/\s+/);
            return (
              <div key={`${index}-${line}`} className="generated-mem-line">
                <span className="generated-mem-line-number">
                  {index + 1}
                </span>
                <span className="generated-mem-hex">{hex}</span>
                {comment && (
                  <span className="generated-mem-comment">
                    // {comment}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
