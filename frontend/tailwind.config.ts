import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./pages/**/*.{ts,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#0A192F",
        "primary-container": "#0D1C32",
        secondary: "#10B981",
        "secondary-container": "#E4FFF4",
        tertiary: "#4A5568",
        "tertiary-container": "#E9EEF5",
        error: "#EF4444",
        "on-primary": "#FFFFFF",
        "on-secondary": "#0A192F",
        "on-tertiary": "#FFFFFF",
        "on-error": "#FFFFFF",
        "on-surface": "#141D23",
        "on-surface-variant": "#4A5568",
        surface: "#F8FAFC",
        "surface-container-low": "#ECF5FE",
        "surface-container": "#E6EDF7",
        "surface-container-high": "#E0E9F2",
        "surface-container-highest": "#D8E2EC",
        "surface-container-lowest": "#FFFFFF",
        "surface-bright": "#F6FAFF",
        outline: "rgba(74,85,104,0.35)",
        "outline-variant": "rgba(74,85,104,0.25)",
        "inverse-surface": "#293138",
        "inverse-on-surface": "#E9F2FB",
        "on-tertiary-container": "#2B3C4F",
      },
      boxShadow: {
        ambient: "0 24px 60px rgba(20, 29, 35, 0.05)",
        "ambient-strong": "0 32px 80px rgba(20, 29, 35, 0.06)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        headline: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        label: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
      },
    },
  },
  plugins: [forms],
};

export default config;
