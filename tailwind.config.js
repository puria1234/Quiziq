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
        ink: "#0b0b14",
        glow: "#16f2f2",
        flare: "#ff5f6d",
        sun: "#ffc371",
        neon: "#7C3AED"
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
          "0%, 100%": { boxShadow: "0 0 0 rgba(22, 242, 242, 0)" },
          "50%": { boxShadow: "0 0 35px rgba(22, 242, 242, 0.4)" }
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
