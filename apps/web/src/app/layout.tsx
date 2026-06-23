import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "energy-Logix | MES Operations Platform",
  description: "Multi-Asset Diluent Blender & Pipeline Disruption Simulator — Commercial Operations Command Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
