// comments are the radix color names

const COLOR_VALUES = {
  // crimson
  peony: {
    light: {
      background: "343 78% 98%", // 2
      foreground: "332 63% 34%", // 12
      gray: "249 6% 57%", // muave 9
      muted: "341 94% 93%", // 4
      skeleton: "341 81% 89%", // 5
      border: "336 55% 73%", // 8
      ring: "338 69% 85%", // 6
      primary: "336 80% 58%", // 9
      "primary-foreground": "340 100% 99%", // 1
      secondary: "341 100% 96%", // 3
      "secondary-hover": "341 94% 93%", // 4
      "secondary-active": "341 81% 89%", // 5
      "secondary-foreground": "336 75% 45%", // 11
      accent: "336 75% 45%", // 11
      "accent-foreground": "340 100% 99%", // 1
      destructive: "0 90% 50%", // TODO/TBD
      "destructive-foreground": "324 77% 95%", // TODO/TBD
      "gradient-primary": "341 94% 93%", // 4
      "gradient-secondary": "340 100% 99%", // 1
    },
    dark: {
      background: "337 25% 10%", // 2
      foreground: "330 91% 88%", // 12
      gray: "249 6% 57%", // muave 9
      muted: "337 25% 10%", // 2
      skeleton: "330 91% 88%", // 12
      border: "336 55% 73%", // 8 (light)
      ring: "333 49% 29%", // 6
      primary: "336 80% 58%", // 9
      "primary-foreground": "340 100% 99%", // 1
      secondary: "333 45% 15%", // 3
      "secondary-hover": "331 62% 19%", // 4
      "secondary-active": "331 59% 23%", // 5
      "secondary-foreground": "345 100% 79%", // 11
      accent: "331 59% 23%", // 5
      "accent-foreground": "340 100% 99%", // 1
      destructive: "0 90% 50%", // TODO/TBD
      "destructive-foreground": "324 77% 95%", // TODO/TBD
      "gradient-primary": "331 62% 19%", // 4
      "gradient-secondary": "338 19% 8%", // 1
    },
  },
  // ruby
  quartz: {},
  // red
  crimson: {},
  // orange
  saffron: {},
  // grass
  pistachio: {},
  // teal
  verdant: {},
  // cyan
  aqua: {},
  // blue
  azure: {},
  // purple
  amethyst: {},
};

export function updateCSSThemeVars() {
  // TODO
}
