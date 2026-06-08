import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa6";
import DifficultyBars from "~/components/ui/DifficultyBars";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import type {
  InfiniteQueryParams,
  MinimalTabRepresentation,
} from "~/server/api/routers/search";
import type { UserMetadata } from "~/server/api/routers/user";
import formatDate from "~/utils/formatDate";
import { genreColors } from "~/utils/genreColors";
import BookmarkToggle from "~/components/ui/BookmarkToggle";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useRouter } from "next/router";
import { MdModeEditOutline } from "react-icons/md";
import { TbPinned } from "react-icons/tb";
import Verified from "~/components/ui/icons/Verified";
import type { COLORS, THEME } from "~/stores/TabStore";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

const loadedTabScreenshotKeys = new Set<string>();

function getTabScreenshotVersion(updatedAt: unknown) {
  if (updatedAt instanceof Date) {
    return updatedAt.toISOString();
  }

  return new Date(String(updatedAt)).toISOString();
}

function getTabScreenshotCacheKey(
  tabId: number,
  theme: THEME,
  version: string,
) {
  return `${tabId}:${theme}:${version}`;
}

function getTabScreenshotSrc(tabId: number, theme: THEME, version: string) {
  return `/api/getTabScreenshot/${tabId}/${theme}?v=${encodeURIComponent(version)}`;
}

interface GridTabCard {
  minimalTab: MinimalTabRepresentation;
  currentUser: UserMetadata | null | undefined;
  color: COLORS;
  theme: THEME;
  largeVariant?: boolean | null;
  pinnedTabType?: "full" | "withoutScreenshot";
  infiniteQueryParams?: InfiniteQueryParams;
  ref?: React.RefObject<HTMLDivElement>;
}

function GridTabCard({
  minimalTab,
  currentUser,
  color,
  theme,
  largeVariant,
  pinnedTabType,
  infiniteQueryParams,
  ref,
}: GridTabCard) {
  const { query, asPath } = useRouter();

  const isAboveExtraSmallViewportWidth = useViewportWidthBreakpoint(450);
  const screenshotVersion = getTabScreenshotVersion(minimalTab.updatedAt);
  const screenshotCacheKey = getTabScreenshotCacheKey(
    minimalTab.id,
    theme,
    screenshotVersion,
  );
  const screenshotSrc = getTabScreenshotSrc(
    minimalTab.id,
    theme,
    screenshotVersion,
  );
  const [tabScreenshotLoaded, setTabScreenshotLoaded] = useState(() =>
    loadedTabScreenshotKeys.has(screenshotCacheKey),
  );

  useEffect(() => {
    setTabScreenshotLoaded(loadedTabScreenshotKeys.has(screenshotCacheKey));
  }, [screenshotCacheKey]);

  function allowedToRenderArtistLink() {
    const isArtistPage = asPath.includes("/artist");
    const isProfileTabsPage = asPath.includes("/profile/tabs");
    const isCreatedByVisitedUser =
      query.username === minimalTab.createdBy?.username;
    const isForPinnedTab = pinnedTabType !== undefined;
    const artistIsNotAttached = minimalTab.artist === null;

    if (isArtistPage) return false;

    if (isProfileTabsPage && artistIsNotAttached) return false;

    if (isCreatedByVisitedUser && artistIsNotAttached) return false;

    if (isForPinnedTab && artistIsNotAttached) return false;

    return true;
  }

  function getDynamicWidth() {
    if (largeVariant) return 400;

    if (pinnedTabType !== undefined && !isAboveExtraSmallViewportWidth) {
      return 320;
    }

    if (isAboveExtraSmallViewportWidth) {
      return 330;
    }

    return 280;
  }

  function getDynamicHeight() {
    if (largeVariant) return 185;

    if (pinnedTabType !== undefined || isAboveExtraSmallViewportWidth) {
      return 152;
    }

    return 129;
  }

  return (
    <motion.div
      ref={ref}
      key={`${minimalTab.id}gridTabCard`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        width: `${getDynamicWidth()}px`,
        minWidth: `${getDynamicWidth()}px`,
      }}
      className="baseVertFlex overflow-hidden rounded-md border shadow-sm"
    >
      {/* tab preview screenshot */}
      {pinnedTabType !== "withoutScreenshot" && (
        <div className="relative w-full">
          <Link
            href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
            prefetch={false}
            className="block cursor-pointer rounded-t-md transition-all hover:brightness-90 active:brightness-[0.8]"
          >
            {/* tab preview screenshot */}
            <div
              style={{
                width: getDynamicWidth(),
                height: getDynamicHeight(),
              }}
              className="relative grid grid-cols-1 grid-rows-1 border-b"
            >
              <>
                <Image
                  src={screenshotSrc}
                  alt={`screenshot of ${minimalTab.title}`}
                  fill
                  sizes={`(max-width: 768px) 100vw, ${getDynamicWidth()}px`}
                  onLoad={() => {
                    loadedTabScreenshotKeys.add(screenshotCacheKey);
                    setTabScreenshotLoaded(true);
                  }}
                  style={{
                    opacity: tabScreenshotLoaded ? 1 : 0,
                    transition: "opacity 0.3s ease-in-out",
                  }}
                  className="pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-sm object-cover object-center !transition-all"
                />

                <div
                  style={{
                    backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-secondary"]} / ${theme === "light" ? 0.7 : 0.35})`,
                  }}
                  className="absolute inset-0 z-10 size-full mix-blend-color"
                ></div>
              </>

              <AnimatePresence>
                {!tabScreenshotLoaded && (
                  <motion.div
                    key={`${minimalTab.id}gridTabCardSkeletonImageLoader`}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pulseAnimation absolute inset-0 z-10 rounded-t-none"
                  />
                )}
              </AnimatePresence>
            </div>
          </Link>

          {asPath.includes("/profile/tabs") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <Button variant={"secondary"} asChild>
                <Link
                  prefetch={false}
                  href={`/tab/${minimalTab.id}/edit`}
                  className="absolute right-14 top-2 z-10 !size-10 !p-0"
                >
                  <MdModeEditOutline className="size-5" />
                </Link>
              </Button>
            </motion.div>
          )}

          <BookmarkToggle
            tabId={minimalTab.id}
            createdByUserId={minimalTab.createdBy?.userId ?? null}
            currentUser={currentUser}
            showText={false}
            isBookmarked={
              currentUser?.bookmarkedTabIds?.includes(minimalTab.id) ?? false
            }
            infiniteQueryParams={infiniteQueryParams}
            customClassName={"absolute top-2 right-2 size-10 z-10"}
          />
        </div>
      )}

      {/* tab card body */}
      <div className="baseVertFlex w-full gap-1 rounded-b-sm bg-secondary-active/50 p-2.5">
        {/* title */}
        <div className="baseVertFlex w-full min-w-0 !items-start">
          <Button variant={"link"} asChild>
            <Link
              prefetch={false}
              href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
              className="baseFlex !h-5 min-w-0 max-w-full !justify-start !p-0 !font-semibold md:h-6 md:!text-lg"
            >
              <span className="block truncate">{minimalTab.title}</span>
            </Link>
          </Button>
        </div>

        {/* artist/tab creator link --- difficulty */}
        <div
          className={`baseFlex w-full gap-2 ${
            allowedToRenderArtistLink() ? "!justify-between" : "!justify-end"
          }`}
        >
          {allowedToRenderArtistLink() && (
            <>
              {minimalTab.artist || minimalTab.createdBy ? (
                <Button variant={"link"} asChild>
                  <Link
                    prefetch={false}
                    href={
                      minimalTab.artist
                        ? `/artist/${encodeURIComponent(minimalTab.artist.name)}/${minimalTab.artist.id}/filters`
                        : minimalTab.createdBy
                          ? `/user/${minimalTab.createdBy.username}/filters`
                          : ""
                    }
                    className="baseFlex !h-6 max-w-[60%] !justify-start !p-0 xs:max-w-[65%]"
                  >
                    {minimalTab.artist ? (
                      <div className="baseFlex size-full !justify-start">
                        {minimalTab.artist.isVerified && (
                          <Verified className="mr-[5px] size-4 shrink-0" />
                        )}
                        <span className="max-w-[100%] truncate">
                          {minimalTab.artist.name}
                        </span>
                      </div>
                    ) : (
                      <span className="max-w-[100%] truncate">
                        {minimalTab.createdBy?.username ?? "Anonymous"}
                      </span>
                    )}
                  </Link>
                </Button>
              ) : (
                <span className="text-sm italic">Anonymous</span>
              )}
            </>
          )}

          <div className="baseFlex gap-2 text-sm">
            Difficulty
            <DifficultyBars difficulty={minimalTab.difficulty} />
          </div>
        </div>

        {/* genre pill --- ratings/createdAt */}
        <div className="baseFlex w-full !justify-between gap-2 text-sm">
          <div className="baseFlex gap-2">
            <Badge
              style={{
                backgroundColor: genreColors
                  .get(minimalTab.genre)
                  ?.replace(/\)$/, " / 0.7)"),
                border: "1px solid",
                borderColor: genreColors.get(minimalTab.genre),
              }}
              className="text-primary-foreground"
            >
              {minimalTab.genre}
            </Badge>

            {pinnedTabType && (
              <Badge className="baseFlex gap-1 border border-primary bg-primary/70 text-primary-foreground">
                <TbPinned className="size-3" />
                Pinned
              </Badge>
            )}
          </div>

          <div className="baseFlex gap-2">
            {minimalTab.ratingsCount > 0 && (
              <>
                <div className="baseFlex gap-1">
                  {minimalTab.averageRating.toFixed(1)}
                  <FaStar className="size-3" />({minimalTab.ratingsCount})
                </div>
                <Separator
                  className="h-[16px] w-[1px] bg-foreground/50"
                  orientation="vertical"
                />
              </>
            )}
            {formatDate(minimalTab.createdAt)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default GridTabCard;
