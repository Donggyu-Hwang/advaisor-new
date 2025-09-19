/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#1D93FF",
          600: "#1976d2",
          700: "#1565c0",
          900: "#0d47a1",
        },
        accent: {
          DEFAULT: "#1D93FF33",
          purple: "#BF90F4",
          teal: "#33CFB4",
          orange: "#FFB740",
          red: "#FF283E",
        },
        background: {
          dark: "#000000",
          light: "#F3F3F5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        neon: "0 0 20px rgba(29, 147, 255, 0.5)",
        "neon-lg": "0 0 40px rgba(29, 147, 255, 0.3)",
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(29, 147, 255, 0.5)" },
          "100%": { boxShadow: "0 0 30px rgba(29, 147, 255, 0.8)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
