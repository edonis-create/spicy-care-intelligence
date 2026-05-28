/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: { 950: "#020617" },
        bg: { base: "var(--bg-base)", canvas: "var(--bg-canvas)" },
        surface: {
          1: "var(--surface-1)",
          "1-hover": "var(--surface-1-hover)",
          2: "var(--surface-2)",
          "2-hover": "var(--surface-2-hover)",
          3: "var(--surface-3)",
          overlay: "var(--surface-overlay)",
        },
        fg: {
          DEFAULT: "var(--text-primary)",
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          quaternary: "var(--text-quaternary)",
          "on-accent": "var(--text-on-accent)",
        },
        border: {
          subtle: "var(--border-subtle)",
          default: "var(--border-default)",
          strong: "var(--border-strong)",
          accent: "var(--border-accent)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          softer: "var(--accent-softer)",
          ring: "var(--accent-ring)",
          glow: "var(--accent-glow)",
        },
        status: {
          success: "var(--success)",
          "success-soft": "var(--success-soft)",
          warning: "var(--warning)",
          "warning-soft": "var(--warning-soft)",
          danger: "var(--danger)",
          "danger-soft": "var(--danger-soft)",
          info: "var(--info)",
          "info-soft": "var(--info-soft)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
      },
      fontSize: {
        "metric-xl": ["2.4rem", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "600" }],
        "metric-lg": ["1.875rem", { lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "600" }],
        h1: ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
        h2: ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.012em", fontWeight: "600" }],
        h3: ["0.95rem", { lineHeight: "1.35", letterSpacing: "-0.005em", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.8125rem", { lineHeight: "1.5" }],
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.16em", fontWeight: "600" }],
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "fade-in": "fade-in 240ms ease-out both",
      },
    },
  },
  plugins: [],
};
