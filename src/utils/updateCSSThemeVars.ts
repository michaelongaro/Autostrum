import type { COLORS, THEME } from "~/stores/TabStore";
import { DYNAMIC_FAVICON_ID, FAVICON_PATHS } from "~/utils/faviconPaths";

export type ScreenshotColorKey =
  | "screenshot-background"
  | "screenshot-foreground"
  | "screenshot-primary-foreground"
  | "screenshot-border"
  | "screenshot-accent"
  | "screenshot-secondary";

type ScreenshotColorScale = Record<ScreenshotColorKey, string>;
type ScreenshotColorValues = Record<
  COLORS,
  Record<THEME, ScreenshotColorScale>
>;

type ColorScale = Record<string, string>;
type ColorValues = Record<COLORS, Record<THEME, ColorScale>>;

// FYI: destructive is the same for all, except for coral and maple since they are so red already
// we are using a very dark shade of red for light mode, and a slightly lighter shade for dark mode

// Light themes pair white surfaces and neutral text/borders with soft palette
// tints on secondary surfaces. Strong color stays on actions and selections.
// Dark palettes retain their original Radix color scales.

// Static notation and saved previews use the same white background, neutral
// text/borders, and softly tinted secondary-active fill as the live light UI.
// Section labels keep their accent color. Dark screenshot palettes are unchanged.

// FYI: my color names for each variant (my names <- radix names):
// peony <- crimson,
// coral <- red,
// saffron <- tomato,
// maple <- bronze,
// pistachio <- grass,
// verdant <- teal,
// aqua <- cyan,
// sapphire <- indigo,
// amethyst <- purple,

// FYI: logo gradient is just primary with -10% lightness

// FYI: "near white" values are all just level two light mode radix variants

// FYI: these values are all subject to change, whether it's small foreground tweaks
// or entire rearrangments of color intensities.

const COLORS = [
  "peony",
  "coral",
  "saffron",
  "maple",
  "pistachio",
  "verdant",
  "aqua",
  "sapphire",
  "amethyst",
] as const;

export const COLOR_HEX_VALUES: Record<(typeof COLORS)[number], string> = {
  peony: "#E93D82",
  coral: "#E5484D",
  maple: "#A18072",
  saffron: "#E54D2E",
  pistachio: "#46A758",
  verdant: "#12A594",
  aqua: "#00A2C7",
  sapphire: "#3E63DD",
  amethyst: "#8E4EC6",
} as const satisfies Record<COLORS, string>;

export const NEAR_WHITE_COLOR_VALUES: Record<COLORS, string> = {
  peony: "#FEF7F9",
  coral: "#FFF7F7",
  maple: "#FDF7F5",
  saffron: "#FFF8F7",
  pistachio: "#F5FBF5",
  verdant: "#F2FAFB",
  aqua: "#F2FAFB",
  sapphire: "#F7F9FF",
  amethyst: "#FBF7FE",
} as const satisfies Record<COLORS, string>;

export const SCREENSHOT_COLORS = {
  peony: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "340.00 100.00% 99.41%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "335.86 75.00% 45.49%",
      "screenshot-secondary": "335.93 32% 90%",
    },
    dark: {
      "screenshot-background": "336.92 25.49% 10.00%",
      "screenshot-foreground": "330.00 91.30% 87.98%",
      "screenshot-primary-foreground": "340.00 100.00% 99.41%",
      "screenshot-border": "335.84 55.40% 72.75%",
      "screenshot-accent": "330.88 58.62% 22.75%",
      "screenshot-secondary": "330.88 58.62% 22.75%",
    },
  },
  coral: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "0.00 100.00% 99.41%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "358.15 64.80% 49.02%",
      "screenshot-secondary": "358.09 32% 90%",
    },
    dark: {
      "screenshot-background": "355.38 25.49% 10.00%",
      "screenshot-foreground": "349.57 100.00% 87.98%",
      "screenshot-primary-foreground": "0.00 100.00% 99.41%",
      "screenshot-border": "358.71 69.92% 73.92%",
      "screenshot-accent": "349.60 63.03% 23.33%",
      "screenshot-secondary": "349.60 63.03% 23.33%",
    },
  },
  saffron: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "0 100% 99.41%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "9.89 81.74% 45.1%",
      "screenshot-secondary": "10.16 32% 90%",
    },
    dark: {
      "screenshot-background": "10 24% 9.8%",
      "screenshot-foreground": "10 85.71% 89.02%",
      "screenshot-primary-foreground": "0 100% 99.41%",
      "screenshot-border": "10.09, 74.83%, 70.39%",
      "screenshot-accent": "5 62.07% 22.75%",
      "screenshot-secondary": "5 62.07% 22.75%",
    },
  },
  maple: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "0 20% 99.02%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "14.63 19.62% 40.98%",
      "screenshot-secondary": "17.87 20% 90%",
    },
    dark: {
      "screenshot-background": "24 9.8% 10%",
      "screenshot-foreground": "21 35.71% 86.02%",
      "screenshot-primary-foreground": "0 20% 99.02%",
      "screenshot-border": "16.1 25.15% 68.04%",
      "screenshot-accent": "16.36 10.28% 20.98%",
      "screenshot-secondary": "16.36 10.28% 20.98%",
    },
  },
  pistachio: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "120.00 60.00% 99.02%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "132.14 50.00% 32.94%",
      "screenshot-secondary": "131.13 32% 90%",
    },
    dark: {
      "screenshot-background": "130.00 13.04% 9.02%",
      "screenshot-foreground": "120.00 60.53% 85.10%",
      "screenshot-primary-foreground": "120.00 60.00% 99.02%",
      "screenshot-border": "130.59 38.12% 56.27%",
      "screenshot-accent": "133.71 32.11% 21.37%",
      "screenshot-secondary": "133.71 32.11% 21.37%",
    },
  },
  verdant: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "165.00 66.67% 98.82%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "171.88 100.00% 26.08%",
      "screenshot-secondary": "173.06 32% 90%",
    },
    dark: {
      "screenshot-background": "174.55 24.44% 8.82%",
      "screenshot-foreground": "162.99 69.07% 78.98%",
      "screenshot-primary-foreground": "165.00 66.67% 98.82%",
      "screenshot-border": "171.76 42.15% 52.55%",
      "screenshot-accent": "175.31 80.00% 15.69%",
      "screenshot-secondary": "175.31 80.00% 15.69%",
    },
  },
  aqua: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "195.00 66.67% 98.82%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "191.91 80.95% 32.94%",
      "screenshot-secondary": "191.16 32% 90%",
    },
    dark: {
      "screenshot-background": "198.75 33.33% 9.41%",
      "screenshot-foreground": "190.15 80.25% 82.12%",
      "screenshot-primary-foreground": "195.00 66.67% 98.82%",
      "screenshot-border": "189.04 60.33% 52.55%",
      "screenshot-accent": "192.95 100.00% 17.25%",
      "screenshot-secondary": "192.95 100.00% 17.25%",
    },
  },
  sapphire: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "240 33.33% 99.41%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "225.96 55.73% 50.39%",
      "screenshot-secondary": "226.04 32% 90%",
    },
    dark: {
      "screenshot-background": "230 31.03% 11.37%",
      "screenshot-foreground": "223.9 100% 88.96%",
      "screenshot-primary-foreground": "240 33.33% 99.41%",
      "screenshot-border": "225.92 75.38% 74.51%",
      "screenshot-accent": "224.81 51.63% 30%",
      "screenshot-secondary": "224.81 51.63% 30%",
    },
  },
  amethyst: {
    light: {
      "screenshot-background": "0 0% 100%",
      "screenshot-foreground": "220 12% 18%",
      "screenshot-primary-foreground": "300.00 50.00% 99.22%",
      "screenshot-border": "220 8% 84%",
      "screenshot-accent": "272.14 44.80% 49.02%",
      "screenshot-secondary": "272.00 32% 90%",
    },
    dark: {
      "screenshot-background": "278.57 25.00% 10.98%",
      "screenshot-foreground": "274.55 76.74% 89.57%",
      "screenshot-primary-foreground": "300.00 50.00% 99.22%",
      "screenshot-border": "271.85 60.00% 73.53%",
      "screenshot-accent": "276.47 38.35% 26.08%",
      "screenshot-secondary": "276.47 38.35% 26.08%",
    },
  },
} as const satisfies ScreenshotColorValues;

/** Design-token source of truth (with SCREENSHOT_COLORS). Runtime paint uses
 *  src/styles/theme-tokens.css (generated via `npm run generate:theme-tokens`);
 *  do not inline these objects in _document or component style props. */
export const COLOR_VALUES = {
  peony: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "336.33 44.86% 47.65%",
      primary: "335.93 79.63% 57.65%",
      "primary-foreground": "340.00 100.00% 99.41%",
      secondary: "335.93 34% 96%",
      "secondary-hover": "335.93 36% 93%",
      "secondary-active": "335.93 32% 90%",
      "secondary-foreground": "335.93 20% 30%",
      accent: "335.86 75.00% 45.49%",
      "accent-foreground": "340.00 100.00% 99.41%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "335.93 26% 97%",
      "gradient-primary": "335.93 24% 94%",
      "gradient-secondary": "335.93 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "335.93 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "335.93 26% 97%",
    },
    dark: {
      background: "336.92 25.49% 10.00%",
      foreground: "330.00 91.30% 87.98%",
      gray: "250.91 4.8% 44.9%", // muave 9
      border: "335.84 55.40% 72.75%",
      ring: "336.33 44.86% 47.65%",
      modal: "330.51 62.11% 18.63%",
      primary: "335.93 79.63% 57.65%",
      "primary-foreground": "340.00 100.00% 99.41%",
      secondary: "332.57 45.45% 15.10%",
      "secondary-hover": "330.51 62.11% 18.63%",
      "secondary-active": "330.88 58.62% 22.75%",
      "secondary-foreground": "330.00 91.30% 87.98%",
      accent: "330.88 58.62% 22.75%",
      "accent-foreground": "340.00 100.00% 99.41%",
      "toggle-foreground": "340.00 100.00% 99.41%",
      "toggle-background": "340.00 100.00% 99.41%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "336.92 25.49% 10.00%",
      "gradient-primary": "330.51 62.11% 18.63%",
      "gradient-secondary": "337.50 19.05% 8.24%",
      "modal-gradient-from": "337.50 19.05% 8.24%",
      "modal-gradient-to": "336.92 25.49% 10.00%",
      "mobile-header-gradient-from": "337.50 19.05% 8.24%",
      "mobile-header-gradient-to": "336.92 25.49% 10.00%",
    },
  },
  coral: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "358.39 44.80% 49.02%",
      primary: "358.09 75.12% 59.02%",
      "primary-foreground": "0.00 100.00% 99.41%",
      secondary: "358.09 34% 96%",
      "secondary-hover": "358.09 36% 93%",
      "secondary-active": "358.09 32% 90%",
      "secondary-foreground": "358.09 20% 30%",
      accent: "358.15 64.80% 49.02%",
      "accent-foreground": "0.00 100.00% 99.41%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "350.65 62.6% 24.12%",
      "destructive-foreground": "0 100% 99.41%",
      header: "358.09 26% 97%",
      "gradient-primary": "358.09 24% 94%",
      "gradient-secondary": "358.09 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "358.09 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "358.09 26% 97%",
    },
    dark: {
      background: "355.38 25.49% 10.00%",
      foreground: "349.57 100.00% 87.98%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "358.71 69.92% 73.92%",
      ring: "358.39 44.80% 49.02%",
      modal: "348.00 68.42% 18.63%",
      primary: "358.09 75.12% 59.02%",
      "primary-foreground": "0.00 100.00% 99.41%",
      secondary: "349.76 53.25% 15.10%",
      "secondary-hover": "348.00 68.42% 18.63%",
      "secondary-active": "349.60 63.03% 23.33%",
      "secondary-foreground": "349.57 100.00% 87.98%",
      accent: "349.60 63.03% 23.33%",
      "accent-foreground": "0.00 100.00% 99.41%",
      "toggle-foreground": "0.00 100.00% 99.41%",
      "toggle-background": "0.00 100.00% 99.41%",
      destructive: "358.15 64.8% 49.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "355.38 25.49% 10.00%",
      "gradient-primary": "348.00 68.42% 18.63%",
      "gradient-secondary": "0.00 19.05% 8.24%",
      "modal-gradient-from": "0.00 19.05% 8.24%",
      "modal-gradient-to": "355.38 25.49% 10.00%",
      "mobile-header-gradient-from": "0.00 19.05% 8.24%",
      "mobile-header-gradient-to": "355.38 25.49% 10.00%",
    },
  },
  saffron: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "9.89 61.74% 45.1%",
      primary: "10.16 77.87% 53.92%",
      "primary-foreground": "0 100% 99.41%",
      secondary: "10.16 34% 96%",
      "secondary-hover": "10.16 36% 93%",
      "secondary-active": "10.16 32% 90%",
      "secondary-foreground": "10.16 20% 30%",
      accent: "9.89 81.74% 45.1%",
      "accent-foreground": "0 100% 99.41%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "10.16 26% 97%",
      "gradient-primary": "10.16 24% 94%",
      "gradient-secondary": "10.16 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "10.16 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "10.16 26% 97%",
    },
    dark: {
      background: "10 24% 9.8%",
      foreground: "10 85.71% 89.02%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "10.09, 74.83%, 70.39%",
      ring: "9.89 61.74% 45.1%",
      modal: "3.93 64.21% 18.63%",
      primary: "10.16 77.87% 53.92%",
      "primary-foreground": "0 100% 99.41%",
      secondary: "4.86 48.05% 15.1%",
      "secondary-hover": "3.93 64.21% 18.63%",
      "secondary-active": "5 62.07% 22.75%",
      "secondary-foreground": "10 85.71% 89.02%",
      accent: "5 62.07% 22.75%",
      "accent-foreground": "0 100% 99.41%",
      "toggle-foreground": "0 100% 99.41%",
      "toggle-background": "0 100% 99.41%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "10 24% 9.8%",
      "gradient-primary": "3.93 64.21% 18.63%",
      "gradient-secondary": "0.00 19.05% 8.24%",
      "modal-gradient-from": "0.00 19.05% 8.24%",
      "modal-gradient-to": "10 24% 9.8%",
      "mobile-header-gradient-from": "0.00 19.05% 8.24%",
      "mobile-header-gradient-to": "10 24% 9.8%",
    },
  },
  maple: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "14.63 19.62% 40.98%",
      primary: "17.87 20% 53.92%",
      "primary-foreground": "0 20% 99.02%",
      secondary: "17.87 20% 96%",
      "secondary-hover": "17.87 20% 93%",
      "secondary-active": "17.87 20% 90%",
      "secondary-foreground": "17.87 20% 30%",
      accent: "14.63 19.62% 40.98%",
      "accent-foreground": "0 20% 99.02%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "350.65 62.6% 24.12%",
      "destructive-foreground": "0 100% 99.41%",
      header: "17.87 20% 97%",
      "gradient-primary": "17.87 20% 94%",
      "gradient-secondary": "17.87 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "17.87 20% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "17.87 20% 97%",
    },
    dark: {
      background: "24 9.8% 10%",
      foreground: "21 35.71% 86.02%",
      gray: "60 2.98% 53.92%", // sand 9
      border: "16.1 25.15% 68.04%",
      ring: "14.63 19.62% 40.98%",
      modal: "20 10.34% 17.06%",
      primary: "17.87 20% 53.92%",
      "primary-foreground": "0 20% 99.02%",
      secondary: "20 8.57% 13.73%",
      "secondary-hover": "20 10.34% 17.06%",
      "secondary-active": "16.36 10.28% 20.98%",
      "secondary-foreground": "21 35.71% 86.02%",
      accent: "16.36 10.28% 20.98%",
      "accent-foreground": "0 20% 99.02%",
      "toggle-foreground": "0 20% 99.02%",
      "toggle-background": "0 20% 99.02%",
      destructive: "358.15 64.8% 49.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "24 9.8% 10%",
      "gradient-primary": "20 10.34% 17.06%",
      "gradient-secondary": "0.00 19.05% 8.24%",
      "modal-gradient-from": "0.00 19.05% 8.24%",
      "modal-gradient-to": "24 9.8% 10%",
      "mobile-header-gradient-from": "0.00 19.05% 8.24%",
      "mobile-header-gradient-to": "24 9.8% 10%",
    },
  },
  pistachio: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "131.19 32.24% 35.88%",
      primary: "131.13 40.93% 46.47%",
      "primary-foreground": "120.00 60.00% 99.02%",
      secondary: "131.13 34% 96%",
      "secondary-hover": "131.13 36% 93%",
      "secondary-active": "131.13 32% 90%",
      "secondary-foreground": "131.13 20% 30%",
      accent: "132.14 50.00% 32.94%",
      "accent-foreground": "120.00 60.00% 99.02%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "131.13 26% 97%",
      "gradient-primary": "131.13 24% 94%",
      "gradient-secondary": "131.13 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "131.13 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "131.13 26% 97%",
    },
    dark: {
      background: "130.00 13.04% 9.02%",
      foreground: "120.00 60.53% 85.10%",
      gray: "156.92 6.16% 41.37%", // sage 9
      border: "130.59 38.12% 56.27%",
      ring: "131.19 32.24% 35.88%",
      modal: "134.48 33.33% 17.06%",
      primary: "131.13 40.93% 46.47%",
      "primary-foreground": "120.00 60.00% 99.02%",
      secondary: "132.00 21.74% 13.53%",
      "secondary-hover": "134.48 33.33% 17.06%",
      "secondary-active": "133.71 32.11% 21.37%",
      "secondary-foreground": "120.00 60.53% 85.10%",
      accent: "133.71 32.11% 21.37%",
      "accent-foreground": "120.00 60.00% 99.02%",
      "toggle-foreground": "120.00 60.00% 99.02%",
      "toggle-background": "120.00 60.00% 99.02%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "130.00 13.04% 9.02%",
      "gradient-primary": "134.48 33.33% 17.06%",
      "gradient-secondary": "145.71 20.00% 6.86%",
      "modal-gradient-from": "145.71 20.00% 6.86%",
      "modal-gradient-to": "130.00 13.04% 9.02%",
      "mobile-header-gradient-from": "145.71 20.00% 6.86%",
      "mobile-header-gradient-to": "130.00 13.04% 9.02%",
    },
  },
  verdant: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "172.98 59.49% 30.98%",
      primary: "173.06 80.33% 35.88%",
      "primary-foreground": "165.00 66.67% 98.82%",
      secondary: "173.06 34% 96%",
      "secondary-hover": "173.06 36% 93%",
      "secondary-active": "173.06 32% 90%",
      "secondary-foreground": "173.06 20% 30%",
      accent: "171.88 100.00% 26.08%",
      "accent-foreground": "165.00 66.67% 98.82%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "173.06 26% 97%",
      "gradient-primary": "173.06 24% 94%",
      "gradient-secondary": "173.06 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "173.06 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "173.06 26% 97%",
    },
    dark: {
      background: "174.55 24.44% 8.82%",
      foreground: "162.99 69.07% 78.98%",
      gray: "156.92 6.16% 41.37%", // sage 9
      border: "171.76 42.15% 52.55%",
      ring: "172.98 59.49% 30.98%",
      modal: "175.79 93.44% 11.96%",
      primary: "173.06 80.33% 35.88%",
      "primary-foreground": "165.00 66.67% 98.82%",
      secondary: "174.38 55.17% 11.37%",
      "secondary-hover": "175.79 93.44% 11.96%",
      "secondary-active": "175.31 80.00% 15.69%",
      "secondary-foreground": "162.99 69.07% 78.98%",
      accent: "175.31 80.00% 15.69%",
      "accent-foreground": "165.00 66.67% 98.82%",
      "toggle-foreground": "165.00 66.67% 98.82%",
      "toggle-background": "165.00 66.67% 98.82%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "174.55 24.44% 8.82%",
      "gradient-primary": "175.79 93.44% 11.96%",
      "gradient-secondary": "172.50 23.53% 6.67%",
      "modal-gradient-from": "172.50 23.53% 6.67%",
      "modal-gradient-to": "174.55 24.44% 8.82%",
      "mobile-header-gradient-from": "172.50 23.53% 6.67%",
      "mobile-header-gradient-to": "174.55 24.44% 8.82%",
    },
  },
  aqua: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "192.09 80.35% 33.92%",
      primary: "191.16 100.00% 39.02%",
      "primary-foreground": "195.00 66.67% 98.82%",
      secondary: "191.16 34% 96%",
      "secondary-hover": "191.16 36% 93%",
      "secondary-active": "191.16 32% 90%",
      "secondary-foreground": "191.16 20% 30%",
      accent: "191.91 80.95% 32.94%",
      "accent-foreground": "195.00 66.67% 98.82%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "191.16 26% 97%",
      "gradient-primary": "191.16 24% 94%",
      "gradient-secondary": "191.16 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "191.16 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "191.16 26% 97%",
    },
    dark: {
      background: "198.75 33.33% 9.41%",
      foreground: "190.15 80.25% 82.12%",
      gray: "218.57 6.25% 43.92%", // slate 9
      border: "189.04 60.33% 52.55%",
      ring: "192.09 80.35% 33.92%",
      modal: "193.33 100.00% 14.12%",
      primary: "191.16 100.00% 39.02%",
      "primary-foreground": "195.00 66.67% 98.82%",
      secondary: "193.04 74.19% 12.16%",
      "secondary-hover": "193.33 100.00% 14.12%",
      "secondary-active": "192.95 100.00% 17.25%",
      "secondary-foreground": "190.15 80.25% 82.12%",
      accent: "192.95 100.00% 17.25%",
      "accent-foreground": "195.00 66.67% 98.82%",
      "toggle-foreground": "195.00 66.67% 98.82%",
      "toggle-background": "195.00 66.67% 98.82%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "198.75 33.33% 9.41%",
      "gradient-primary": "193.33 100.00% 14.12%",
      "gradient-secondary": "196.00 40.54% 7.25%",
      "modal-gradient-from": "196.00 40.54% 7.25%",
      "modal-gradient-to": "198.75 33.33% 9.41%",
      "mobile-header-gradient-from": "196.00 40.54% 7.25%",
      "mobile-header-gradient-to": "198.75 33.33% 9.41%",
    },
  },
  sapphire: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "225.96 35.73% 50.39%",
      primary: "226.04 70.04% 55.49%",
      "primary-foreground": "240 33.33% 99.41%",
      secondary: "226.04 34% 96%",
      "secondary-hover": "226.04 36% 93%",
      "secondary-active": "226.04 32% 90%",
      "secondary-foreground": "226.04 20% 30%",
      accent: "225.96 55.73% 50.39%",
      "accent-foreground": "240 33.33% 99.41%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "226.04 26% 97%",
      "gradient-primary": "226.04 24% 94%",
      "gradient-secondary": "226.04 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "226.04 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "226.04 26% 97%",
    },
    dark: {
      background: "230 31.03% 11.37%",
      foreground: "223.9 100% 88.96%",
      gray: "218.57 6.25% 43.92%", // slate 9
      border: "225.92 75.38% 74.51%",
      ring: "225.96 35.73% 50.39%",
      modal: "208.78 100.00% 19.22%",
      primary: "226.04 70.04% 55.49%",
      "primary-foreground": "240 33.33% 99.41%",
      secondary: "225.31 50.52% 19.02%",
      "secondary-hover": "208.78 100.00% 19.22%",
      "secondary-active": "224.81 51.63% 30%",
      "secondary-foreground": "223.9 100% 88.96%",
      accent: "224.81 51.63% 30%",
      "accent-foreground": "240 33.33% 99.41%",
      "toggle-foreground": "240 33.33% 99.41%",
      "toggle-background": "240 33.33% 99.41%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "230 31.03% 11.37%",
      "gradient-primary": "208.78 100.00% 19.22%",
      "gradient-secondary": "214.74 42.22% 8.82%",
      "modal-gradient-from": "214.74 42.22% 8.82%",
      "modal-gradient-to": "230 31.03% 11.37%",
      "mobile-header-gradient-from": "214.74 42.22% 8.82%",
      "mobile-header-gradient-to": "230 31.03% 11.37%",
    },
  },
  amethyst: {
    light: {
      background: "0 0% 100%",
      foreground: "220 12% 18%",
      gray: "220 5% 43%",
      border: "220 8% 84%",
      ring: "272.53 32.81% 50.39%",
      primary: "272.00 51.28% 54.12%",
      "primary-foreground": "300.00 50.00% 99.22%",
      secondary: "272.00 34% 96%",
      "secondary-hover": "272.00 36% 93%",
      "secondary-active": "272.00 32% 90%",
      "secondary-foreground": "272.00 20% 30%",
      accent: "272.14 44.80% 49.02%",
      "accent-foreground": "300.00 50.00% 99.22%",
      "toggle-foreground": "220 12% 18%",
      "toggle-background": "0 0% 100%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "272.00 26% 97%",
      "gradient-primary": "272.00 24% 94%",
      "gradient-secondary": "272.00 18% 98%",
      "modal-gradient-from": "0 0% 100%",
      "modal-gradient-to": "272.00 22% 98%",
      "mobile-header-gradient-from": "0 0% 100%",
      "mobile-header-gradient-to": "272.00 26% 97%",
    },
    dark: {
      background: "278.57 25.00% 10.98%",
      foreground: "274.55 76.74% 89.57%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "271.85 60.00% 73.53%",
      ring: "272.53 32.81% 50.39%",
      modal: "276.82 39.29% 21.96%",
      primary: "272.00 51.28% 54.12%",
      "primary-foreground": "300.00 50.00% 99.22%",
      secondary: "278.71 35.63% 17.06%",
      "secondary-hover": "276.82 39.29% 21.96%",
      "secondary-active": "276.47 38.35% 26.08%",
      "secondary-foreground": "274.55 76.74% 89.57%",
      accent: "276.47 38.35% 26.08%",
      "accent-foreground": "300.00 50.00% 99.22%",
      "toggle-foreground": "300.00 50.00% 99.22%",
      "toggle-background": "300.00 50.00% 99.22%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "278.57 25.00% 10.98%",
      "gradient-primary": "276.82 39.29% 21.96%",
      "gradient-secondary": "282.00 22.73% 8.63%",
      "modal-gradient-from": "282.00 22.73% 8.63%",
      "modal-gradient-to": "278.57 25.00% 10.98%",
      "mobile-header-gradient-from": "282.00 22.73% 8.63%",
      "mobile-header-gradient-to": "278.57 25.00% 10.98%",
    },
  },
} as const satisfies ColorValues;

type UpdateCSSThemeVarsOptions = {
  /** Cross-fade via the View Transitions API. Default: false (instant snap). */
  animate?: boolean;
};

function addGlobalTransition() {
  const style = document.createElement("style");
  style.id = "global-transition-style";
  style.textContent = `
    * {
      transition: all 0s !important;
    }
  `;
  document.head.appendChild(style);
}

function changeFavicon(color: COLORS): void {
  const { svg, png } = FAVICON_PATHS[color];
  let link = document.querySelector<HTMLLinkElement>(
    "link#" + DYNAMIC_FAVICON_ID,
  );

  if (!link) {
    link = document.createElement("link");
    link.id = DYNAMIC_FAVICON_ID;
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.sizes.add("any");
    document.head.appendChild(link);
  }

  link.href = svg;

  // Updating only the SVG lets Chrome switch back to a differently colored
  // raster icon. Keep all desktop candidates in sync; leave touch icons alone.
  for (const fallback of document.querySelectorAll<HTMLLinkElement>(
    'link[rel~="icon"]',
  )) {
    if (fallback === link) continue;
    fallback.href = png;
    fallback.type = "image/png";
    fallback.sizes.value = "96x96";
  }
}

function updateThemeColorMetaTag(color: string): void {
  let metaThemeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );

  if (!metaThemeColor) {
    metaThemeColor = document.createElement("meta");
    metaThemeColor.name = "theme-color";
    document.head.appendChild(metaThemeColor);
  }

  metaThemeColor.content = `hsl(${color})`;
}

function removeGlobalTransition() {
  const style = document.getElementById("global-transition-style");
  if (style) {
    style.remove();
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canUseViewTransitions(): boolean {
  return (
    typeof document.startViewTransition === "function" &&
    !prefersReducedMotion()
  );
}

let themeTransitionStart = -1;
let themeTransitionEnd = -1;
let latestThemeTransition: ViewTransition | undefined;

function isThemeTransitionPointerEvent(
  event: Pick<Event, "timeStamp">,
): boolean {
  return (
    event.timeStamp >= themeTransitionStart &&
    event.timeStamp <= themeTransitionEnd
  );
}

function applyThemeToDocument(color: COLORS, theme: THEME) {
  // Suppress per-element color transitions so snapshots/snaps stay solid.
  addGlobalTransition();

  const root = document.documentElement;
  root.setAttribute("data-color", color);
  root.setAttribute("data-theme", theme);

  // Clear any legacy inline token overrides so attribute-based CSS wins.
  for (const property of Array.from(root.style)) {
    if (property.startsWith("--")) {
      root.style.removeProperty(property);
    }
  }

  changeFavicon(color);

  const headerColor = getComputedStyle(root)
    .getPropertyValue("--header")
    .trim();
  if (headerColor) {
    updateThemeColorMetaTag(headerColor);
  }

  setTimeout(() => {
    removeGlobalTransition();
  }, 0); // wait for the next event loop tick before removing the transition
}

function updateCSSThemeVars(
  color: COLORS,
  theme: THEME,
  options: UpdateCSSThemeVarsOptions = {},
) {
  if (!(color in FAVICON_PATHS)) {
    throw new Error("Color not found.");
  }

  if (theme !== "light" && theme !== "dark") {
    throw new Error("Theme not found.");
  }

  const root = document.documentElement;
  const alreadyApplied =
    root.getAttribute("data-color") === color &&
    root.getAttribute("data-theme") === theme;

  if (alreadyApplied) {
    // Still refresh favicon / theme-color in case bootstrap skipped them.
    changeFavicon(color);
    const headerColor = getComputedStyle(root)
      .getPropertyValue("--header")
      .trim();
    if (headerColor) {
      updateThemeColorMetaTag(headerColor);
    }
    return;
  }

  const { animate = false } = options;

  if (animate && canUseViewTransitions()) {
    const start = performance.now();
    const transition = document.startViewTransition(() => {
      applyThemeToDocument(color, theme);
    });
    if (!latestThemeTransition) {
      themeTransitionStart = start;
    }
    themeTransitionEnd = Infinity;
    latestThemeTransition = transition;
    const finishTransition = () => {
      if (latestThemeTransition === transition) {
        themeTransitionEnd = performance.now();
        latestThemeTransition = undefined;
      }
    };
    void transition.finished.then(finishTransition, finishTransition);
    return;
  }

  applyThemeToDocument(color, theme);
}

export { isThemeTransitionPointerEvent, updateCSSThemeVars };
export type { UpdateCSSThemeVarsOptions };
