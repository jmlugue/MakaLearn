import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Three layouts (STYLE_GUIDE section 5): mobile under 768px, tablet 768px to 1024px (md), desktop from 1025px (lg).
    // lg starts at 1025px, not Tailwind's 1024px, so an iPad turned sideways still gets the tablet layout.
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1025px",
      xl: "1280px",
      "2xl": "1536px"
    },
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
        // Small red, yellow, blue touches on the landing, login, and loaders only. Blue stays the main color.
        brand: {
          red: "#ef4444",
          yellow: "#facc15",
          blue: "#2563eb"
        },
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
