import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: "#1A9E9E", dark: "#128080", light: "#E6F5F5" },
        navy: { DEFAULT: "#1B3F7A", dark: "#132C56", light: "#EDF1F8" },
        surface: "#F4F7F9",
        body: "#334155"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      borderRadius: { card: "12px", btn: "8px" }
    }
  },
  plugins: []
};
export default config;
