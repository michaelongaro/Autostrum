import {
  TAB_SCREENSHOT_MASK_ROLES,
  getTabScreenshotMaskSrc,
} from "~/utils/tabScreenshotMasks";
import { getTabScreenshotThumbnailWidth } from "~/utils/tabScreenshotThumbnails";

export interface DecodedMaskAtlas {
  url: string;
  width: number;
  height: number;
  // Retain the decoded resource along with its URL across grid remounts.
  image: HTMLImageElement;
}

interface Entry {
  promise: Promise<DecodedMaskAtlas>;
  atlas?: DecodedMaskAtlas;
  users: number;
}

const entries = new Map<string, Entry>();
const MAX_CACHED_ATLASES = 64;
const MAX_CACHED_BYTES = 64 * 1024 * 1024;

function decodedBytes(atlas: DecodedMaskAtlas) {
  return atlas.width * atlas.height * TAB_SCREENSHOT_MASK_ROLES.length * 4;
}

export function getMaskAtlasSource(tabId: number, version: string) {
  const density = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  return getTabScreenshotMaskSrc(
    tabId,
    version,
    getTabScreenshotThumbnailWidth(400 * density),
  );
}

export function getCachedMaskAtlas(src: string) {
  return entries.get(src)?.atlas;
}

function trimCache() {
  let bytes = 0;
  for (const entry of entries.values()) {
    if (entry.atlas) bytes += decodedBytes(entry.atlas);
  }
  for (const [src, entry] of entries) {
    if (entries.size <= MAX_CACHED_ATLASES && bytes <= MAX_CACHED_BYTES) break;
    // Never revoke a URL while a mounted card is using its masks.
    if (entry.users || !entry.atlas) continue;
    bytes -= decodedBytes(entry.atlas);
    URL.revokeObjectURL(entry.atlas.url);
    entries.delete(src);
  }
}

async function decodeMaskAtlas(src: string): Promise<DecodedMaskAtlas> {
  let url: string | undefined;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Mask atlas unavailable");
    url = URL.createObjectURL(await response.blob());
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const height = image.naturalHeight / TAB_SCREENSHOT_MASK_ROLES.length;
    if (!image.naturalWidth || !Number.isInteger(height) || !height)
      throw new Error("Invalid mask atlas geometry");
    return { url, width: image.naturalWidth, height, image };
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    throw error;
  }
}

export function acquireMaskAtlas(src: string) {
  let entry = entries.get(src);
  if (!entry) {
    const next: Entry = { users: 0, promise: decodeMaskAtlas(src) };
    next.promise = next.promise.then(
      (atlas) => {
        next.atlas = atlas;
        trimCache();
        return atlas;
      },
      (error: unknown) => {
        entries.delete(src);
        throw error;
      },
    );
    entry = next;
  }
  entries.delete(src);
  entries.set(src, entry);
  entry.users++;
  let released = false;
  return {
    promise: entry.promise,
    release() {
      if (released) return;
      released = true;
      entry.users--;
      trimCache();
    },
  };
}
