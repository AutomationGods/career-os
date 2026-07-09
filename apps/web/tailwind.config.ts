import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map existing Career OS palette to Tailwind tokens
        background: "#0f172a",        // body bg
        foreground: "#e2e8f0",        // body text
        card: {
          DEFAULT: "#1e293b",         // .card bg, .top-nav-links a bg
          foreground: "#e2e8f0",
        },
        muted: {
          DEFAULT: "#334155",         // borders, subtle bg
          foreground: "#94a3b8",      // .muted text
        },
        accent: {
          DEFAULT: "#38bdf8",         // buttons, hover borders, highlights
          foreground: "#082f49",      // button text
        },
        primary: {
          DEFAULT: "#2563eb",         // .badge bg
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",         // .warning-card border
          foreground: "#451a03",      // .warning-card bg
        },
        border: "#334155",
        input: "#475569",
        ring: "#38bdf8",
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "14px",                   // .card radius
        md: "10px",                   // input radius
        sm: "6px",
        pill: "999px",                // button/badge radius
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
