/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Sora'", "ui-sans-serif", "system-ui"],
        body: ["'Manrope'", "ui-sans-serif", "system-ui"]
      },
      colors: {
        ink: "#061329",
        glow: "#3B82F6",
        flare: "#0EA5E9",
        sun: "#F59E0B",
        neon: "#6366F1"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(59, 130, 246, 0)" },
          "50%": { boxShadow: "0 0 35px rgba(59, 130, 246, 0.45)" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 8s linear infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
