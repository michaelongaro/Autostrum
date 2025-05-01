import { motion } from "framer-motion";
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

interface GridTabCard {
  minimalTab: MinimalTabRepresentation;
  currentUser: UserMetadata | null | undefined;
  largeVariant?: boolean;
  infiniteQueryParams?: InfiniteQueryParams;
  ref?: React.RefObject<HTMLDivElement>;
}

function GridTabCard({
  minimalTab,
  currentUser,
  largeVariant,
  infiniteQueryParams,
  ref,
}: GridTabCard) {
  const { query, asPath } = useRouter();

  const [tabScreenshot, setTabScreenshot] = useState<string>();
  const [tabScreenshotLoaded, setTabScreenshotLoaded] = useState(false);

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

  return (
    <motion.div
      ref={ref}
      key={`${minimalTab.id}gridTabCard`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        width: `${
          largeVariant ? 400 : isAboveExtraSmallViewportWidth ? 330 : 280
        }px`, // accounts for border (may need to add a few px to custom width now that I think about it)
        // height: `${width ? 183 : 146}px`,
      }}
      className="baseVertFlex !flex-nowrap rounded-md border-2 shadow-md"
    >
      {/* tab preview */}
      <div className="relative w-full">
        <Link
          href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
          prefetch={false}
          style={{
            width: largeVariant
              ? 396
              : isAboveExtraSmallViewportWidth
                ? 325
                : 276,
            height: largeVariant
              ? 185
              : isAboveExtraSmallViewportWidth
                ? 152
                : 129,
          }}
          className="w-full cursor-pointer rounded-t-md transition-all hover:brightness-90 active:brightness-[0.8]"
        >
          {/* tab preview screenshot */}
          <div className="grid grid-cols-1 grid-rows-1">
            {tabScreenshot && (
              <Image
                src={tabScreenshot}
                alt={`screenshot of ${minimalTab.title}`}
                width={
                  largeVariant
                    ? 396
                    : isAboveExtraSmallViewportWidth
                      ? 325
                      : 276
                }
                height={
                  largeVariant
                    ? 185
                    : isAboveExtraSmallViewportWidth
                      ? 152
                      : 129
                }
                onLoad={() => {
                  setTabScreenshotLoaded(true);
                }}
                style={{
                  opacity: tabScreenshotLoaded ? 1 : 0,
                }}
                className="col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-md object-cover object-center transition-opacity"
              />
            )}

            <div
              style={{
                opacity: !tabScreenshotLoaded ? 1 : 0,
                zIndex: !tabScreenshotLoaded ? 1 : -1,
                width: largeVariant
                  ? 396
                  : isAboveExtraSmallViewportWidth
                    ? 313
                    : 266,
                height: largeVariant
                  ? 185
                  : isAboveExtraSmallViewportWidth
                    ? 146
                    : 124,
              }}
              className={`col-start-1 col-end-2 row-start-1 row-end-2 rounded-t-md bg-pink-300 transition-opacity ${!tabScreenshotLoaded ? "animate-pulse" : ""} `}
            ></div>
          </div>
        </Link>

        <BookmarkToggle
          tabId={minimalTab.id}
          createdByUserId={minimalTab.createdBy?.userId ?? null}
          currentUser={currentUser}
          showText={false}
          isBookmarked={
            currentUser?.bookmarkedTabIds?.includes(minimalTab.id) ?? false
          }
          infiniteQueryParams={infiniteQueryParams}
          customClassName={"absolute top-2 right-2 size-10"}
        />
      </div>

      <Separator className="bg-pink-100" />

      <div className="baseVertFlex lightestGlassmorphic w-full gap-1 rounded-b-md p-2.5 !shadow-none">
        {/* title */}
        <div className="baseVertFlex w-full !items-start">
          <Button variant={"link"} asChild>
            <Link
              prefetch={false}
              href={`/tab/${minimalTab.id}/${encodeURIComponent(minimalTab.title)}`}
              className="!h-5 !p-0 !font-semibold md:h-6 md:!text-lg"
            >
              <p>{minimalTab.title}</p>
            </Link>
          </Button>
        </div>

        {/* artist/tab creator link --- difficulty */}
        <div
          className={`baseFlex w-full gap-2 ${
            !query.artist && !query.user && !asPath.includes("/profile/tabs")
              ? "!justify-between"
              : "!justify-end"
          }`}
        >
          {!query.artist &&
            !query.user &&
            !asPath.includes("/profile/tabs") && (
              <>
                {minimalTab.artist || minimalTab.createdBy ? (
                  <Button variant={"link"} asChild>
                    <Link
                      prefetch={false}
                      href={
                        minimalTab.artist
                          ? `/artist/${minimalTab.artist.id}/${encodeURIComponent(minimalTab.artist.name)}`
                          : minimalTab.createdBy
                            ? `/user/${minimalTab.createdBy.username}`
                            : ""
                      }
                      className="!h-6 !p-0"
                    >
                      {minimalTab.artist ? (
                        <div className="baseFlex gap-1">
                          {minimalTab.artist.isVerified && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.293-11.293a1 1 0 00-1.414 0L9.5 9.086l-.879-.879a1 1 0 10-1.414 1.414l1.793 1.793a1 1 0 001.414 0l3-3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {minimalTab.artist.name}
                        </div>
                      ) : (
                        (minimalTab.createdBy?.username ?? "Anonymous")
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
        <div
          className={`baseFlex w-full gap-2 text-sm ${!query.genreId ? "!justify-between" : "!justify-end"}`}
        >
          {!query.genreId && (
            <Badge
              style={{
                backgroundColor: genreList[minimalTab.genreId]?.color,
              }}
            >
              {genreList[minimalTab.genreId]?.name}
            </Badge>
          )}

          <div className="baseFlex gap-2">
            <div className="baseFlex gap-1">
              {minimalTab.averageRating}
              <FaStar className="size-3" />({minimalTab.ratingsCount})
            </div>
            <Separator
              className="h-[16px] w-[1px] bg-pink-100/50"
              orientation="vertical"
            />
            {formatDate(minimalTab.createdAt)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default GridTabCard;
