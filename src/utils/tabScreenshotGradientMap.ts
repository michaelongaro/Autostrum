import type { COLORS, THEME } from "~/stores/TabStore";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

type RGB = readonly [number, number, number];

interface GradientMap {
  red: string;
  green: string;
  blue: string;
}

// All cards with the same palette share the tables; no per-image pixel reads
// or recalculation on hover, image load, or other card updates.
const gradientMaps = new Map<string, GradientMap>();

function hslToRGB(value: string): RGB {
  const components = value.split(/[\s,%]+/);
  const hue = Number(components[0]);
  const saturation = Number(components[1]) / 100;
  const lightness = Number(components[2]) / 100;
  const amplitude = saturation * Math.min(lightness, 1 - lightness);

  function channel(offset: number) {
    const position = (offset + hue / 30) % 12;
    return (
      lightness -
      amplitude * Math.max(-1, Math.min(position - 3, 9 - position, 1))
    );
  }

  return [channel(0), channel(8), channel(4)];
}

function composite(foreground: RGB, background: RGB, alpha: number): RGB {
  return [
    foreground[0] * alpha + background[0] * (1 - alpha),
    foreground[1] * alpha + background[1] * (1 - alpha),
    foreground[2] * alpha + background[2] * (1 - alpha),
  ];
}

export function getTabScreenshotGradientMap(
  color: COLORS,
  theme: THEME,
): GradientMap {
  const cacheKey = `${color}:${theme}`;
  const cached = gradientMaps.get(cacheKey);
  if (cached) return cached;

  // StaticTab captures maple/light and maple/dark through CSS grayscale().
  // Match that sRGB grayscale operation, rather than HSL lightness or linear
  // luminance, and anchor the lookup at the resulting 8-bit screenshot values.
  const source = SCREENSHOT_COLORS.maple[theme];
  const target = SCREENSHOT_COLORS[color][theme];
  const sourceColors = {
    background: hslToRGB(source["screenshot-background"]),
    foreground: hslToRGB(source["screenshot-foreground"]),
    secondary: hslToRGB(source["screenshot-secondary"]),
  };
  const targetColors = {
    background: hslToRGB(target["screenshot-background"]),
    foreground: hslToRGB(target["screenshot-foreground"]),
    secondary: hslToRGB(target["screenshot-secondary"]),
  };
  const anchors = new Map<number, RGB>();

  function addAnchor(sourceRGB: RGB, targetRGB: RGB) {
    const gray = Math.round(
      (0.2126 * sourceRGB[0] + 0.7152 * sourceRGB[1] + 0.0722 * sourceRGB[2]) *
        255,
    );
    anchors.set(gray, targetRGB);
  }

  for (const key of Object.keys(source) as Array<keyof typeof source>) {
    addAnchor(hslToRGB(source[key]), hslToRGB(target[key]));
  }

  // Panels use translucent secondary fills. Staff lines use 50% foreground,
  // both on the page and inside those panels, so anchor their composite colors
  // too instead of treating them as fully opaque theme tokens.
  for (const panelAlpha of [0, 0.15, 0.25]) {
    const sourcePanel = composite(
      sourceColors.secondary,
      sourceColors.background,
      panelAlpha,
    );
    const targetPanel = composite(
      targetColors.secondary,
      targetColors.background,
      panelAlpha,
    );
    addAnchor(sourcePanel, targetPanel);
    addAnchor(
      composite(sourceColors.foreground, sourcePanel, 0.5),
      composite(targetColors.foreground, targetPanel, 0.5),
    );
  }

  const stops = Array.from(anchors, ([gray, rgb]) => ({ gray, rgb })).sort(
    (a, b) => a.gray - b.gray,
  );
  const red: string[] = [];
  const green: string[] = [];
  const blue: string[] = [];

  // SVG table entries are equally spaced, while our palette anchors are not.
  // Resample to all 256 input levels so the original gray values hit their
  // target colors and intermediate/antialiased pixels interpolate smoothly.
  for (let gray = 0; gray <= 255; gray++) {
    let lower = stops[0]!;
    let upper = lower;
    for (const stop of stops) {
      upper = stop;
      if (stop.gray >= gray) break;
      lower = stop;
    }
    const amount =
      upper.gray === lower.gray
        ? 0
        : (gray - lower.gray) / (upper.gray - lower.gray);
    const interpolate = (channel: number) =>
      (
        lower.rgb[channel]! +
        (upper.rgb[channel]! - lower.rgb[channel]!) * amount
      ).toFixed(4);

    red.push(interpolate(0));
    green.push(interpolate(1));
    blue.push(interpolate(2));
  }

  const result = {
    red: red.join(" "),
    green: green.join(" "),
    blue: blue.join(" "),
  };
  gradientMaps.set(cacheKey, result);
  return result;
}
