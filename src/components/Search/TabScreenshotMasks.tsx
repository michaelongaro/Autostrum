import { useEffect, useRef, useState } from "react";
import {
  getTabScreenshotMaskSrc,
  TAB_SCREENSHOT_MASK_HEIGHT,
  TAB_SCREENSHOT_MASK_ROLES,
  TAB_SCREENSHOT_MASK_WIDTH,
} from "~/utils/tabScreenshotMasks";
import { getTabScreenshotThumbnailWidth } from "~/utils/tabScreenshotThumbnails";

interface TabScreenshotMasksProps {
  tabId: number;
  version: string;
  width: number;
  height: number;
  onLoad: () => void;
  onError: () => void;
}

function TabScreenshotMasks({
  tabId,
  version,
  width,
  height,
  onLoad,
  onError,
}: TabScreenshotMasksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [atlas, setAtlas] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const src = getTabScreenshotMaskSrc(tabId, version);
  // Use decoded dimensions: the API can return a legacy full-size atlas while
  // thumbnails are being backfilled. Its role boundaries must stay aligned.
  const atlasWidth = atlas?.width ?? TAB_SCREENSHOT_MASK_WIDTH;
  const atlasHeight = atlas?.height ?? TAB_SCREENSHOT_MASK_HEIGHT;
  const scale = Math.max(width / atlasWidth, height / atlasHeight);
  const imageWidth = atlasWidth * scale;
  const imageHeight = atlasHeight * scale;

  useEffect(() => {
    const controller = new AbortController();
    let objectURL: string | undefined;

    async function loadAtlas() {
      try {
        // Every grid variant is at most 400 CSS pixels wide. One density tier
        // per screen also lets normal and large cards share the same atlas.
        const thumbnailWidth = getTabScreenshotThumbnailWidth(
          400 * window.devicePixelRatio,
        );
        const response = await fetch(`${src}&width=${thumbnailWidth}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Mask atlas unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;

        objectURL = URL.createObjectURL(blob);
        const image = new window.Image();
        image.src = objectURL;
        await image.decode();
        const layerHeight =
          image.naturalHeight / TAB_SCREENSHOT_MASK_ROLES.length;
        if (
          !image.naturalWidth ||
          !Number.isInteger(layerHeight) ||
          !layerHeight
        ) {
          throw new Error("Invalid mask atlas geometry");
        }
        if (!controller.signal.aborted) {
          setAtlas({
            url: objectURL,
            width: image.naturalWidth,
            height: layerHeight,
          });
        }
      } catch {
        if (!controller.signal.aborted) onError();
      }
    }

    // Keep lazy loading, including when the screenshot/skeleton is transparent.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadAtlas();
      },
      { rootMargin: "256px" },
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [src, onError]);

  useEffect(() => {
    if (!atlas) return;
    let revealFrame = 0;
    // Mount CSS masks using an already decoded, local resource. Let the browser
    // process those styles for a frame before exposing the black blend base.
    const prepareFrame = requestAnimationFrame(() => {
      revealFrame = requestAnimationFrame(() => {
        setReady(true);
        onLoad();
      });
    });
    return () => {
      cancelAnimationFrame(prepareFrame);
      cancelAnimationFrame(revealFrame);
    };
  }, [atlas, onLoad]);

  return (
    <div
      ref={containerRef}
      // Inherit the document tokens: React updates the selected preferences
      // before startViewTransition captures the old view. Local theme
      // attributes would recolor the masks ahead of that capture.
      data-screenshot-renderer={ready ? "masks" : undefined}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 isolate overflow-hidden rounded-t-sm bg-black"
      style={{ opacity: ready ? 1 : 0 }}
    >
      {atlas &&
        TAB_SCREENSHOT_MASK_ROLES.map((role, index) => (
          <div
            key={role}
            className="absolute inset-0"
            style={{
              backgroundColor: `hsl(var(--${role}))`,
              // The capture already includes occlusion. Add its premultiplied
              // contributions, rather than applying source-over opacity twice.
              mixBlendMode: "plus-lighter",
              maskImage: `url("${atlas.url}")`,
              maskMode: "alpha",
              maskRepeat: "no-repeat",
              maskSize: `${imageWidth}px ${imageHeight * TAB_SCREENSHOT_MASK_ROLES.length}px`,
              maskPosition: `${(width - imageWidth) / 2}px ${(height - imageHeight) / 2 - index * imageHeight}px`,
            }}
          />
        ))}
    </div>
  );
}

export default TabScreenshotMasks;
