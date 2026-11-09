import { useEffect, useRef, useState } from "react";
import {
  TAB_SCREENSHOT_MASK_HEIGHT,
  TAB_SCREENSHOT_MASK_ROLES,
  TAB_SCREENSHOT_MASK_WIDTH,
} from "~/utils/tabScreenshotMasks";
import {
  acquireMaskAtlas,
  getCachedMaskAtlas,
  getMaskAtlasSource,
  type DecodedMaskAtlas,
} from "~/utils/tabScreenshotMaskCache";

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
  const src = getMaskAtlasSource(tabId, version);
  const [atlas, setAtlas] = useState<DecodedMaskAtlas | null>(
    () => getCachedMaskAtlas(src) ?? null,
  );
  const [ready, setReady] = useState(() => Boolean(getCachedMaskAtlas(src)));
  // Use decoded dimensions: the API can return a legacy full-size atlas while
  // thumbnails are being backfilled. Its role boundaries must stay aligned.
  const atlasWidth = atlas?.width ?? TAB_SCREENSHOT_MASK_WIDTH;
  const atlasHeight = atlas?.height ?? TAB_SCREENSHOT_MASK_HEIGHT;
  const scale = Math.max(width / atlasWidth, height / atlasHeight);
  const imageWidth = atlasWidth * scale;
  const imageHeight = atlasHeight * scale;

  useEffect(() => {
    let cancelled = false;
    let resource: ReturnType<typeof acquireMaskAtlas> | undefined;
    function loadAtlas() {
      resource = acquireMaskAtlas(src);
      void resource.promise.then(
        (decoded) => {
          if (!cancelled) setAtlas(decoded);
        },
        () => {
          if (!cancelled) onError();
        },
      );
    }

    // Cached atlases skip intersection observation and the preparation delay.
    if (getCachedMaskAtlas(src)) loadAtlas();
    // Keep lazy loading, including when the screenshot/skeleton is transparent.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadAtlas();
      },
      { rootMargin: "256px" },
    );
    if (!resource && containerRef.current)
      observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      cancelled = true;
      resource?.release();
    };
  }, [src, onError]);

  useEffect(() => {
    if (!atlas) return;
    if (ready) {
      onLoad();
      return;
    }
    let revealFrame = 0;
    // Mount CSS masks using an already decoded, local resource. Let the browser
    // process those styles for a frame before exposing the black blend base.
    const prepareFrame = requestAnimationFrame(() => {
      revealFrame = requestAnimationFrame(() => {
        setReady(true);
      });
    });
    return () => {
      cancelAnimationFrame(prepareFrame);
      cancelAnimationFrame(revealFrame);
    };
  }, [atlas, onLoad, ready]);

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
