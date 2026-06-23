import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "energy-Logix | Command Center",
  description: "Multi-Asset Diluent Blender & Pipeline Disruption Simulator",
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
