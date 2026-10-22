import type { COLORS } from "~/stores/TabStore";

export const DYNAMIC_FAVICON_ID = "dynamic-favicon";

// Chrome can prefer a raster fallback after decoding the SVG. Keep the artwork
// square and every browser favicon candidate on the same selected color.
export const FAVICON_PATHS = {
  peony: { svg: "/favicons/peony.svg", png: "/favicons/peony.png" },
  coral: { svg: "/favicons/coral.svg", png: "/favicons/coral.png" },
  maple: { svg: "/favicon.svg", png: "/favicon-96x96.png" },
  saffron: { svg: "/favicons/saffron.svg", png: "/favicons/saffron.png" },
  pistachio: { svg: "/favicons/pistachio.svg", png: "/favicons/pistachio.png" },
  verdant: { svg: "/favicons/verdant.svg", png: "/favicons/verdant.png" },
  aqua: { svg: "/favicons/aqua.svg", png: "/favicons/aqua.png" },
  sapphire: { svg: "/favicons/sapphire.svg", png: "/favicons/sapphire.png" },
  amethyst: { svg: "/favicons/amethyst.svg", png: "/favicons/amethyst.png" },
} as const satisfies Record<COLORS, { svg: string; png: string }>;
