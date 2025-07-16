// first-level comments are the radix color names, keys are user-facing names

export const SCREENSHOT_COLORS = {
  // crimson
  peony: {
    light: {
      "screenshot-muted": "341 94% 93%", // 4
      "screenshot-foreground": "332 63% 34%", // 12
      "screenshot-primary-foreground": "340 100% 99%", // 1
      "screenshot-border": "336 55% 73%", // 8
      "screenshot-accent": "336 75% 45%", // 11
      "screenshot-secondary": "341 81% 89%", // 5
    },
    dark: {
      "screenshot-muted": "337 25% 10%", // 2
      "screenshot-foreground": "330 91% 88%", // 12
      "screenshot-primary-foreground": "340 100% 99%", // 1
      "screenshot-border": "336 55% 73%", // 8
      "screenshot-accent": "331 59% 23%", // 5
      "screenshot-secondary": "331 59% 23%", // 5
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
} as const;

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
      ring: "336 45% 48%", // 8 (dark)
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

      // gradients
      "gradient-primary": "338 69% 85%", // 6
      "gradient-secondary": "341 100% 96%", // 3
      "modal-gradient-from": "341 100% 96%", // 3
      "modal-gradient-to": "341 94% 93%", // 4
      "mobile-header-gradient-from": "341 94% 93%", // 4
      "mobile-header-gradient-to": "341 94% 93%", // 4
      "header-footer-gradient-from": "341 100% 96%", // 3
      "header-footer-gradient-to": "341 94% 93%", // 4
    },
    dark: {
      background: "337 25% 10%", // 2
      foreground: "330 91% 88%", // 12
      gray: "249 6% 57%", // muave 9
      muted: "337 25% 10%", // 2
      skeleton: "330 91% 88%", // 12
      border: "336 55% 73%", // 8 (light)
      ring: "336 45% 48%", // 8
      modal: "331 62% 19%", // 4
      primary: "335.93 79.63% 57.65%", // 9
      "primary-foreground": "340 100% 99%", // 1
      secondary: "333 45% 15%", // 3
      "secondary-hover": "331 62% 19%", // 4
      "secondary-active": "331 59% 23%", // 5
      "secondary-foreground": "330 91% 88%", // 12
      accent: "331 59% 23%", // 5
      "accent-foreground": "340 100% 99%", // 1 (light)
      destructive: "0 90% 50%", // TODO/TBD
      "destructive-foreground": "324 77% 95%", // TODO/TBD

      // gradients
      "gradient-primary": "331 62% 19%", // 4
      "gradient-secondary": "338 19% 8%", // 1
      "modal-gradient-from": "338 19% 8%", // 1
      "modal-gradient-to": "337 25% 10%", // 2
      "mobile-header-gradient-from": "338 19% 8%", // 1
      "mobile-header-gradient-to": "337 25% 10%", // 2
      "header-footer-gradient-from": "338 19% 8%", // 1
      "header-footer-gradient-to": "337 25% 10%", // 2
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
} as const;

type Colors = typeof COLOR_VALUES;

export function updateCSSThemeVars(
  color: keyof Colors,
  theme: "light" | "dark",
) {
  const colors = COLOR_VALUES[color][theme];

  if (!colors) {
    throw new Error(`Color "${color}" or theme "${theme}" not found.`);
  }

  addGlobalTransition();

  Object.entries(colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, `${value}`);
  });

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

function removeGlobalTransition() {
  const style = document.getElementById("global-transition-style");
  if (style) {
    style.remove();
  }
}
