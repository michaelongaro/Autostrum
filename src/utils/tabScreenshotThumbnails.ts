// Keep the storage contract in sync with autostrum-screenshot-server's
// src/services/screenshot-thumbnails.ts. Bump the format for encoding changes.
export const TAB_SCREENSHOT_THUMBNAIL_FORMAT = "card-v1";
export const TAB_SCREENSHOT_THUMBNAIL_WIDTHS = [400, 800] as const;
export type TabScreenshotThumbnailWidth =
  (typeof TAB_SCREENSHOT_THUMBNAIL_WIDTHS)[number];

export function isTabScreenshotThumbnailWidth(
  value: unknown,
): value is TabScreenshotThumbnailWidth {
  return value === 400 || value === 800;
}

export function getTabScreenshotThumbnailWidth(pixelWidth: number) {
  return pixelWidth <= 400 ? 400 : 800;
}

export function getTabScreenshotThumbnailKey(
  tabId: number | string,
  filename: string,
  width: TabScreenshotThumbnailWidth,
) {
  return `${tabId}/${TAB_SCREENSHOT_THUMBNAIL_FORMAT}/${width}/${filename}`;
}

export function getTabScreenshotSrc(
  tabId: number,
  theme: "light" | "dark",
  version: string,
  width: TabScreenshotThumbnailWidth,
) {
  return `/api/getTabScreenshot/${tabId}/${theme}?v=${encodeURIComponent(version)}&width=${width}`;
}
