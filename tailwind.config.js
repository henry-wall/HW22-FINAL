/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "var(--brand-pink)",
          cyan: "var(--brand-cyan)",
          dark: "#080810",
          surface: "#12121f",
          card: "#1a1a2e",
          border: "#2a2a3e",
        },
        "primary": "var(--text-primary)",
        "secondary": "var(--text-secondary)",
        "muted": "var(--text-muted)",
        "page": "var(--bg-page)",
        "surface": "var(--bg-surface)",
        "main": "var(--border-main)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "pink-glow": "0 0 20px rgba(255, 5, 149, 0.3)",
        "cyan-glow": "0 0 20px rgba(0, 255, 255, 0.3)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-pink": "pulsePink 2s infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulsePink: { "0%,100%": { boxShadow: "0 0 10px rgba(255,5,149,0.3)" }, "50%": { boxShadow: "0 0 25px rgba(255,5,149,0.7)" } },
      },
    },
  },
  plugins: [],
};
