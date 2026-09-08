import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff"
        },
        skywash: "#eef7ff",
        ink: "#172033",
        mint: "#e8f7ef",
        coral: "#fff1ec",
        // Accent family. Blue stays primary; these carry warmth on illustrations,
        // icon tiles and step markers. "ink" values clear 4.5:1 on white glass.
        accent: {
          teal: "#0f766e",
          "teal-soft": "#ccfbf1",
          amber: "#b45309",
          "amber-soft": "#fef3c7",
          coral: "#be123c",
          "coral-soft": "#ffe4e6"
        }
      },
      boxShadow: {
        soft: "0 14px 35px rgba(37, 99, 235, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
