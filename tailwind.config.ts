import type { Config } from "tailwindcss";

/**
 * Memories — Design System
 *
 * Inspiração: Apple, Spotify Wrapped, Arc Browser, Pinterest editorial.
 * Princípios:
 *  - Hierarquia tipográfica forte: serif elegante para emoção, sans para utilidade.
 *  - Animações lentas (600–1200ms) para sensação cinematográfica.
 *  - Glow + glass para profundidade sem peso visual.
 *  - Paleta emocional rosa/coral/blush/plum/amber para moods.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", md: "2rem", lg: "3rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      // Tipografia cinemática — números/headings hero
      fontSize: {
        "display-xs": ["2.5rem",  { lineHeight: "1",     letterSpacing: "-0.02em" }],
        "display-sm": ["3.5rem",  { lineHeight: "1",     letterSpacing: "-0.025em" }],
        "display-md": ["5rem",    { lineHeight: "0.95",  letterSpacing: "-0.03em" }],
        "display-lg": ["7rem",    { lineHeight: "0.9",   letterSpacing: "-0.035em" }],
        "display-xl": ["9rem",    { lineHeight: "0.85",  letterSpacing: "-0.04em" }],
        "display-2xl": ["12rem",  { lineHeight: "0.85",  letterSpacing: "-0.045em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Mood palette — usada por notas + retrospectiva
        mood: {
          love:      "hsl(var(--mood-love))",
          longing:   "hsl(var(--mood-longing))",
          joy:       "hsl(var(--mood-joy))",
          calm:      "hsl(var(--mood-calm))",
          nostalgia: "hsl(var(--mood-nostalgia))",
        },
      },
      borderRadius: {
        "2xl": "calc(var(--radius) + 8px)",
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Sombras suaves "premium" — múltiplas camadas, baixa opacidade
        "soft":   "0 1px 2px hsl(var(--foreground) / 0.04), 0 2px 8px hsl(var(--foreground) / 0.04)",
        "lift":   "0 4px 12px hsl(var(--foreground) / 0.06), 0 12px 32px hsl(var(--foreground) / 0.08)",
        "float":  "0 8px 24px hsl(var(--foreground) / 0.08), 0 24px 64px hsl(var(--foreground) / 0.10)",
        "glow":   "0 0 40px hsl(var(--primary) / 0.25), 0 0 80px hsl(var(--primary) / 0.15)",
        "glow-lg":"0 0 80px hsl(var(--primary) / 0.35), 0 0 160px hsl(var(--primary) / 0.20)",
        "inner-glow": "inset 0 1px 0 hsl(var(--foreground) / 0.06), inset 0 -1px 0 hsl(var(--foreground) / 0.04)",
      },
      backgroundImage: {
        "aurora":
          "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 20%, hsl(var(--mood-nostalgia) / 0.12), transparent 60%), radial-gradient(ellipse 50% 40% at 20% 30%, hsl(var(--mood-calm) / 0.10), transparent 60%)",
        "aurora-soft":
          "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 0% 100%, hsl(var(--accent) / 0.08), transparent 60%)",
        "blush":
          "linear-gradient(135deg, hsl(var(--primary) / 0.20) 0%, hsl(var(--mood-nostalgia) / 0.15) 50%, hsl(var(--mood-calm) / 0.10) 100%)",
        "sunset":
          "linear-gradient(135deg, hsl(var(--mood-joy) / 0.20) 0%, hsl(var(--primary) / 0.20) 50%, hsl(var(--mood-love) / 0.20) 100%)",
        "noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%":      { opacity: "1",   transform: "scale(1.03)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in":      "fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-in-up":   "fade-in-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-in-down": "fade-in-down 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "scale-in":     "scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "shimmer":      "shimmer 3s ease-in-out infinite",
        "glow-pulse":   "glow-pulse 4s ease-in-out infinite",
        "float":        "float 6s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        "premium": "cubic-bezier(0.22, 1, 0.36, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
