/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        optimal: "#10b981",
        restricted: "#f59e0b",
        disrupted: "#ef4444",
        accent: "#06b6d4",
        panel: "#111827",
        surface: "#070b12",
        "surface-elevated": "#0d1219",
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(51, 65, 85, 0.5), 0 4px 24px rgba(0, 0, 0, 0.4)",
        glow: "0 0 20px rgba(6, 182, 212, 0.15)",
      },
    },
  },
  plugins: [],
};
