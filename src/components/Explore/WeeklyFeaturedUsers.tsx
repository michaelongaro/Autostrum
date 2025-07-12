import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbPinned } from "react-icons/tb";
import GridTabCard from "~/components/Search/GridTabCard";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { formatNumber } from "~/utils/formatNumber";
import type { User } from "@prisma/client";
import type { MinimalTabRepresentation } from "~/server/api/routers/search";

import { BsMusicNoteBeamed } from "react-icons/bs";
import { FaEye, FaStar } from "react-icons/fa";
import { IoBookmark } from "react-icons/io5";
import type { UserMetadata } from "~/server/api/routers/user";

// FYI: I recognize this component is a bit of a mess, and also specifically that there are
// two competing(?) ways that the progress bar's scaleX is being changed (raf vs. CSS animation)
// I believe that raf is the more reliable way to do it.

const SLIDE_COUNT = 5;
const AUTO_ROTATION_INTERVAL = 10000; // 10 seconds

const roundToDecimals = (num: number, decimals = 3): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const snapToExpectedValue = (
  scrollProgress: number,
  tolerance = 0.001,
): number => {
  const expectedValues = [0, 0.2, 0.4, 0.6, 0.8];

  for (const expected of expectedValues) {
    if (Math.abs(scrollProgress - expected) < tolerance) {
      return expected;
    }
  }

  // If not close to an expected value, just round to 3 decimals
  return roundToDecimals(scrollProgress);
};

interface WeeklyFeaturedUsers {
  weeklyFeaturedUsers: (User & {
    pinnedTab: MinimalTabRepresentation | null;
  })[];
  currentUser?: UserMetadata | null;
}

function WeeklyFeaturedUsers({
  weeklyFeaturedUsers,
  currentUser,
}: WeeklyFeaturedUsers) {
  const [profileImageLoadStates, setProfileImageLoadStates] = useState([
    false,
    false,
    false,
    false,
    false,
  ]);

  const [weeklyFeaturedUsersCarouselApi, setWeeklyFeaturedUsersCarouselApi] =
    useState<CarouselApi>();
  const [slideIndex, setSlideIndex] = useState(0);

  const [windowHasFocus, setWindowHasFocus] = useState(true);

  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [buttonWidths, setButtonWidths] = useState([36, 12, 12, 12, 12]); // Start with first button expanded

  const [progress, setProgress] = useState<number[]>([0, 0, 0, 0, 0]);
  const progressStartTime = useRef<(number | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const progressPausedAt = useRef<(number | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const prevSlideIndex = useRef(slideIndex);
  const progressBarRefs = useRef<(HTMLDivElement | null)[]>([]);

  const progressBarOpacities = useMemo(() => {
    // Home values for each slide
    const homeValues = [0, 0.2, 0.4, 0.6, 0.8];
    // How far away (in scrollProgress units) before opacity is 0
    const maxDistance = 0.2; // 0.2 = one full slide away

    return homeValues.map((home) => {
      // Find the shortest distance, accounting for looping
      let dist = Math.abs(scrollProgress - home);
      if (dist > 0.5) dist = 1 - dist; // handle looping

      // Opacity is 1 at dist=0, 0 at dist=maxDistance or more
      const opacity = Math.max(0, 1 - dist / maxDistance);
      return opacity;
    });
  }, [scrollProgress]);

  // Calculate button widths based on scroll progress
  const calculateButtonWidths = useCallback((scrollProgress: number) => {
    const baseWidth = 12; // w-3 = 12px (circle size)
    const expandedWidth = 36; // w-6 = 36px (3x as wide)

    // Convert scroll progress to slide progress (0 to 5)
    const slideProgress = scrollProgress * SLIDE_COUNT;
    const fromSlide = Math.floor(slideProgress) % SLIDE_COUNT;
    const toSlide = (fromSlide + 1) % SLIDE_COUNT;
    const transitionProgress = slideProgress - Math.floor(slideProgress); // 0 to 1

    // Initialize all buttons to base width
    const widths = Array(SLIDE_COUNT).fill(baseWidth) as number[];

    // Calculate widths for the transitioning buttons
    if (transitionProgress === 0) {
      // We're exactly on a slide, so that button should be fully expanded
      widths[fromSlide] = expandedWidth;
    } else {
      // We're transitioning between slides
      // Current slide shrinks as we move away from it
      widths[fromSlide] =
        expandedWidth - transitionProgress * (expandedWidth - baseWidth);

      // Next slide expands as we move toward it
      widths[toSlide] =
        baseWidth + transitionProgress * (expandedWidth - baseWidth);
    }

    return widths;
  }, []);

  const calculatedButtonWidths = useMemo(() => {
    const roundedProgress = snapToExpectedValue(scrollProgress);
    const newButtonWidths = calculateButtonWidths(roundedProgress);

    return newButtonWidths;
  }, [scrollProgress, calculateButtonWidths]);

  useEffect(() => {
    const handleFocus = () => setWindowHasFocus(true);
    const handleBlur = () => setWindowHasFocus(false);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Set initial state in case the tab is not focused on mount
    setWindowHasFocus(document.hasFocus());

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const activeRef = progressBarRefs.current[slideIndex];
    if (activeRef) {
      // Remove and re-add to restart animation
      activeRef.classList.remove("progressBar", "progressBar-paused");
      // Force reflow
      void activeRef.offsetWidth;
      activeRef.classList.add("progressBar");
      activeRef.style.animationDuration = `${AUTO_ROTATION_INTERVAL}ms`;
    }
  }, [slideIndex]);

  useEffect(() => {
    const activeRef = progressBarRefs.current[slideIndex];
    if (activeRef) {
      if (isTimerPaused) {
        activeRef.classList.add("progressBar-paused");
      } else {
        activeRef.classList.remove("progressBar-paused");
      }
    }
  }, [isTimerPaused, slideIndex]);

  useEffect(() => {
    let raf: number;

    function animate() {
      if (isTimerPaused || !windowHasFocus) return;
      if (progressStartTime.current[slideIndex] === null) {
        progressStartTime.current[slideIndex] = performance.now();
      }
      const elapsed =
        performance.now() - progressStartTime.current[slideIndex]!;
      const newProgress = Math.min(elapsed / AUTO_ROTATION_INTERVAL, 1);

      setProgress((prev) => {
        const arr = [...prev];
        arr[slideIndex] = newProgress;
        return arr;
      });

      if (newProgress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        // Move to next slide
        setProgress([0, 0, 0, 0, 0]);
        progressStartTime.current = [null, null, null, null, null];
        progressPausedAt.current = [null, null, null, null, null];
        if (weeklyFeaturedUsersCarouselApi) {
          weeklyFeaturedUsersCarouselApi.scrollNext();
        }
      }
    }

    if (!isTimerPaused && windowHasFocus) {
      raf = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [
    isTimerPaused,
    windowHasFocus,
    weeklyFeaturedUsersCarouselApi,
    slideIndex,
  ]);

  const pauseTimer = useCallback(() => {
    setIsTimerPaused(true);
    progressPausedAt.current[slideIndex] = performance.now();
  }, [slideIndex]);

  const resumeTimer = useCallback(() => {
    setIsTimerPaused(false);
    if (
      progressPausedAt.current[slideIndex] &&
      progressStartTime.current[slideIndex]
    ) {
      const pausedDuration =
        performance.now() - progressPausedAt.current[slideIndex];
      progressStartTime.current[slideIndex] += pausedDuration;
    }
    progressPausedAt.current[slideIndex] = null;
  }, [slideIndex]);

  const resetAllProgressExcept = useCallback((current: number) => {
    setProgress((prev) => {
      const arr = [...prev];
      for (let i = 0; i < arr.length; i++) {
        if (i !== current) arr[i] = 0;
      }
      return arr;
    });
    for (let i = 0; i < SLIDE_COUNT; i++) {
      if (i !== current) {
        progressStartTime.current[i] = null;
        progressPausedAt.current[i] = null;
      }
    }
  }, []);

  useEffect(() => {
    setProgress((prev) => {
      const arr = [...prev];
      arr[slideIndex] = 0; // reset current
      return arr;
    });
    progressStartTime.current[slideIndex] = null;
    progressPausedAt.current[slideIndex] = null;
    prevSlideIndex.current = slideIndex;
  }, [slideIndex]);

  // Handle scroll progress updates
  const updateScrollProgress = useCallback(() => {
    if (!weeklyFeaturedUsersCarouselApi) return;

    const rawProgress = weeklyFeaturedUsersCarouselApi.scrollProgress();
    const progress = snapToExpectedValue(rawProgress);

    // Only update if there's a meaningful change
    setScrollProgress((prev) => {
      if (Math.abs(progress - prev) > 0.0001) {
        return progress;
      }
      return prev; // No update, so no rerender
    });
  }, [weeklyFeaturedUsersCarouselApi]);

  useEffect(() => {
    setButtonWidths(calculatedButtonWidths);
  }, [calculatedButtonWidths]);

  useEffect(() => {
    if (!windowHasFocus) {
      setIsTimerPaused(true);
    } else {
      setIsTimerPaused(false);
    }
  }, [windowHasFocus]);

  // Handle button clicks
  const handleButtonClick = useCallback(
    (index: number) => {
      if (!weeklyFeaturedUsersCarouselApi) return;
      weeklyFeaturedUsersCarouselApi.scrollTo(index);
    },
    [weeklyFeaturedUsersCarouselApi],
  );

  // Setup carousel event listeners
  useEffect(() => {
    if (!weeklyFeaturedUsersCarouselApi) return;

    updateScrollProgress();

    const handleSelect = () => {
      updateScrollProgress();
      const selectedIndex = weeklyFeaturedUsersCarouselApi.selectedScrollSnap();
      setSlideIndex(selectedIndex);
    };

    const handleScroll = () => {
      updateScrollProgress();
      // Reset all progress except the current slide during scroll
      resetAllProgressExcept(slideIndex);
    };

    const handlePointerDown = () => {
      pauseTimer();
      // Reset all progress except the current slide as soon as swipe starts
      resetAllProgressExcept(slideIndex);
    };

    const handlePointerUp = () => {
      resumeTimer();
    };

    weeklyFeaturedUsersCarouselApi.on("select", handleSelect);
    weeklyFeaturedUsersCarouselApi.on("scroll", handleScroll);
    weeklyFeaturedUsersCarouselApi.on("pointerDown", handlePointerDown);
    weeklyFeaturedUsersCarouselApi.on("pointerUp", handlePointerUp);

    return () => {
      weeklyFeaturedUsersCarouselApi.off("select", handleSelect);
      weeklyFeaturedUsersCarouselApi.off("scroll", handleScroll);
      weeklyFeaturedUsersCarouselApi.off("pointerDown", handlePointerDown);
      weeklyFeaturedUsersCarouselApi.off("pointerUp", handlePointerUp);
    };
  }, [
    weeklyFeaturedUsersCarouselApi,
    slideIndex,
    resetAllProgressExcept,
    updateScrollProgress,
    pauseTimer,
    resumeTimer,
  ]);

  const isAboveMediumViewport = useViewportWidthBreakpoint(768);

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      className="baseVertFlex w-full gap-4"
    >
      <Carousel
        setApi={setWeeklyFeaturedUsersCarouselApi}
        opts={{
          loop: true,
        }}
        className="baseFlex w-full"
      >
        <CarouselContent className="-ml-12 pb-1">
          {weeklyFeaturedUsers.map((user, index) => (
            <CarouselItem
              key={user.userId}
              className="baseFlex basis-full pl-12 md:h-[280px] md:basis-[710px]"
            >
              <div className="baseFlex size-full rounded-lg border bg-secondary-active/50 px-4 py-4 shadow-sm">
                <div
                  className={`baseVertFlex min-w-0 gap-8 md:!flex-row ${user.pinnedTab === null ? "md:gap-12" : ""}`}
                >
                  <div className="baseVertFlex min-w-0 !items-start gap-2">
                    <div className="baseFlex gap-1">User</div>

                    <Button variant={"link"} asChild>
                      <Link
                        prefetch={false}
                        href={`/user/${user.username}/filters`}
                        className="baseFlex min-w-0 max-w-[250px] !justify-start gap-2 !p-0 md:max-w-[100%]"
                      >
                        <div className="grid shrink-0 grid-cols-1 grid-rows-1">
                          <Image
                            src={user.profileImageUrl}
                            alt={`${user.username}'s profile picture`}
                            width={300}
                            height={300}
                            onLoad={() => {
                              setTimeout(() => {
                                setProfileImageLoadStates((prevStates) => {
                                  const newStates = [...prevStates];
                                  newStates[index] = true;
                                  return newStates;
                                });
                              }, 100);
                            }}
                            style={{
                              opacity: profileImageLoadStates[index] ? 1 : 0,
                              transition: "opacity 0.3s ease-in-out",
                            }}
                            className="col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-full object-cover object-center md:size-10"
                          />

                          <AnimatePresence>
                            {!profileImageLoadStates[index] && (
                              <motion.div
                                key={`gridTabCardSkeletonImageLoader-${user.userId}`}
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="pulseAnimation bg-skeleton z-10 col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-full md:size-10"
                              ></motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <span className="w-full truncate text-2xl font-semibold tracking-tight md:text-3xl">
                          {user.username}
                        </span>
                      </Link>
                    </Button>

                    <div className="baseVertFlex mt-4 !items-start gap-2 self-center font-medium sm:text-lg">
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
                        <span className="w-12 text-end">
                          {user.averageTabRating}
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
                    <div className="baseVertFlex h-[94px] w-[280px] shrink-0 gap-2 rounded-md border bg-secondary-active/50 shadow-sm md:mt-24">
                      <TbPinned className="size-5" />
                      No active pinned tab
                    </div>
                  ) : (
                    <GridTabCard
                      minimalTab={user.pinnedTab}
                      currentUser={currentUser}
                      pinnedTabType={
                        isAboveMediumViewport ? "full" : "withoutScreenshot"
                      }
                    />
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div
        className="baseFlex w-full gap-2"
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <Button
            key={index}
            variant={"text"}
            onClick={() => handleButtonClick(index)}
            style={{
              width: `${buttonWidths[index]}px`,
              height: "12px",
            }}
            className="relative overflow-hidden rounded-full bg-accent/50 !p-0 hover:bg-accent focus-visible:bg-accent/90 active:bg-accent/80"
          >
            <div
              ref={(el) => {
                progressBarRefs.current[index] = el;
              }}
              style={{
                transform: `scaleX(${progress[index]})`,
                transformOrigin: "left center",
                transition:
                  index === slideIndex && !isTimerPaused
                    ? "none"
                    : "transform 0.2s",
                opacity: progressBarOpacities[index],
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
