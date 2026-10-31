// Increment the format when capture geometry, roles, or atlas layout changes.
export const TAB_SCREENSHOT_MASK_FORMAT = "masks-v1";
export const TAB_SCREENSHOT_MASK_WIDTH = 1200;
export const TAB_SCREENSHOT_MASK_HEIGHT = 560;

// The atlas contains vertically stacked alpha masks in this order. These are
// visible color contributions, including occlusion and original opacity.
export const TAB_SCREENSHOT_MASK_ROLES = [
  "screenshot-background",
  "screenshot-foreground",
  "screenshot-primary-foreground",
  "screenshot-border",
  "screenshot-accent",
  "screenshot-secondary",
  "gray",
] as const;

export type TabScreenshotRenderer = "masks" | "gradient-map";
export const DEFAULT_TAB_SCREENSHOT_RENDERER: TabScreenshotRenderer = "masks";

export function getTabScreenshotMaskKey(tabId: number | string) {
  return `${tabId}/${TAB_SCREENSHOT_MASK_FORMAT}.png`;
}

export function getTabScreenshotMaskSrc(tabId: number, version: string) {
  return `/api/getTabScreenshotMasks/${tabId}?v=${encodeURIComponent(version)}`;
}

export function getTabScreenshotObjectKeys(tabId: number) {
  return [
    `${tabId}/light.jpeg`,
    `${tabId}/dark.jpeg`,
    getTabScreenshotMaskKey(tabId),
    `${tabId}.jpeg`, // Legacy capture layout.
  ];
}
