"use client";

import IdePage from "./IdePage";

interface HomePageProps {
  onLaunchIde: () => void;
}

export default function HomePage({ onLaunchIde }: HomePageProps) {
  return (
    <main className="home-shell">
      <div className="home-preview">
        <IdePage />
      </div>
      <div className="home-overlay" />

      <section className="home-card">
        <div className="home-intro">
          <h1 className="home-title">uteclator Computer System Simulator</h1>
          <p className="home-description">
            uteclator es un simulador RISC-V RV32I y depurador que corre en el navegador.
            Esta pensado para practicar ensamblador, registros, memoria y organizacion de computadores.
          </p>
          <p className="home-description">
            Para comenzar, elige el sistema disponible y abre el IDE.
          </p>
        </div>

        <div className="home-system-box">
          <h2 className="home-box-title">Choose a system to simulate</h2>

          <div className="home-selector-grid">
            <label className="home-selector">
              <span className="home-selector-title">Architecture</span>
              <select className="home-select" value="riscv" onChange={() => undefined}>
                <option value="riscv">RISC-V</option>
              </select>
            </label>

            <label className="home-selector">
              <span className="home-selector-title">System</span>
              <select className="home-select" value="rv32i" onChange={() => undefined}>
                <option value="rv32i">RISC-V RV32I</option>
              </select>
            </label>
          </div>

          <div className="home-launch-row">
            <button type="button" onClick={onLaunchIde} className="home-open-button">
              Abrir IDE
            </button>
          </div>

          <div className="home-system-summary">
            <h3 className="home-summary-title">RISC-V RV32I</h3>
            <p className="home-summary-text">
              Sistema con 32 registros, memoria virtual y herramientas para compilar,
              ejecutar y depurar codigo ensamblador.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
