import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Nunito } from "next/font/google";
import { ProgressSync } from "@/components/ProgressSync";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const body = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Mates 1.º ESO · Juegos de Matemáticas",
  description: "Aprende Matemáticas jugando: divisibilidad, divisores y números primos.",
};

export const viewport: Viewport = { themeColor: "#1b1233", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>
        <ProgressSync />
        {children}
      </body>
    </html>
  );
}
