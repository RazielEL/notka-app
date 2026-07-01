import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#07111f",
          900: "#0b1728",
          850: "#10213a",
          800: "#162b49",
        },
        ink: "#18202c",
        mist: "#f5f7fb",
        glass: "rgba(255, 255, 255, 0.72)",
      },
      boxShadow: {
        glass: "0 18px 60px rgba(10, 24, 43, 0.16)",
        "glass-dark": "0 18px 60px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
};

export default config;
