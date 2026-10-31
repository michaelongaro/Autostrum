import { useEffect, useRef, useState } from "react";
import {
  getTabScreenshotMaskSrc,
  TAB_SCREENSHOT_MASK_HEIGHT,
  TAB_SCREENSHOT_MASK_ROLES,
  TAB_SCREENSHOT_MASK_WIDTH,
} from "~/utils/tabScreenshotMasks";

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
  const [maskURL, setMaskURL] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const src = getTabScreenshotMaskSrc(tabId, version);
  const scale = Math.max(
    width / TAB_SCREENSHOT_MASK_WIDTH,
    height / TAB_SCREENSHOT_MASK_HEIGHT,
  );
  const imageWidth = TAB_SCREENSHOT_MASK_WIDTH * scale;
  const imageHeight = TAB_SCREENSHOT_MASK_HEIGHT * scale;

  useEffect(() => {
    const controller = new AbortController();
    let objectURL: string | undefined;

    async function loadAtlas() {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) throw new Error("Mask atlas unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;

        objectURL = URL.createObjectURL(blob);
        const image = new window.Image();
        image.src = objectURL;
        await image.decode();
        if (!controller.signal.aborted) setMaskURL(objectURL);
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
    if (!maskURL) return;
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
  }, [maskURL, onLoad]);

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
      {maskURL &&
        TAB_SCREENSHOT_MASK_ROLES.map((role, index) => (
          <div
            key={role}
            className="absolute inset-0"
            style={{
              backgroundColor: `hsl(var(--${role}))`,
              // The capture already includes occlusion. Add its premultiplied
              // contributions, rather than applying source-over opacity twice.
              mixBlendMode: "plus-lighter",
              maskImage: `url("${maskURL}")`,
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
