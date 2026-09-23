/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saas: {
          bg: "#F5F7FA",
          card: "#FFFFFF",
          cardHover: "#F8FAFC",
          border: "#E2E8F0",
          borderLight: "#EDF2F7",
          sidebar: "#0D131F",
          sidebarHover: "#161F33",
          sidebarBorder: "#1B253B",
          primary: "#0284C7",
          primaryHover: "#0369A1",
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          crimson: "#EF4444",
          text: "#0F172A",
          muted: "#64748B",
        },
        cyber: {
          bg: "#0B0F17",
          surface: "#111827",
          card: "#162032",
          cardHover: "#1E2C44",
          border: "#1F2E45",
          borderLight: "#2D3F5E",
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          crimson: "#EF4444",
          muted: "#94A3B8",
          text: "#F8FAFC",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        'cyan-glow': '0 0 20px -5px rgba(6, 182, 212, 0.4)',
        'emerald-glow': '0 0 20px -5px rgba(16, 185, 129, 0.4)',
        'crimson-glow': '0 0 20px -5px rgba(239, 68, 68, 0.5)',
      },
    },
  },
  plugins: [],
}
