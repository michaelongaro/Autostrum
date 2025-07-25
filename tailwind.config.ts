import { type Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";

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
        // tab title + bpm will be hidden below this threshold to free up extra space
        mobileNarrowLandscape: { raw: "(max-height: 370px)" },
        // TODO: tweak this threshold
        mobileLandscape: { raw: "(min-height: 370px) and (max-height: 500px)" },
        // threshold to render regular height tab components on playback modal
        mobilePortrait: { raw: "(min-height: 500px)" },
        mobileLarge: { raw: "(min-height: 667px)" },
        tablet: { raw: "(min-height: 700px) and (min-width: 1024px)" },
        desktop: { raw: "(min-height: 800px) and (min-width: 1500px)" },
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        gray: "hsl(var(--gray))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        header: "hsl(var(--header))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
          active: "hsl(var(--secondary-active))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        audio: {
          DEFAULT: "hsl(var(--audio))",
          foreground: "hsl(var(--audio-foreground))",
        },
        toggle: {
          foreground: "hsl(var(--toggle-foreground))",
          background: "hsl(var(--toggle-background))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      boxShadow: {
        primaryButton: "0 1px 2px 0 rgb(0 0 0 / 0.25)",
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
        stableSpin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.25s ease-out",
        "accordion-up": "accordion-up 0.25s ease-out",
        errorShake: "errorShake 0.5s ease-in-out forwards",
        smallErrorShake: "smallErrorShake 0.5s ease-in-out forwards",
        stableSpin: "stableSpin 1s linear infinite",
      },
    },
    // mobile safari was glitchy/inconsistent at best with the default
    // cubic-bezier transition timing function, so currently using linear
    transitionTimingFunction: {
      DEFAULT: "linear",
    },
  },
  plugins: [tailwindcssAnimate, containerQueries],
} satisfies Config;
