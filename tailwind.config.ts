import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0ea5e9",
          dark: "#0369a1",
        },
        accident: {
          traffic: "#ef4444",
          crime: "#7c3aed",
          fire: "#f97316",
          fraud: "#eab308",
          disaster: "#0ea5e9",
          etc: "#64748b",
        },
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
