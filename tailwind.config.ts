import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        petra: {
          parchment: "#F5F5DC",
          "parchment-light": "#FAF8F0",
          sepia: "#3E2723",
          sienna: "#8B5A2B",
          "sienna-light": "#A0764A",
          sand: "#D2B48C",
          "sand-light": "#E8D5B7",
          bone: "#EDE0D4",
          fossil: "#6B4E37",
        },
      },
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(62, 39, 35, 0.15)",
        "card-hover": "0 8px 24px rgba(62, 39, 35, 0.25)",
        report: "0 12px 40px rgba(62, 39, 35, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
