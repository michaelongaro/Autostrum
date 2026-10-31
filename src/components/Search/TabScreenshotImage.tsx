import Image from "next/image";
import {
  getTabScreenshotSrc,
  TAB_SCREENSHOT_THUMBNAIL_WIDTHS,
} from "~/utils/tabScreenshotThumbnails";

interface TabScreenshotImageProps {
  tabId: number;
  theme: "light" | "dark";
  version: string;
  width: number;
  title: string;
  filterId: string;
  onLoad: () => void;
}

export default function TabScreenshotImage({
  tabId,
  theme,
  version,
  width,
  title,
  filterId,
  onLoad,
}: TabScreenshotImageProps) {
  const srcSet = TAB_SCREENSHOT_THUMBNAIL_WIDTHS.map(
    (size) => `${getTabScreenshotSrc(tabId, theme, version, size)} ${size}w`,
  ).join(", ");

  // The browser selects a saved variant. Explicitly bypass Next's optimizer
  // even if the app later enables global image optimization for other images.
  return (
    <picture>
      <source srcSet={srcSet} sizes={`${width}px`} type="image/jpeg" />
      <Image
        src={getTabScreenshotSrc(tabId, theme, version, 800)}
        alt={`screenshot of ${title}`}
        fill
        unoptimized
        sizes={`${width}px`}
        onLoad={onLoad}
        style={{ filter: `url("#${filterId}")` }}
        className="pointer-events-none rounded-t-sm object-cover object-center"
      />
    </picture>
  );
}
