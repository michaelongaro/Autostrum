import { motion } from "framer-motion";
import { useRouteLocation } from "~/hooks/useRouteLocation";
import { useAppPreferencesStore } from "~/stores/AppPreferencesStore";
import { getProfileImageSrc } from "~/utils/profileImage";

import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { FaEye, FaUser } from "react-icons/fa";
import { FaStar } from "react-icons/fa6";
import { IoBookmark } from "react-icons/io5";
import { TbPinned } from "react-icons/tb";
import GridTabCard from "~/components/Search/GridTabCard";
import SearchResults from "~/components/Search/SearchResults";
import styles from "~/components/Search/SearchResults.module.css";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
import { formatNumber } from "~/utils/formatNumber";
import getDynamicFontSize from "~/utils/getDynamicFontSize";

function ProfileAvatar({ src, username }: { src: string; username: string }) {
  const [failed, setFailed] = useState(false);
  return failed || !src ? (
    <FaUser aria-hidden="true" className="size-6" />
  ) : (
    <Image
      unoptimized
      src={getProfileImageSrc(src)}
      alt={`${username}'s profile picture`}
      width={40}
      height={40}
      onError={() => setFailed(true)}
      className="size-full rounded-full object-cover object-center"
    />
  );
}

function UserProfile({ uniqueKey }: { uniqueKey: string }) {
  const { query } = useRouteLocation();
  const username = query.username as string;
  const { userId: currentUserId } = useAuth();
  const { color, theme } = useAppPreferencesStore((state) => ({
    color: state.color,
    theme: state.theme,
  }));

  const { data: userMetadata, isError } =
    api.user.getProfileMetadataByUsername.useQuery(username, {
      enabled: username !== undefined,
    });
  const loading = userMetadata === undefined && !isError;
  const user = userMetadata?.user;
  const pinnedTab = userMetadata?.pinnedTab;

  const { data: currentUser } = api.user.getById.useQuery(currentUserId!, {
    enabled: !!currentUserId,
  });

  const isAboveMediumViewport = useViewportWidthBreakpoint(768);
  const isDesktop = useViewportWidthBreakpoint(1024);
  const [mobileHeaderCarouselApi, setMobileHeaderCarouselApi] =
    useState<CarouselApi>();
  const [mobileHeaderSlide, setMobileHeaderSlide] = useState(0);
  const mobileHeaderIndicatorRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!mobileHeaderCarouselApi) return;

    function updateProgress() {
      if (!mobileHeaderCarouselApi) return;
      const progress = Math.max(
        0,
        Math.min(1, mobileHeaderCarouselApi.scrollProgress()),
      );
      // Move the same highlight through both clipped markers, behind the gap.
      mobileHeaderIndicatorRefs.current.forEach((indicator, index) => {
        if (indicator) {
          indicator.style.transform = `translateX(${(progress - index) * 125}%)`;
        }
      });
    }
    function updateSelection() {
      if (!mobileHeaderCarouselApi) return;
      setMobileHeaderSlide(mobileHeaderCarouselApi.selectedScrollSnap());
      updateProgress();
    }

    updateSelection();
    mobileHeaderCarouselApi.on("scroll", updateProgress);
    mobileHeaderCarouselApi.on("select", updateSelection);
    mobileHeaderCarouselApi.on("reInit", updateSelection);

    return () => {
      mobileHeaderCarouselApi.off("scroll", updateProgress);
      mobileHeaderCarouselApi.off("select", updateSelection);
      mobileHeaderCarouselApi.off("reInit", updateSelection);
    };
  }, [mobileHeaderCarouselApi]);

  const displayName = user?.username ?? username;
  const stats = [
    {
      label: "Total tabs",
      Icon: BsMusicNoteBeamed,
      value: formatNumber(user?.totalTabs ?? 0),
    },
    {
      label: "Total views",
      Icon: FaEye,
      value: formatNumber(user?.totalTabViews ?? 0),
    },
    {
      label: "Average rating",
      Icon: FaStar,
      value: user?.totalTabRatings ? user.averageTabRating.toFixed(1) : "-",
    },
    {
      label: "Bookmarks received",
      Icon: IoBookmark,
      value: formatNumber(user?.totalBookmarksReceived ?? 0),
    },
  ];
  const details = (
    <div
      className="baseVertFlex min-w-0 max-w-full !items-start gap-2"
      aria-busy={loading}
    >
      <p>User</p>
      <div className="baseFlex h-10 max-w-full !justify-start gap-2">
        <div
          className={cn(
            "baseFlex size-9 shrink-0 rounded-full md:size-10",
            loading && "pulseAnimation",
          )}
        >
          {user ? (
            <ProfileAvatar
              key={user.profileImageUrl}
              src={user.profileImageUrl}
              username={user.username}
            />
          ) : loading ? null : (
            <FaUser aria-hidden="true" className="size-6" />
          )}
        </div>
        <h1
          className="min-w-0 truncate font-semibold leading-10 tracking-tight lg:!text-4xl"
          style={{
            fontSize: getDynamicFontSize(
              displayName,
              isAboveMediumViewport ? 26 : 20,
              isAboveMediumViewport ? 36 : 30,
              50,
            ),
          }}
          title={displayName}
        >
          {displayName}
        </h1>
      </div>

      <div className="baseVertFlex mt-4 w-full !items-start gap-2 font-medium sm:text-lg lg:mt-0 lg:!flex-row lg:flex-wrap lg:!items-center lg:!justify-start lg:gap-x-4">
        {stats.map(({ label, Icon, value }, index) => (
          <Fragment key={label}>
            {index > 0 && (
              <Separator
                orientation="vertical"
                className="hidden h-8 w-px bg-foreground/50 lg:block"
              />
            )}
            <div className="baseFlex w-full !justify-between gap-4 whitespace-nowrap lg:w-auto lg:gap-2">
              <span className="baseFlex gap-2">
                <Icon aria-hidden="true" className="size-4 sm:size-5" />
                {label}
              </span>
              <span className="baseFlex w-12 shrink-0 !justify-end text-end">
                {loading ? (
                  <span
                    aria-hidden="true"
                    className="pulseAnimation h-5 w-10 rounded-md"
                  />
                ) : (
                  value
                )}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
  const pinned = (desktop: boolean) => (
    <div className="baseFlex h-[248px] w-full min-w-0 lg:h-[94px] lg:w-[330px] lg:shrink-0">
      {pinnedTab ? (
        <GridTabCard
          minimalTab={pinnedTab}
          currentUser={currentUser}
          pinnedTabType={desktop ? "withoutScreenshot" : "full"}
          color={color}
          theme={theme}
        />
      ) : loading ? (
        <div
          aria-hidden="true"
          className="pulseAnimation h-[246px] w-[320px] max-w-full rounded-md xs:w-[330px] lg:h-full"
        />
      ) : (
        <div className="baseVertFlex h-[94px] w-[280px] max-w-full gap-2 rounded-md border-2 bg-secondary-active/50 lg:w-full">
          <TbPinned className="size-5" />
          No active pinned tab
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      key={uniqueKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={`${styles.pageShell} baseVertFlex my-12 min-h-[650px] !justify-start md:my-24 md:p-0`}
    >
      <div className="baseVertFlex w-full gap-4">
        {isDesktop !== false && (
          <div className="baseFlex !hidden w-full !items-end !justify-between gap-4 lg:!flex">
            {details}
            {pinned(true)}
          </div>
        )}
        {!isDesktop && (
          <div className="baseVertFlex w-full gap-4 px-2 lg:!hidden">
            <Carousel
              setApi={setMobileHeaderCarouselApi}
              className="baseFlex w-full"
            >
              <CarouselContent className="min-h-[248px]">
                <CarouselItem className="baseFlex">{details}</CarouselItem>
                <CarouselItem className="baseFlex">
                  {pinned(false)}
                </CarouselItem>
              </CarouselContent>
            </Carousel>
            <div
              className="baseFlex relative mt-[10px] gap-2"
              role="group"
              aria-label="Choose a profile pane"
            >
              {["User details", "Pinned tab"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className="relative h-2 w-8 overflow-hidden rounded-full bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Show ${label.toLowerCase()}`}
                  aria-current={
                    mobileHeaderSlide === index ? "true" : undefined
                  }
                  onClick={() => mobileHeaderCarouselApi?.scrollTo(index)}
                >
                  <span
                    ref={(element) => {
                      mobileHeaderIndicatorRefs.current[index] = element;
                    }}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full bg-primary"
                    style={{ transform: `translateX(${-index * 125}%)` }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        <SearchResults
          isFetchingUserMetadata={loading}
          userDoesNotExist={userMetadata === null}
        />
      </div>
    </motion.div>
  );
}

export default UserProfile;
