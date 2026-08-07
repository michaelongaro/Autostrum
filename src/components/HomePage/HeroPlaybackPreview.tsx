import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import DifficultyBars from "~/components/ui/DifficultyBars";
import PlayIcon from "~/components/ui/icons/PlayIcon";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { MinimalTabRepresentation } from "~/server/api/routers/search";
import { useTabStore } from "~/stores/TabStore";
import { genreColors } from "~/utils/genreColors";

const loadedScreenshotKeys = new Set<string>();

type HeroPlaybackPreviewProps = {
  minimalTab: MinimalTabRepresentation;
};

function HeroPlaybackPreview({ minimalTab }: HeroPlaybackPreviewProps) {
  const { theme } = useTabStore((state) => ({
    theme: state.theme,
  }));

  const screenshotVersion =
    minimalTab.updatedAt instanceof Date
      ? minimalTab.updatedAt.toISOString()
      : new Date(String(minimalTab.updatedAt)).toISOString();
  const screenshotCacheKey = `${minimalTab.id}:${theme}:${screenshotVersion}`;
  const screenshotSrc = `/api/getTabScreenshot/${minimalTab.id}/${theme}?v=${encodeURIComponent(screenshotVersion)}`;

  const [screenshotLoaded, setScreenshotLoaded] = useState(() =>
    loadedScreenshotKeys.has(screenshotCacheKey),
  );

  useEffect(() => {
    setScreenshotLoaded(loadedScreenshotKeys.has(screenshotCacheKey));
  }, [screenshotCacheKey]);

  const tabHref = `/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`;
  const genreColor = genreColors.get(minimalTab.genre);

  return (
    <div className="baseVertFlex w-full overflow-hidden rounded-xl border bg-background shadow-md">
      <div className="baseFlex w-full !justify-between gap-3 border-b bg-secondary-active/40 px-3 py-2.5">
        <div className="baseVertFlex min-w-0 !items-start gap-0.5">
          <p className="truncate text-sm font-semibold md:text-base">
            {minimalTab.title}
          </p>
          <p className="truncate text-xs text-foreground/70">
            {minimalTab.artist?.name ??
              minimalTab.createdBy?.username ??
              "Autostrum"}
          </p>
        </div>
        <div className="baseFlex shrink-0 gap-2">
          {genreColor && (
            <Badge
              variant="outline"
              style={{ borderColor: genreColor }}
              className="text-[0.65rem]"
            >
              {minimalTab.genre}
            </Badge>
          )}
          <DifficultyBars difficulty={minimalTab.difficulty} />
        </div>
      </div>

      <Link
        prefetch={false}
        href={tabHref}
        className="group relative block w-full border-b transition hover:brightness-95 active:brightness-90"
      >
        <div className="relative h-[160px] w-full md:h-[180px]">
          <Image
            src={screenshotSrc}
            alt={`Screenshot of ${minimalTab.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 440px"
            onLoad={() => {
              loadedScreenshotKeys.add(screenshotCacheKey);
              setScreenshotLoaded(true);
            }}
            style={{
              opacity: screenshotLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
            className="object-cover object-center"
          />
          <div
            style={{
              backgroundColor:
                "hsl(var(--screenshot-secondary) / var(--screenshot-color-overlay-alpha))",
            }}
            className="absolute inset-0 mix-blend-color"
          />
          {!screenshotLoaded && (
            <div className="pulseAnimation absolute inset-0" />
          )}
        </div>

        <div className="absolute inset-0 baseFlex bg-background/15">
          <Button
            variant="audio"
            className="!size-12 !rounded-full !p-0 shadow-md transition group-hover:scale-105"
            tabIndex={-1}
            asChild
          >
            <span>
              <PlayIcon className="ml-0.5 size-5" />
            </span>
          </Button>
        </div>
      </Link>

      <div className="baseVertFlex w-full gap-3 px-3 py-3">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="homepageProgressSweep absolute inset-y-0 left-0 w-full rounded-full bg-audio/80" />
        </div>

        <div className="baseFlex w-full !justify-between gap-2 text-[0.7rem] text-foreground/70 md:text-xs">
          <span>Acoustic — Steel</span>
          <span>1.0x</span>
          <span>Loop</span>
          <span>Practice</span>
        </div>

        <Button asChild className="w-full">
          <Link prefetch={false} href={tabHref}>
            Open & play tab
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default HeroPlaybackPreview;
