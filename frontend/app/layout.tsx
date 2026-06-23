import type { Metadata } from "next";
import "../globals.css";
import "../styles/home.css";
import "../styles/ide.css";
import "../styles/waveform.css";

export const metadata: Metadata = {
  title: "uteclator",
  description: "RISC-V pipeline simulator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
