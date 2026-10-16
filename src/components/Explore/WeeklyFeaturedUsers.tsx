import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { FaEye, FaStar } from "react-icons/fa";
import { IoBookmark } from "react-icons/io5";
import { TbPinned } from "react-icons/tb";
import GridTabCard from "~/components/Search/GridTabCard";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import type { User } from "~/generated/browser";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import useWeeklyFeaturedUsersCarousel from "~/hooks/useWeeklyFeaturedUsersCarousel";
import type { MinimalTabRepresentation } from "~/server/api/routers/search";
import type { UserMetadata } from "~/server/api/routers/user";
import { useTabStore } from "~/stores/TabStore";
import { formatNumber } from "~/utils/formatNumber";

interface WeeklyFeaturedUsers {
  weeklyFeaturedUsers: (User & {
    pinnedTab: MinimalTabRepresentation | null;
  })[];
  currentUser?: UserMetadata | null;
}

function FeaturedUserAvatar({
  src,
  username,
}: {
  src: string;
  username: string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  return (
    <div className="grid size-9 shrink-0 grid-cols-1 grid-rows-1 lg:size-10">
      {status === "error" ? (
        <span
          aria-hidden="true"
          className="baseFlex col-start-1 row-start-1 size-full rounded-full bg-accent text-sm"
        >
          {username.charAt(0).toUpperCase()}
        </span>
      ) : (
        <Image
          src={src}
          alt={`${username}'s profile picture`}
          width={40}
          height={40}
          sizes="(min-width: 1024px) 40px, 36px"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          style={{ opacity: status === "loaded" ? 1 : 0 }}
          className="col-start-1 row-start-1 size-full rounded-full object-cover object-center transition-opacity duration-300"
        />
      )}
      {status === "loading" && (
        <div
          aria-hidden="true"
          className="pulseAnimation col-start-1 row-start-1 size-full rounded-full"
        />
      )}
    </div>
  );
}

function WeeklyFeaturedUsers({
  weeklyFeaturedUsers,
  currentUser,
}: WeeklyFeaturedUsers) {
  const { color, theme } = useTabStore((state) => ({
    color: state.color,
    theme: state.theme,
  }));
  const isAboveLargeViewport = useViewportWidthBreakpoint(1024);
  const {
    carouselApi,
    setCarouselApi,
    selectedIndex,
    containerRef,
    indicatorRefs,
    progressBarRefs,
  } = useWeeklyFeaturedUsersCarousel(
    JSON.stringify(weeklyFeaturedUsers.map((user) => user.userId)),
  );

  if (weeklyFeaturedUsers.length === 0) {
    return <p className="px-5 md:px-8">No featured users this week.</p>;
  }

  return (
    <div ref={containerRef} className="baseVertFlex w-full gap-4">
      <Carousel
        setApi={setCarouselApi}
        opts={{
          loop: true,
          containScroll: false,
        }}
        className="baseFlex w-full"
        aria-label="Weekly featured users"
      >
        <CarouselContent className="-ml-12 pb-1">
          {weeklyFeaturedUsers.map((user) => (
            <CarouselItem
              key={user.userId}
              className="baseFlex basis-[93%] pl-12 sm:basis-[70%] lg:h-[280px] lg:basis-[711px]"
            >
              <div className="baseFlex size-full rounded-lg border bg-secondary px-4 py-4 shadow-sm">
                <div
                  className={`baseVertFlex min-w-0 gap-8 lg:!flex-row ${user.pinnedTab === null ? "lg:gap-12" : ""}`}
                >
                  <div className="baseVertFlex w-full min-w-0 !items-start gap-2">
                    <div className="baseFlex gap-1">User</div>

                    <Button variant={"link"} asChild>
                      <Link
                        prefetch={false}
                        href={`/user/${user.username}/filters`}
                        className="baseFlex min-w-0 max-w-[250px] !justify-start gap-2 !p-0 lg:max-w-[100%]"
                      >
                        <FeaturedUserAvatar
                          key={user.profileImageUrl}
                          src={user.profileImageUrl}
                          username={user.username}
                        />

                        <span className="w-full truncate text-2xl font-semibold tracking-tight lg:text-3xl">
                          {user.username}
                        </span>
                      </Link>
                    </Button>

                    <div className="baseVertFlex mt-4 w-full !items-start gap-2 self-center font-medium sm:text-lg">
                      <div className="baseFlex w-full !justify-between gap-4">
                        <div className="baseFlex gap-2">
                          <BsMusicNoteBeamed className="size-4 sm:size-5" />
                          <span>Total tabs</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(user.totalTabs)}
                        </span>
                      </div>

                      <div className="baseFlex w-full !justify-between gap-4">
                        <div className="baseFlex gap-2">
                          <FaEye className="size-4 sm:size-5" />
                          <span>Total views</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(user.totalTabViews)}
                        </span>
                      </div>

                      <div className="baseFlex w-full !justify-between gap-4">
                        <div className="baseFlex gap-2">
                          <FaStar className="size-4 sm:size-5" />
                          <span>Average rating</span>
                        </div>
                        <span
                          className={`w-12 text-end ${
                            user.totalTabRatings > 0 ? "" : "mr-0.5"
                          }`}
                        >
                          {user.totalTabRatings > 0
                            ? user.averageTabRating.toFixed(1)
                            : "-"}
                        </span>
                      </div>

                      <div className="baseFlex w-full !justify-between gap-4">
                        <div className="baseFlex gap-2">
                          <IoBookmark className="size-4 sm:size-5" />
                          <span>Bookmarks received</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(user.totalBookmarksReceived)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* user's pinned tab / placeholder */}
                  {user.pinnedTab === null ? (
                    <div className="baseVertFlex h-[94px] w-[280px] shrink-0 gap-2 rounded-md border bg-background/75 shadow-sm lg:mt-24">
                      <TbPinned className="size-5" />
                      No active pinned tab
                    </div>
                  ) : (
                    <GridTabCard
                      minimalTab={user.pinnedTab}
                      currentUser={currentUser}
                      pinnedTabType={
                        isAboveLargeViewport ? "full" : "withoutScreenshot"
                      }
                      color={color}
                      theme={theme}
                    />
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div
        role="group"
        className="baseFlex w-full gap-2"
        aria-label="Choose a featured user"
      >
        {weeklyFeaturedUsers.map((user, index) => (
          <Button
            key={user.userId}
            ref={(element) => {
              indicatorRefs.current[index] = element;
            }}
            type="button"
            variant="text"
            aria-label={`Show featured user ${index + 1}: ${user.username}`}
            aria-current={index === selectedIndex ? "true" : undefined}
            onClick={() => carouselApi?.scrollTo(index)}
            style={{ width: index === 0 ? "36px" : "12px", height: "12px" }}
            className="relative overflow-hidden rounded-full bg-accent/50 !p-0 hover:bg-accent focus-visible:bg-accent/90 active:bg-accent/80"
          >
            <div
              ref={(element) => {
                progressBarRefs.current[index] = element;
              }}
              aria-hidden="true"
              style={{
                transform: "scaleX(0)",
                transformOrigin: "left center",
                opacity: index === 0 ? 1 : 0,
              }}
              className="absolute left-0 top-0 z-10 h-full w-full rounded-full bg-accent"
            />
          </Button>
        ))}
      </div>
    </div>
  );
}

export default WeeklyFeaturedUsers;
