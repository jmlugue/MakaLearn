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
        coral: "#fff1ec"
      },
      boxShadow: {
        soft: "0 14px 35px rgba(37, 99, 235, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
