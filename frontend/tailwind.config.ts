import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Acaro-inspired warm palette
        cream: {
          50: "#FBF7F1",
          100: "#F6EFE3",
          200: "#EBE0CC",
          300: "#DCC9A6",
        },
        espresso: {
          50: "#3A2E25",
          100: "#2D241D",
          200: "#221A14",
          300: "#1A130E",
          400: "#120D09",
        },
        gold: {
          50: "#F4E7C5",
          100: "#E8D29A",
          200: "#D9B872",
          300: "#C9A961", // primary accent
          400: "#B5944D",
          500: "#9A7C3A",
        },
        ink: "#1A1410",
        muted: "#7A6B5E",
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(34, 26, 20, 0.18)",
        gold: "0 10px 30px -10px rgba(201, 169, 97, 0.45)",
      },
      backgroundImage: {
        "hero-grain":
          "radial-gradient(at 20% 10%, rgba(201,169,97,0.10) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(201,169,97,0.08) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(34,26,20,0.06) 0px, transparent 50%)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        headerCtaGlow: {
          "0%, 100%": {
            boxShadow: "0 0 18px rgba(201, 169, 97, 0.28)",
          },
          "50%": {
            boxShadow: "0 0 36px rgba(201, 169, 97, 0.55)",
          },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.7s ease-out both",
        marquee: "marquee 40s linear infinite",
        headerCtaGlow: "headerCtaGlow 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
