import type { COLORS, THEME } from "~/stores/TabStore";
import { LOGO_PATHS_WITHOUT_TITLE } from "~/utils/logoPaths";

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

// FYI: destructive is the same for all, except for quartz and crimson since they are so red already
// we are using a very dark shade of red for light mode, and a slightly lighter shade for dark mode

// FYI: grays are as follows
// peony, quartz, crimson, amethyst - mauve 9
// saffron - sand 9
// pistachio, verdant - sage 9
// aqua, sapphire - slate 9

// FYI: general radix color values for each variant
// {
//  light: {
//     background: 2,
//     foreground: 12, roughly +10% lightness
//     gray: variable,
//     border: 8,
//     ring: 11, -20% saturation
//     primary: 9,
//     "primary-foreground": 1,
//     secondary: 3,
//     "secondary-hover": 4,
//     "secondary-active": 5,
//     "secondary-foreground": 11,
//     accent: 11,
//     "accent-foreground": 1,
//     "toggle-foreground": 12, roughtly +10% lightness
//     "toggle-background": 2,
//     destructive: variable,
//     "destructive-foreground": variable,
//     header: 4,
//     "gradient-primary": 6,
//     "gradient-secondary": 3,
//     "modal-gradient-from": 2,
//     "modal-gradient-to": 3,
//     "mobile-header-gradient-from": 3,
//     "mobile-header-gradient-to": 4,
//   },
//  dark: {
//     background: 2,
//     foreground: 12, roughly -3% lightness)
//     gray: variable,
//     border: 8, // from light mode
//     ring: 11, // from light mode, -20% saturation
//     modal: 4,
//     primary: 9,
//     "primary-foreground": 1, from light mode
//     secondary: 3,
//     "secondary-hover": 4,
//     "secondary-active": 5,
//     "secondary-foreground": 12, roughly -3% lightness
//     accent: 5,
//     "accent-foreground": 1, from light mode
//     "toggle-foreground": 1, from light mode
//     "toggle-background": 1, from light mode
//     destructive: variable,
//     "destructive-foreground": variable,
//     header: 2,
//     "gradient-primary": 4,
//     "gradient-secondary": 1,
//     "modal-gradient-from": 1,
//     "modal-gradient-to": 2,
//     "mobile-header-gradient-from": 1,
//     "mobile-header-gradient-to": 2,
//   },
// }

// screenshot radix color values:
// {
//  light: {
//     "screenshot-background": 2,
//     "screenshot-foreground": 12, roughly +10% lightness
//     "screenshot-primary-foreground": 1,
//     "screenshot-border": 8,
//     "screenshot-accent": 11,
//     "screenshot-secondary": 5,
//   },
//  dark: {
//     "screenshot-background": 2,
//     "screenshot-foreground": 12, roughly -3% lightness
//     "screenshot-primary-foreground": 1, from light mode
//     "screenshot-border": 8, from light mode
//     "screenshot-accent": 5,
//     "screenshot-secondary": 5,
//   },
// }

// FYI: logo gradient is just primary -> primary -10% lightness

// FYI: near white values are all just level two radix colors for each variant

// FYI: these values are all subject to change, whether it's small foreground tweaks
// or entire rearrangments of color intensities.

export const HEX_COLOR_VALUES: Record<COLORS, string> = {
  peony: "#E93D82",
  quartz: "#E54666",
  crimson: "#E5484D",
  saffron: "#E54D2E",
  pistachio: "#46A758",
  verdant: "#12A594",
  aqua: "#00A2C7",
  sapphire: "#3E63DD",
  amethyst: "#8E4EC6",
} as const satisfies Record<COLORS, string>;

export const NEAR_WHITE_COLOR_VALUES: Record<COLORS, string> = {
  peony: "#FEF7F9",
  quartz: "#FFF7F8",
  crimson: "#FFF7F7",
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
      "screenshot-background": "342.86 77.78% 98.24%",
      "screenshot-foreground": "332.37 63.33% 34.53%",
      "screenshot-primary-foreground": "340.00 100.00% 99.41%",
      "screenshot-border": "335.84 55.40% 72.75%",
      "screenshot-accent": "335.86 75.00% 45.49%",
      "screenshot-secondary": "339.55 81.48% 89.41%",
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
  quartz: {
    light: {
      "screenshot-background": "352.50 100.00% 98.43%",
      "screenshot-foreground": "344.42 62.60% 34.12%",
      "screenshot-primary-foreground": "340.00 100.00% 99.41%",
      "screenshot-border": "347.71 61.48% 73.53%",
      "screenshot-accent": "345.18 69.75% 46.67%",
      "screenshot-secondary": "350.20 100.00% 90.39%",
    },
    dark: {
      "screenshot-background": "346.67 17.65% 10.00%",
      "screenshot-foreground": "339.55 95.65% 87.98%",
      "screenshot-primary-foreground": "340.00 100.00% 99.41%",
      "screenshot-border": "347.71 61.48% 73.53%",
      "screenshot-accent": "342.35 56.67% 23.53%",
      "screenshot-secondary": "342.35 56.67% 23.53%",
    },
  },
  crimson: {
    light: {
      "screenshot-background": "0.00 100.00% 98.43%",
      "screenshot-foreground": "350.65 62.60% 34.12%",
      "screenshot-primary-foreground": "0.00 100.00% 99.41%",
      "screenshot-border": "358.71 69.92% 73.92%",
      "screenshot-accent": "358.15 64.80% 49.02%",
      "screenshot-secondary": "358.80 100.00% 90.20%",
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
      "screenshot-background": "7.5 100% 98.43%",
      "screenshot-foreground": "7.87 49.59% 34.12%",
      "screenshot-primary-foreground": "0 100% 99.41%",
      "screenshot-border": "10.09, 74.83%, 70.39%",
      "screenshot-accent": "9.89 81.74% 45.1%",
      "screenshot-secondary": "10.82 100% 88.04%",
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
  pistachio: {
    light: {
      "screenshot-background": "120.00 42.86% 97.25%",
      "screenshot-foreground": "130.71 30.43% 23.04%",
      "screenshot-primary-foreground": "120.00 60.00% 99.02%",
      "screenshot-border": "130.59 38.12% 56.27%",
      "screenshot-accent": "132.14 50.00% 32.94%",
      "screenshot-secondary": "121.94 40.26% 84.90%",
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
      "screenshot-background": "165.00 50.00% 96.86%",
      "screenshot-foreground": "173.75 64.86% 18.51%",
      "screenshot-primary-foreground": "165.00 66.67% 98.82%",
      "screenshot-border": "171.76 42.15% 52.55%",
      "screenshot-accent": "171.88 100.00% 26.08%",
      "screenshot-secondary": "168.00 54.35% 81.96%",
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
      "screenshot-background": "186.67 52.94% 96.67%",
      "screenshot-foreground": "192.20 69.41% 20.67%",
      "screenshot-primary-foreground": "195.00 66.67% 98.82%",
      "screenshot-border": "189.04 60.33% 52.55%",
      "screenshot-accent": "191.91 80.95% 32.94%",
      "screenshot-secondary": "187.12 66.29% 82.55%",
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
      "screenshot-background": "225 100% 98.43%",
      "screenshot-foreground": "226.23 49.59% 34.12%",
      "screenshot-primary-foreground": "240 33.33% 99.41%",
      "screenshot-border": "225.92 75.38% 74.51%",
      "screenshot-accent": "225.96 55.73% 50.39%",
      "screenshot-secondary": "224 100% 91.18%",
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
      "screenshot-background": "274.29 77.78% 98.24%",
      "screenshot-foreground": "270.00 50.00% 32.10%",
      "screenshot-primary-foreground": "300.00 50.00% 99.22%",
      "screenshot-border": "271.85 60.00% 73.53%",
      "screenshot-accent": "272.14 44.80% 49.02%",
      "screenshot-secondary": "275.00 75.00% 90.59%",
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

const COLOR_VALUES = {
  peony: {
    light: {
      background: "342.86 77.78% 98.24%",
      foreground: "332.37 63.33% 34.53%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "335.84 55.40% 72.75%",
      ring: "336.33 44.86% 47.65%",
      primary: "335.93 79.63% 57.65%",
      "primary-foreground": "340.00 100.00% 99.41%",
      secondary: "340.91 100.00% 95.69%",
      "secondary-hover": "340.59 94.44% 92.94%",
      "secondary-active": "339.55 81.48% 89.41%",
      "secondary-foreground": "335.86 75.00% 45.49%",
      accent: "335.86 75.00% 45.49%",
      "accent-foreground": "340.00 100.00% 99.41%",
      "toggle-foreground": "332.37 63.33% 34.53%",
      "toggle-background": "342.86 77.78% 98.24%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "340.59 94.44% 92.94%",
      "gradient-primary": "338.49 68.83% 84.90%",
      "gradient-secondary": "340.91 100.00% 95.69%",
      "modal-gradient-from": "342.86 77.78% 98.24%",
      "modal-gradient-to": "340.91 100.00% 95.69%",
      "mobile-header-gradient-from": "342.86 77.78% 98.24%",
      "mobile-header-gradient-to": "340.59 94.44% 92.94%",
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
  quartz: {
    light: {
      background: "352.50 100.00% 98.43%",
      foreground: "344.42 62.60% 34.12%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "347.71 61.48% 73.53%",
      ring: "348.11 44.94% 48.43%",
      primary: "347.92 75.36% 58.63%",
      "primary-foreground": "340.00 100.00% 99.41%",
      secondary: "351.00 90.91% 95.69%",
      "secondary-hover": "351.43 100.00% 93.14%",
      "secondary-active": "350.20 100.00% 90.39%",
      "secondary-foreground": "345.18 69.75% 46.67%",
      accent: "345.18 69.75% 46.67%",
      "accent-foreground": "340.00 100.00% 99.41%",
      "toggle-foreground": "344.42 62.60% 24.12%",
      "toggle-background": "352.50 100.00% 98.43%",
      destructive: "350.65 62.6% 24.12%",
      "destructive-foreground": "0 100% 99.41%",
      header: "351.43 100.00% 93.14%",
      "gradient-primary": "350.53 80.28% 86.08%",
      "gradient-secondary": "351.00 90.91% 95.69%",
      "modal-gradient-from": "352.50 100.00% 98.43%",
      "modal-gradient-to": "351.00 90.91% 95.69%",
      "mobile-header-gradient-from": "351.00 90.91% 95.69%",
      "mobile-header-gradient-to": "351.43 100.00% 93.14%",
    },
    dark: {
      background: "346.67 17.65% 10.00%",
      foreground: "339.55 95.65% 87.98%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "347.71 61.48% 73.53%",
      ring: "348.11 44.94% 48.43%",
      modal: "341.69 60.82% 19.02%",
      primary: "347.92 75.36% 58.63%",
      "primary-foreground": "340.00 100.00% 99.41%",
      secondary: "344.21 48.72% 15.29%",
      "secondary-hover": "341.69 60.82% 19.02%",
      "secondary-active": "342.35 56.67% 23.53%",
      "secondary-foreground": "339.55 95.65% 87.98%",
      accent: "342.35 56.67% 23.53%",
      "accent-foreground": "340.00 100.00% 99.41%",
      "toggle-foreground": "340.00 100.00% 99.41%",
      "toggle-background": "340.00 100.00% 99.41%",
      destructive: "358.15 64.8% 49.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "346.67 17.65% 10.00%",
      "gradient-primary": "341.69 60.82% 19.02%",
      "gradient-secondary": "345.00 19.05% 8.24%",
      "modal-gradient-from": "345.00 19.05% 8.24%",
      "modal-gradient-to": "346.67 17.65% 10.00%",
      "mobile-header-gradient-from": "345.00 19.05% 8.24%",
      "mobile-header-gradient-to": "346.67 17.65% 10.00%",
    },
  },
  crimson: {
    light: {
      background: "0.00 100.00% 98.43%",
      foreground: "350.65 62.60% 34.12%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "358.71 69.92% 73.92%",
      ring: "358.39 44.80% 49.02%",
      primary: "358.09 75.12% 59.02%",
      "primary-foreground": "0.00 100.00% 99.41%",
      secondary: "356.84 90.48% 95.88%",
      "secondary-hover": "358.33 100.00% 92.94%",
      "secondary-active": "358.80 100.00% 90.20%",
      "secondary-foreground": "358.15 64.80% 49.02%",
      accent: "358.15 64.80% 49.02%",
      "accent-foreground": "0.00 100.00% 99.41%",
      "toggle-foreground": "350.65 62.60% 34.12%",
      "toggle-background": "0.00 100.00% 98.43%",
      destructive: "350.65 62.6% 24.12%",
      "destructive-foreground": "0 100% 99.41%",
      header: "358.33 100.00% 92.94%",
      "gradient-primary": "359.06 94.12% 86.67%",
      "gradient-secondary": "356.84 90.48% 95.88%",
      "modal-gradient-from": "0.00 100.00% 98.43%",
      "modal-gradient-to": "356.84 90.48% 95.88%",
      "mobile-header-gradient-from": "356.84 90.48% 95.88%",
      "mobile-header-gradient-to": "358.33 100.00% 92.94%",
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
      background: "7.5 100% 98.43%",
      foreground: "7.87 49.59% 34.12%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "10.09, 74.83%, 70.39%",
      ring: "9.89 61.74% 45.1%",
      primary: "10.16 77.87% 53.92%",
      "primary-foreground": "0 100% 99.41%",
      secondary: "10.43 92% 95.1%",
      "secondary-hover": "12.27 100% 91.37%",
      "secondary-active": "10.82 100% 88.04%",
      "secondary-foreground": "9.89 81.74% 45.1%",
      accent: "9.89 81.74% 45.1%",
      "accent-foreground": "0 100% 99.41%",
      "toggle-foreground": "7.87 49.59% 34.12%",
      "toggle-background": "7.5 100% 98.43%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "12.27 100% 91.37%",
      "gradient-primary": "10.77 95.12% 83.92%",
      "gradient-secondary": "10.43 92% 95.1%",
      "modal-gradient-from": "7.5 100% 98.43%",
      "modal-gradient-to": "10.43 92% 95.1%",
      "mobile-header-gradient-from": "10.43 92% 95.1%",
      "mobile-header-gradient-to": "12.27 100% 91.37%",
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
  pistachio: {
    light: {
      background: "120.00 42.86% 97.25%",
      foreground: "130.71 30.43% 23.04%",
      gray: "156.92 6.16% 41.37%", // sage 9
      border: "130.59 38.12% 56.27%",
      ring: "131.19 32.24% 35.88%",
      primary: "131.13 40.93% 46.47%",
      "primary-foreground": "120.00 60.00% 99.02%",
      secondary: "120.00 41.94% 93.92%",
      "secondary-hover": "122.61 45.10% 90.00%",
      "secondary-active": "121.94 40.26% 84.90%",
      "secondary-foreground": "132.14 50.00% 32.94%",
      accent: "132.14 50.00% 32.94%",
      "accent-foreground": "120.00 60.00% 99.02%",
      "toggle-foreground": "130.71 30.43% 23.04%",
      "toggle-background": "120.00 42.86% 97.25%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "122.61 45.10% 90.00%",
      "gradient-primary": "124.19 38.74% 78.24%",
      "gradient-secondary": "120.00 41.94% 93.92%",
      "modal-gradient-from": "120.00 42.86% 97.25%",
      "modal-gradient-to": "120.00 41.94% 93.92%",
      "mobile-header-gradient-from": "120.00 41.94% 93.92%",
      "mobile-header-gradient-to": "122.61 45.10% 90.00%",
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
      background: "165.00 50.00% 96.86%",
      foreground: "173.75 64.86% 18.51%",
      gray: "156.92 6.16% 41.37%", // sage 9
      border: "171.76 42.15% 52.55%",
      ring: "172.98 59.49% 30.98%",
      primary: "173.06 80.33% 35.88%",
      "primary-foreground": "165.00 66.67% 98.82%",
      secondary: "167.50 63.16% 92.55%",
      "secondary-hover": "166.15 61.90% 87.65%",
      "secondary-active": "168.00 54.35% 81.96%",
      "secondary-foreground": "171.88 100.00% 26.08%",
      accent: "171.88 100.00% 26.08%",
      "accent-foreground": "165.00 66.67% 98.82%",
      "toggle-foreground": "173.75 64.86% 18.51%",
      "toggle-background": "165.00 50.00% 96.86%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "166.15 61.90% 87.65%",
      "gradient-primary": "168.20 48.03% 75.10%",
      "gradient-secondary": "167.50 63.16% 92.55%",
      "modal-gradient-from": "165.00 50.00% 96.86%",
      "modal-gradient-to": "167.50 63.16% 92.55%",
      "mobile-header-gradient-from": "167.50 63.16% 92.55%",
      "mobile-header-gradient-to": "166.15 61.90% 87.65%",
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
      background: "186.67 52.94% 96.67%",
      foreground: "192.20 69.41% 20.67%",
      gray: "218.57 6.25% 43.92%", // slate 9
      border: "189.04 60.33% 52.55%",
      ring: "192.09 80.35% 33.92%",
      primary: "191.16 100.00% 39.02%",
      "primary-foreground": "195.00 66.67% 98.82%",
      secondary: "184.44 69.23% 92.35%",
      "secondary-hover": "186.82 70.97% 87.84%",
      "secondary-active": "187.12 66.29% 82.55%",
      "secondary-foreground": "191.91 80.95% 32.94%",
      accent: "191.91 80.95% 32.94%",
      "accent-foreground": "195.00 66.67% 98.82%",
      "toggle-foreground": "192.20 69.41% 20.67%",
      "toggle-background": "186.67 52.94% 96.67%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "186.82 70.97% 87.84%",
      "gradient-primary": "188.11 60.66% 76.08%",
      "gradient-secondary": "184.44 69.23% 92.35%",
      "modal-gradient-from": "186.67 52.94% 96.67%",
      "modal-gradient-to": "184.44 69.23% 92.35%",
      "mobile-header-gradient-from": "184.44 69.23% 92.35%",
      "mobile-header-gradient-to": "186.82 70.97% 87.84%",
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
      background: "225 100% 98.43%",
      foreground: "226.23 49.59% 34.12%",
      gray: "218.57 6.25% 43.92%", // slate 9
      border: "225.92 75.38% 74.51%",
      ring: "225.96 35.73% 50.39%",
      primary: "226.04 70.04% 55.49%",
      "primary-foreground": "240 33.33% 99.41%",
      secondary: "222.35 89.47% 96.27%",
      "secondary-hover": "224 100% 94.12%",
      "secondary-active": "224 100% 91.18%",
      "secondary-foreground": "225.96 55.73% 50.39%",
      accent: "225.96 55.73% 50.39%",
      "accent-foreground": "240 33.33% 99.41%",
      "toggle-foreground": "226.23 49.59% 34.12%",
      "toggle-background": "225 100% 98.43%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "224 100% 94.12%",
      "gradient-primary": "207.00 93.02% 83.14%",
      "gradient-secondary": "222.35 89.47% 96.27%",
      "modal-gradient-from": "225 100% 98.43%",
      "modal-gradient-to": "222.35 89.47% 96.27%",
      "mobile-header-gradient-from": "222.35 89.47% 96.27%",
      "mobile-header-gradient-to": "224 100% 94.12%",
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
      background: "274.29 77.78% 98.24%",
      foreground: "270.00 50.00% 32.10%",
      gray: "250.91 4.8% 44.9%", // mauve 9
      border: "271.85 60.00% 73.53%",
      ring: "272.53 32.81% 50.39%",
      primary: "272.00 51.28% 54.12%",
      "primary-foreground": "300.00 50.00% 99.22%",
      secondary: "275.29 89.47% 96.27%",
      "secondary-hover": "276.92 81.25% 93.73%",
      "secondary-active": "275.00 75.00% 90.59%",
      "secondary-foreground": "272.14 44.80% 49.02%",
      accent: "272.14 44.80% 49.02%",
      "accent-foreground": "300.00 50.00% 99.22%",
      "toggle-foreground": "270.00 50.00% 32.10%",
      "toggle-background": "274.29 77.78% 98.24%",
      destructive: "358.09 75.12% 59.02%",
      "destructive-foreground": "0 100% 99.41%",
      header: "276.92 81.25% 93.73%",
      "gradient-primary": "275.00 68.57% 86.27%",
      "gradient-secondary": "275.29 89.47% 96.27%",
      "modal-gradient-from": "274.29 77.78% 98.24%",
      "modal-gradient-to": "275.29 89.47% 96.27%",
      "mobile-header-gradient-from": "275.29 89.47% 96.27%",
      "mobile-header-gradient-to": "276.92 81.25% 93.73%",
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

export function updateCSSThemeVars(color: COLORS, theme: THEME) {
  const colors = COLOR_VALUES[color][theme];

  if (!colors) {
    throw new Error(`Color "${color}" or theme "${theme}" not found.`);
  }

  addGlobalTransition();

  Object.entries(colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, `${value}`);
  });

  changeFavicon(LOGO_PATHS_WITHOUT_TITLE[color]);

  setTimeout(() => {
    removeGlobalTransition();
  }, 0); // wait for the next event loop tick before removing the transition
}

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

function changeFavicon(url: string): void {
  // Try to find an existing favicon link element
  let link: HTMLLinkElement | null =
    document.querySelector("link[rel~='icon']");

  if (!link) {
    // If not found, create a new link element
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.href = url;
}

function removeGlobalTransition() {
  const style = document.getElementById("global-transition-style");
  if (style) {
    style.remove();
  }
}
