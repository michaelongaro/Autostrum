import { type Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    // probably can remove container? not sure if it's needed
    container: {
      center: true,
      padding: "2rem",
      screens: {
        xs: "450px",
        ...defaultTheme.screens,
      },
    },
    screens: {
      xs: "450px",
      ...defaultTheme.screens,
    },
    extend: {
      screens: {
        // TODO: tweak this threshold
        mobileLandscape: { raw: "(max-height: 500px)" },
        mobileLarge: { raw: "(min-height: 667px)" },
        tablet: { raw: "(min-height: 700px) and (min-width: 1024px)" },
        desktop: { raw: "(min-height: 800px) and (min-width: 1500px)" },
      },
      colors: {
        destructiveRed: "hsl(0, 90%, 50%)",
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
        toggleOn: {
          DEFAULT: "hsl(var(--toggle-on))",
          foreground: "hsl(var(--accent-foreground))",
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
      },
      boxShadow: {
        primaryButton: "0 1px 2px 0 rgb(0 0 0 / 0.25)",
        lightGlassmorphic: "0 2px 3px 0 rgb(0 0 0 / 0.15)",
        lighterGlassmorphic: "0 2px 3px 0 rgb(0 0 0 / 0.18)",
        lightestGlassmorphic: "0px 2px 3px 0 rgb(0 0 0 / 0.23)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        errorShake: {
          "0%, 100%": { translate: "0px" },
          "20%": { translate: "-15px" },
          "40%": { translate: "15px" },
          "60%": { translate: "-7px" },
          "80%": { translate: "8px" },
        },
        smallErrorShake: {
          "0%, 100%": { translate: "0px" },
          "20%": { translate: "-5px" },
          "40%": { translate: "5px" },
          "60%": { translate: "-3px" },
          "80%": { translate: "4px" },
        },
        colorOscillate: {
          "0%": { color: "hsl(324, 77%, 95%)" },
          "50%": { color: "hsla(324, 77%, 95%, 0.65)" },
          "100%": { color: "hsl(324, 77%, 95%)" },
        },
        stableSpin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        copyChordPulse: {
          "0%": { transform: "scale(0.75)", opacity: "0" },
          "50%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        pasteChordPulse: {
          "0%": { transform: "scale(0.75)", opacity: "0" },
          "50%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(0.85)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        errorShake: "errorShake 0.5s ease-in-out forwards",
        smallErrorShake: "smallErrorShake 0.5s ease-in-out forwards",
        colorOscillate: "colorOscillate 1.75s ease-in-out infinite",
        stableSpin: "stableSpin 1s linear infinite",
        copyChordPulse: "copyChordPulse 0.35s ease-in-out forwards",
        pasteChordPulse: "pasteChordPulse 0.35s ease-in-out forwards",
      },
      textShadow: {
        none: "none",
        DEFAULT: "0 1px 2px hsla(336, 84%, 17%, 0.25)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries"),

    // TODO: probably remove this during UI refactor, since this was
    // a bit of a hack
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "text-shadow": (value) => ({
            textShadow: value,
          }),
        },
        { values: theme("textShadow") },
      );
    }),
  ],
} satisfies Config;
