import { LOGO_PATHS_WITH_TITLE, LOGO_PATHS_WITHOUT_TITLE } from "~/utils/logoPaths";
import { cn } from "~/utils/cn";

type BrandMarkProps = {
  size?: "hero" | "section" | "inline";
  showWordmark?: boolean;
  className?: string;
  tone?: "default" | "cream";
};

const SIZES = {
  hero: { withTitle: { w: 320, h: 56 }, without: { w: 56, h: 56 } },
  section: { withTitle: { w: 220, h: 38 }, without: { w: 40, h: 40 } },
  inline: { withTitle: { w: 160, h: 28 }, without: { w: 28, h: 28 } },
} as const;

function BrandMark({
  size = "hero",
  showWordmark = true,
  className,
  tone = "default",
}: BrandMarkProps) {
  const dims = showWordmark ? SIZES[size].withTitle : SIZES[size].without;
  const src = showWordmark
    ? LOGO_PATHS_WITH_TITLE.maple
    : LOGO_PATHS_WITHOUT_TITLE.maple;

  return (
    <div className={cn("baseFlex gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Autostrum"
        width={dims.w}
        height={dims.h}
        className={cn(
          "h-auto max-w-full",
          size === "hero" && "w-[min(100%,320px)]",
          size === "section" && "w-[min(100%,220px)]",
          size === "inline" && "w-[min(100%,160px)]",
          tone === "cream" && "brightness-110",
        )}
        draggable={false}
      />
    </div>
  );
}

export default BrandMark;
