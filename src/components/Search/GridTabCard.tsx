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
import { genreList } from "~/utils/genreList";
import BookmarkToggle from "~/components/ui/BookmarkToggle";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useRouter } from "next/router";
import { MdModeEditOutline } from "react-icons/md";
import { TbPinned } from "react-icons/tb";
import Verified from "~/components/ui/icons/Verified";

interface GridTabCard {
  minimalTab: MinimalTabRepresentation;
  currentUser: UserMetadata | null | undefined;
  largeVariant?: boolean;
  pinnedTabType?: "full" | "withoutScreenshot";
  infiniteQueryParams?: InfiniteQueryParams;
  ref?: React.RefObject<HTMLDivElement>;
}

function GridTabCard({
  minimalTab,
  currentUser,
  largeVariant,
  pinnedTabType,
  infiniteQueryParams,
  ref,
}: GridTabCard) {
  const { query, asPath } = useRouter();

  const [tabScreenshot, setTabScreenshot] = useState<string>();
  const [tabScreenshotLoaded, setTabScreenshotLoaded] = useState(false);
  const [isPressingOnScreenshot, setIsPressingOnScreenshot] = useState(false);

  const isAboveExtraSmallViewportWidth = useViewportWidthBreakpoint(450);

  useEffect(() => {
    if (tabScreenshot) return;

    const fetchImage = async () => {
      try {
        const res = await fetch(`/api/getTabScreenshot/${minimalTab.id}`);
        if (!res.ok) {
          console.error("Failed to fetch image");
          return;
        }
        const blob = await res.blob();

        const reader = new FileReader();
        reader.onloadend = function () {
          if (typeof reader?.result === "string") {
            setTabScreenshot(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error fetching image:", error, minimalTab.id);
      }
    };

    void fetchImage();
  }, [tabScreenshot, minimalTab.id]);

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
    if (pinnedTabType !== undefined || isAboveExtraSmallViewportWidth)
      return 330;
    return 280;
  }

  function getDynamicHeight() {
    if (largeVariant) return 185;
    if (pinnedTabType !== undefined || isAboveExtraSmallViewportWidth)
      return 152;
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
      {/* tab preview */}

      {pinnedTabType !== "withoutScreenshot" && (
        <div className="relative w-full">
          <Link
            href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
            prefetch={false}
            style={{
              width: getDynamicWidth(),
              height: getDynamicHeight(),
            }}
            className="w-full cursor-pointer rounded-t-md transition-all hover:brightness-90 active:brightness-[0.8]"
          >
            {/* tab preview screenshot */}
            <div
              onTouchStart={() => setIsPressingOnScreenshot(true)}
              onTouchEnd={() => setIsPressingOnScreenshot(false)}
              onTouchCancel={() => setIsPressingOnScreenshot(false)}
              className="grid grid-cols-1 grid-rows-1"
            >
              {tabScreenshot && (
                <Image
                  src={tabScreenshot}
                  alt={`screenshot of ${minimalTab.title}`}
                  width={getDynamicWidth()}
                  height={getDynamicHeight()}
                  onLoad={() => {
                    setTimeout(() => {
                      setTabScreenshotLoaded(true);
                    }, 100); // unsure if this is necessary, but it felt too flickery without it
                  }}
                  style={{
                    opacity: tabScreenshotLoaded ? 1 : 0,
                    transition: "opacity 0.3s ease-in-out",
                    filter: isPressingOnScreenshot ? "brightness(0.8)" : "none",
                    width: `${getDynamicWidth()}px`,
                    height: `${getDynamicHeight()}px`,
                  }}
                  className="pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-sm object-cover object-center !transition-all"
                />
              )}

              <AnimatePresence>
                {!tabScreenshotLoaded && (
                  <motion.div
                    key={`${minimalTab.id}gridTabCardSkeletonImageLoader`}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      width: largeVariant
                        ? 396
                        : isAboveExtraSmallViewportWidth
                          ? 326
                          : 276,
                      height: largeVariant
                        ? 185
                        : isAboveExtraSmallViewportWidth
                          ? 152
                          : 129,
                    }}
                    className="pulseAnimation z-10 col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-none bg-skeleton"
                  ></motion.div>
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
                  className="absolute right-14 top-2 !size-10 !p-0"
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

      <div className="baseVertFlex w-full gap-1 rounded-b-sm bg-secondary-active/50 p-2.5">
        {/* title */}
        <div className="baseVertFlex w-full !items-start">
          <Button variant={"link"} asChild>
            <Link
              prefetch={false}
              href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
              className="baseFlex !h-5 w-full !justify-start !p-0 !font-semibold md:h-6 md:!text-lg"
            >
              <span className="max-w-full truncate">{minimalTab.title}</span>
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
                      <div className="baseFlex size-full !justify-start gap-1">
                        {minimalTab.artist.isVerified && (
                          <Verified className="size-4 shrink-0" />
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
                backgroundColor: genreList
                  .get(minimalTab.genre)
                  ?.replace(/\)$/, " / 0.15)"),
                borderColor: genreList.get(minimalTab.genre),
                border: "1px solid",
                color: genreList.get(minimalTab.genre),
              }}
            >
              {minimalTab.genre}
            </Badge>

            {pinnedTabType && (
              <Badge className="baseFlex gap-1 border border-primary bg-primary/10 text-primary">
                <TbPinned className="size-4" />
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
