// FYI: keeping this just in case we need to reference it later

// in updateCSSThemeVars.ts:
// grays should be as follows
// peony, quartz, crimson, amethyst - mauve 9
// saffron - sand 9
// pistachio, verdant - sage 9
// aqua, azure - slate 9

type ColorShades = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

type ColorScale = {
  light: ColorShades;
  dark: ColorShades;
};

type ColorScaleInput = Record<string, ColorScale>;

type SpecialValues = {
  gray: string; // e.g., "249 6% 57%" (muave 9)
  destructive: string; // e.g., "0 90% 50%"
  destructiveForeground: string; // e.g., "324 77% 95%"
};

function generateColorValues(
  colorScales: ColorScaleInput,
  specialValues: SpecialValues,
) {
  const colorValues = {};
  const screenshotColors = {};

  // Level mappings based on your peony example
  const colorValuesMappings = {
    light: {
      background: { level: 2, theme: "light" },
      foreground: { level: 12, theme: "light" },
      gray: { special: "gray" },
      muted: { level: 4, theme: "light" },
      skeleton: { level: 5, theme: "light" },
      border: { level: 8, theme: "light" },
      ring: { level: 8, theme: "dark" }, // uses dark theme's level 8
      primary: { level: 9, theme: "light" },
      "primary-foreground": { level: 1, theme: "light" },
      secondary: { level: 3, theme: "light" },
      "secondary-hover": { level: 4, theme: "light" },
      "secondary-active": { level: 5, theme: "light" },
      "secondary-foreground": { level: 11, theme: "light" },
      accent: { level: 11, theme: "light" },
      "accent-foreground": { level: 1, theme: "light" },
      "toggle-foreground": { level: 12, theme: "light" },
      "toggle-background": { level: 2, theme: "light" },
      destructive: { special: "destructive" },
      "destructive-foreground": { special: "destructiveForeground" },
      "gradient-primary": { level: 6, theme: "light" },
      "gradient-secondary": { level: 3, theme: "light" },
      "modal-gradient-from": { level: 3, theme: "light" },
      "modal-gradient-to": { level: 4, theme: "light" },
      "mobile-header-gradient-from": { level: 4, theme: "light" },
      "mobile-header-gradient-to": { level: 4, theme: "light" },
      "header-footer-gradient-from": { level: 3, theme: "light" },
      "header-footer-gradient-to": { level: 4, theme: "light" },
    },
    dark: {
      background: { level: 2, theme: "dark" },
      foreground: { level: 12, theme: "dark" },
      gray: { special: "gray" },
      muted: { level: 2, theme: "dark" },
      skeleton: { level: 12, theme: "dark" },
      border: { level: 8, theme: "light" }, // uses light theme's level 8
      ring: { level: 8, theme: "dark" },
      modal: { level: 4, theme: "dark" },
      primary: { level: 9, theme: "dark" },
      "primary-foreground": { level: 1, theme: "light" },
      secondary: { level: 3, theme: "dark" },
      "secondary-hover": { level: 4, theme: "dark" },
      "secondary-active": { level: 5, theme: "dark" },
      "secondary-foreground": { level: 12, theme: "dark" },
      accent: { level: 5, theme: "dark" },
      "accent-foreground": { level: 1, theme: "light" },
      "toggle-foreground": { level: 1, theme: "light" },
      "toggle-background": { level: 1, theme: "light" },
      destructive: { special: "destructive" },
      "destructive-foreground": { special: "destructiveForeground" },
      "gradient-primary": { level: 4, theme: "dark" },
      "gradient-secondary": { level: 1, theme: "dark" },
      "modal-gradient-from": { level: 1, theme: "dark" },
      "modal-gradient-to": { level: 2, theme: "dark" },
      "mobile-header-gradient-from": { level: 1, theme: "dark" },
      "mobile-header-gradient-to": { level: 2, theme: "dark" },
      "header-footer-gradient-from": { level: 1, theme: "dark" },
      "header-footer-gradient-to": { level: 2, theme: "dark" },
    },
  };

  const screenshotMappings = {
    light: {
      "screenshot-muted": { level: 4, theme: "light" },
      "screenshot-foreground": { level: 12, theme: "light" },
      "screenshot-primary-foreground": { level: 1, theme: "light" },
      "screenshot-border": { level: 8, theme: "light" },
      "screenshot-accent": { level: 11, theme: "light" },
      "screenshot-secondary": { level: 5, theme: "light" },
    },
    dark: {
      "screenshot-muted": { level: 2, theme: "dark" },
      "screenshot-foreground": { level: 12, theme: "dark" },
      "screenshot-primary-foreground": { level: 1, theme: "light" },
      "screenshot-border": { level: 8, theme: "light" },
      "screenshot-accent": { level: 5, theme: "dark" },
      "screenshot-secondary": { level: 5, theme: "dark" },
    },
  };

  Object.entries(colorScales).forEach(([colorName, scales]) => {
    colorValues[colorName] = { light: {}, dark: {} };
    screenshotColors[colorName] = { light: {}, dark: {} };

    // Process COLOR_VALUES
    (["light", "dark"] as const).forEach((theme) => {
      Object.entries(colorValuesMappings[theme]).forEach(([key, mapping]) => {
        if ("special" in mapping) {
          colorValues[colorName][theme][key] =
            specialValues[mapping.special as keyof SpecialValues];
        } else {
          const hexColor = scales[mapping.theme][mapping.level - 1]; // Convert to 0-based index
          colorValues[colorName][theme][key] = hexToHsl(hexColor);
        }
      });
    });

    // Process SCREENSHOT_COLORS
    (["light", "dark"] as const).forEach((theme) => {
      Object.entries(screenshotMappings[theme]).forEach(([key, mapping]) => {
        const hexColor = scales[mapping.theme][mapping.level - 1]; // Convert to 0-based index
        screenshotColors[colorName][theme][key] = hexToHsl(hexColor);
      });
    });
  });

  return {
    COLOR_VALUES: colorValues,
    SCREENSHOT_COLORS: screenshotColors,
  };
}

function hexToHsl(hex: string): string {
  // Remove leading '#' if present
  hex = hex.replace(/^#/, "");

  // Expand shorthand hex (3 or 4 digits) to full form
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Only use first 6 characters for RGB
  if (hex.length !== 6 && hex.length !== 8) {
    throw new Error("Invalid hex color.");
  }

  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Convert to degrees, percent
  const hDeg = h * 360;
  const sPerc = s * 100;
  const lPerc = l * 100;

  return `${hDeg.toFixed(2)} ${sPerc.toFixed(2)}% ${lPerc.toFixed(2)}%`;
}

const colorScales = {
  peony: {
    light: [
      "#FFFCFD",
      "#FEF7F9",
      "#FFE9F0",
      "#FEDCE7",
      "#FACEDD",
      "#F3BED1",
      "#EAACC3",
      "#E093B2",
      "#E93D82",
      "#DF3478",
      "#CB1D63",
      "#621639",
    ],
    dark: [
      "#191114",
      "#201318",
      "#381525",
      "#4D122F",
      "#5C1839",
      "#6D2545",
      "#873356",
      "#B0436E",
      "#E93D82",
      "#EE518A",
      "#FF92AD",
      "#FDD3E8",
    ],
  },
  quartz: {
    light: [
      "#FFFCFD",
      "#FFF7F8",
      "#FEEAED",
      "#FFDCE1",
      "#FFCED6",
      "#F8BFC8",
      "#EFACB8",
      "#E592A3",
      "#E54666",
      "#DC3B5D",
      "#CA244D",
      "#64172B",
    ],
    dark: [
      "#191113",
      "#1E1517",
      "#3A141E",
      "#4E1325",
      "#5E1A2E",
      "#6F2539",
      "#883447",
      "#B3445A",
      "#E54666",
      "#EC5A72",
      "#FF949D",
      "#FED2E1",
    ],
  },
  crimson: {
    light: [
      "#FFFCFC",
      "#FFF7F7",
      "#FEEBEC",
      "#FFDBDC",
      "#FFCDCE",
      "#FDBDBE",
      "#F4A9AA",
      "#EB8E90",
      "#E5484D",
      "#DC3E42",
      "#CE2C31",
      "#641723",
    ],
    dark: [
      "#191111",
      "#201314",
      "#3B1219",
      "#500F1C",
      "#611623",
      "#72232D",
      "#8C333A",
      "#B54548",
      "#E5484D",
      "#EC5D5E",
      "#FF9592",
      "#FFD1D9",
    ],
  },
  saffron: {
    light: [
      "#FEFCFB",
      "#FFF7ED",
      "#FFEFD6",
      "#FFDFB5",
      "#FFD19A",
      "#FFC182",
      "#F5AE73",
      "#EC9455",
      "#F76B15",
      "#EF5F00",
      "#CC4E00",
      "#582D1D",
    ],
    dark: [
      "#17120E",
      "#1E160F",
      "#331E0B",
      "#462100",
      "#562800",
      "#66350C",
      "#7E451D",
      "#A35829",
      "#F76B15",
      "#FF801F",
      "#FFA057",
      "#FFE0C2",
    ],
  },
  pistachio: {
    light: [
      "#FBFEFB",
      "#F5FBF5",
      "#E9F6E9",
      "#DAF1DB",
      "#C9E8CA",
      "#B2DDB5",
      "#94CE9A",
      "#65BA74",
      "#46A758",
      "#3E9B4F",
      "#2A7E3B",
      "#203C25",
    ],
    dark: [
      "#0E1511",
      "#141A15",
      "#1B2A1E",
      "#1D3A24",
      "#25482D",
      "#2D5736",
      "#366740",
      "#3E7949",
      "#46A758",
      "#53B365",
      "#71D083",
      "#C2F0C2",
    ],
  },
  verdant: {
    light: [
      "#FAFEFD",
      "#F3FBF9",
      "#E0F8F3",
      "#CCF3EA",
      "#B8EAE0",
      "#A1DED2",
      "#83CDC1",
      "#53B9AB",
      "#12A594",
      "#0D9B8A",
      "#008573",
      "#0D3D38",
    ],
    dark: [
      "#0D1514",
      "#111C1B",
      "#0D2D2A",
      "#023B37",
      "#084843",
      "#145750",
      "#1C6961",
      "#207E73",
      "#12A594",
      "#0EB39E",
      "#0BD8B6",
      "#ADF0DD",
    ],
  },
  aqua: {
    light: [
      "#FAFDFE",
      "#F2FAFB",
      "#DEF7F9",
      "#CAF1F6",
      "#B5E9F0",
      "#9DDDE7",
      "#7DCEDC",
      "#3DB9CF",
      "#00A2C7",
      "#0797B9",
      "#107D98",
      "#0D3C48",
    ],
    dark: [
      "#0B161A",
      "#101B20",
      "#082C36",
      "#003848",
      "#004558",
      "#045468",
      "#12677E",
      "#11809C",
      "#00A2C7",
      "#23AFD0",
      "#4CCCE6",
      "#B6ECF7",
    ],
  },
  azure: {
    light: [
      "#FBFDFF",
      "#F4FAFF",
      "#E6F4FE",
      "#D5EFFF",
      "#C2E5FF",
      "#ACD8FC",
      "#8EC8F6",
      "#5EB1EF",
      "#0090FF",
      "#0588F0",
      "#0D74CE",
      "#113264",
    ],
    dark: [
      "#0D1520",
      "#111927",
      "#0D2847",
      "#003362",
      "#004074",
      "#104D87",
      "#205D9E",
      "#2870BD",
      "#0090FF",
      "#3B9EFF",
      "#70B8FF",
      "#C2E6FF",
    ],
  },
  amethyst: {
    light: [
      "#FEFCFE",
      "#FBF7FE",
      "#F7EDFE",
      "#F2E2FC",
      "#EAD5F9",
      "#E0C4F4",
      "#D1AFEC",
      "#BE93E4",
      "#8E4EC6",
      "#8347B9",
      "#8145B5",
      "#402060",
    ],
    dark: [
      "#18111B",
      "#1E1523",
      "#301C3B",
      "#3D224E",
      "#48295C",
      "#54346B",
      "#664282",
      "#8457AA",
      "#8E4EC6",
      "#9A5CD0",
      "#D19DFF",
      "#ECD9FA",
    ],
  },
};

const specialValues = {
  gray: "249 6% 57%",
  destructive: "0 90% 50%",
  destructiveForeground: "324 77% 95%",
};

const result = generateColorValues(colorScales, specialValues);
console.log(result.COLOR_VALUES);
console.log(result.SCREENSHOT_COLORS);
