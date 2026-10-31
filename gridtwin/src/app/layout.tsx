import type { Metadata } from "next";
import "./globals.css";
import "@/components/GradientASCII.css";

export const metadata: Metadata = {
  title: "Grid Twin | Day-ahead energy intelligence",
  description: "Auditable day-ahead electricity-demand analysis.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
