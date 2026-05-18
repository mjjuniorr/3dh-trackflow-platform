/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        panel: "var(--color-panel)",
        surface: "var(--color-surface)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        signal: "#d97706"
      }
    }
  },
  plugins: []
};
