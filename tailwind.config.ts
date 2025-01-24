import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundImage: {
        "dot-pattern":
          "radial-gradient(circle, #526D82 0.5px, transparent 0.5px)",
        "grid-pattern":
          "linear-gradient(to right, #27374D 1px, transparent 1px), linear-gradient(to bottom, #27374D 1px, transparent 1px)",
        "noise-pattern":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        "gradient-radial":
          "radial-gradient(circle at center, var(--tw-gradient-stops))",
      },
      backgroundSize: {
        dot: "16px 16px",
        grid: "24px 24px",
      },
      backgroundPosition: {
        pattern: "0 0",
      },
      colors: {
        navy: {
          DEFAULT: "#1a2332",
          light: "#27374D",
          lighter: "#526D82",
          lightest: "#9DB2BF",
        },
        border: "#27374D",
        input: "#1a2332",
        ring: "#526D82",
        background: "#0f1523",
        foreground: "#DDE6ED",
        primary: {
          DEFAULT: "#1a2332",
          foreground: "#DDE6ED",
        },
        secondary: {
          DEFAULT: "#27374D",
          foreground: "#DDE6ED",
        },
        destructive: {
          DEFAULT: "#991b1b",
          foreground: "#fef2f2",
        },
        muted: {
          DEFAULT: "#526D82",
          foreground: "#DDE6ED",
        },
        accent: {
          DEFAULT: "#27374D",
          foreground: "#DDE6ED",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            "--tw-prose-body": "#DDE6ED",
            "--tw-prose-headings": "#DDE6ED",
            "--tw-prose-links": "#9DB2BF",
            "--tw-prose-bold": "#DDE6ED",
            "--tw-prose-code": "#9DB2BF",
            "--tw-prose-quotes": "#DDE6ED",
            "--tw-prose-quote-borders": "#526D82",
            "--tw-prose-pre-bg": "#27374D",
            "--tw-prose-pre-code": "#DDE6ED",
          },
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        typing: {
          "0%, 100%": { width: "0%" },
          "50%": { width: "100%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        typing: "typing 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [animate, typography],
} satisfies Config;

export default config;
