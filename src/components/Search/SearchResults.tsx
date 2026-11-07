import { routeUrl } from "~/utils/routeUrl";
import { useRouter } from "next/navigation";
import { useRouteLocation } from "~/hooks/useRouteLocation";
import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";

import { useEffect, useLayoutEffect, useRef, useState, Fragment } from "react";
import { flushSync } from "react-dom";
import { BsGridFill, BsPlus } from "react-icons/bs";
import { CiViewTable } from "react-icons/ci";
import { LuFilter } from "react-icons/lu";
import { useInView } from "react-intersection-observer";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import Render404Page from "~/components/Search/Render404Page";
import { Button } from "~/components/ui/button";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { Label } from "~/components/ui/label";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";
import { useTabStore } from "~/stores/TabStore";
import { genreColors } from "~/utils/genreColors";
import { tunings } from "~/utils/tunings";
import GridTabView from "./GridTabView";
import SearchFilterCarousel from "./SearchFilterCarousel";
import TableTabView from "./TableTabView";
import Binoculars from "~/components/ui/icons/Binoculars";
import Link from "next/link";
import { VisuallyHidden } from "~/components/ui/visually-hidden";
import Spinner from "~/components/ui/Spinner";
import { useAuth } from "@clerk/nextjs";
import { api } from "~/utils/api";
import type { InfiniteQueryParams } from "~/server/api/routers/search";
import { cn } from "~/utils/cn";
import styles from "./SearchResults.module.css";

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];
const difficultyDescriptions = [
  "Open chords and single-note melodies with slow, steady downstrums.",
  "Common progressions and power chords, light barre shapes, simple up-down strumming patterns.",
  "Alternate picking and position shifts, varied chord voicings, syncopated strumming with muting.",
  "Fast passages, complex rhythms, advanced voicings, and expressive techniques.",
  "Virtuoso techniques, intricate arrangements, extended chords, and nuanced interpretation.",
];

interface SearchResults {
  isFetchingArtistId?: boolean; // happens whenever user manually searches for an artist, need to fetch the id as well
  isFetchingUserMetadata?: boolean; // happens whenever visiting a user's profile page, need to fetch the user's metadata first
  userDoesNotExist?: boolean; // happens whenever user manually searches for a user that doesn't exist
  relatedArtists?: {
    name: string;
    id: number;
    isVerified: boolean;
  }[];
  isFetchingRelatedArtists?: boolean;
}

function SearchResults({
  isFetchingArtistId,
  isFetchingUserMetadata,
  userDoesNotExist,
  relatedArtists,
  isFetchingRelatedArtists,
}: SearchResults) {
  const { userId } = useAuth();
  const mobileToolbarRef = useRef<HTMLDivElement>(null);
  const desktopToolbarRef = useRef<HTMLDivElement>(null);
  const { asPath, query, pathname } = useRouteLocation();
  const { push } = useRouter();

  const { viewportLabel, color, theme } = useTabStore((state) => ({
    viewportLabel: state.viewportLabel,
    color: state.color,
    theme: state.theme,
  }));

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [gateUntilWindowIsAvailable, setGateUntilWindowIsAvailable] =
    useState(true);

  const [searchResultsCount, setSearchResultsCount] = useState(0);

  useEffect(() => {
    setGateUntilWindowIsAvailable(false);
  }, []);

  const disableFiltersAndLayoutToggle =
    isFetchingUserMetadata ||
    userDoesNotExist ||
    isFetchingArtistId ||
    isFetchingRelatedArtists ||
    relatedArtists !== undefined;

  const {
    searchQuery,
    genre,
    tuning,
    capo,
    difficulty,
    sortBy,
    renderSearch404,
    searchParamsParsed,
  } = useGetUrlParamFilters();

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  function getInfiniteQueryParams(): InfiniteQueryParams {
    return {
      searchQuery: searchQuery ?? "",
      genre,
      tuning,
      capo: capo ?? undefined,
      difficulty: difficulty ?? undefined,
      sortBy,
      usernameToSelectFrom: asPath.includes("/user")
        ? ((query.username as string) ?? undefined)
        : asPath.includes("/profile/tabs")
          ? (currentUser?.username ?? undefined)
          : undefined,
      artistIdToSelectFrom:
        asPath.includes("/artist") && query.id ? Number(query.id) : undefined,
      bookmarkedByUserId:
        asPath.includes("/profile/bookmarks") && userId ? userId : undefined,
    };
  }

  const {
    data: tabResults,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.search.getInfiniteTabsBySearchQuery.useInfiniteQuery(
    getInfiniteQueryParams(),
    {
      getNextPageParam: (lastPage) => lastPage.data.nextCursor,
      onSuccess: (data) => {
        setSearchResultsCount(data?.pages?.[0]?.count ?? 0);
      },
      enabled:
        searchParamsParsed &&
        !renderSearch404 &&
        (!asPath.includes("/profile/tabs") || !!currentUser) &&
        (!asPath.includes("/profile/bookmarks") || !!userId),
      // need to wait for currentUser to be fetched before trying to search when
      // on current user's tabs page
    },
  );

  const layoutType = useLocalStorageValue("autostrum-layout", {
    defaultValue: "grid",
    initializeWithValue: true,
  });

  const layoutTransition = useRef<ViewTransition | null>(null);
  const requestedLayout = useRef<"grid" | "table" | null>(null);

  function changeLayout(nextLayout: "grid" | "table") {
    if (nextLayout === (requestedLayout.current ?? layoutType.value)) return;
    requestedLayout.current = nextLayout;
    layoutTransition.current?.skipTransition();

    const update = () => flushSync(() => layoutType.set(nextLayout));
    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      layoutTransition.current = null;
      document.documentElement.removeAttribute("data-search-layout-transition");
      update();
      requestedLayout.current = null;
      return;
    }

    // Keep the captured grid visible until the new layout is fully committed.
    // Browser snapshots crossfade without repeatedly laying out the live grid,
    // adding a transformed sticky ancestor, or leaving an empty fade-out gap.
    document.documentElement.setAttribute("data-search-layout-transition", "");
    const transition = document.startViewTransition(update);
    layoutTransition.current = transition;
    const finish = () => {
      if (layoutTransition.current !== transition) return;
      layoutTransition.current = null;
      requestedLayout.current = null;
      document.documentElement.removeAttribute("data-search-layout-transition");
    };
    void transition.ready.catch(() => undefined);
    void transition.finished.then(finish, finish);
  }

  useEffect(
    () => () => {
      if (!layoutTransition.current) return;
      layoutTransition.current.skipTransition();
      layoutTransition.current = null;
      document.documentElement.removeAttribute("data-search-layout-transition");
    },
    [],
  );

  // it's really bad UX to immediately push() user to new route whenever they
  // select a new filter, as selecting multiple filters would mean the user
  // would have to wait for the page to reload multiple times. gating push()
  // behind the "Apply" button.
  const [localFilters, setLocalFilters] = useState({
    genre: genre,
    tuning: tuning,
    capo: capo,
    difficulty: difficulty,
    sortBy: sortBy,
  });

  const [initialFilters, setInitialFilters] = useState<{
    genre: string | undefined;
    tuning: string | undefined;
    capo: boolean | undefined;
    difficulty: number | undefined;
    sortBy: string | undefined;
  } | null>(null);

  // unsure if this effect is necessary
  useLayoutEffect(() => {
    if (!searchParamsParsed || initialFilters) return;

    setLocalFilters({
      genre: genre,
      tuning: tuning,
      capo: capo,
      difficulty: difficulty,
      sortBy: sortBy,
    });

    setInitialFilters({
      genre: genre,
      tuning: tuning,
      capo: capo,
      difficulty: difficulty,
      sortBy: sortBy,
    });
  }, [
    searchParamsParsed,
    initialFilters,
    searchQuery,
    genre,
    tuning,
    capo,
    difficulty,
    sortBy,
  ]);

  const {
    ref: stickyStylesSentinelRef,
    inView: stickyHeaderNotActive, // TODO: find a better name for this
  } = useInView({
    threshold: 0,
    initialInView: true,
    rootMargin: "-64px", // height of the sticky header
  });

  // fyi: all param change handlers below will remove the param if it is getting set
  // to the "default" values that we have defined in the useGetUrlParamFilters hook

  function applyFilters() {
    const newQuery = { ...query };

    if (localFilters.genre && localFilters.genre !== "allGenres") {
      newQuery.genre = localFilters.genre;
    } else {
      delete newQuery.genre;
    }

    if (localFilters.tuning) {
      newQuery.tuning = localFilters.tuning;
    } else {
      delete newQuery.tuning;
    }

    if (localFilters.capo === true || localFilters.capo === false) {
      newQuery.capo = localFilters.capo.toString();
    } else {
      delete newQuery.capo;
    }

    if (localFilters.difficulty) {
      newQuery.difficulty = localFilters.difficulty.toString();
    } else {
      delete newQuery.difficulty;
    }

    // default value changes between "relevance" and "newest"
    // based on if there is a search query or not.
    if (localFilters.sortBy === "relevance" && searchQuery) {
      delete newQuery.sortBy;
    } else if (localFilters.sortBy === "newest" && !searchQuery) {
      delete newQuery.sortBy;
    } else {
      newQuery.sortBy = localFilters.sortBy;
    }

    setDrawerOpen(false);

    push(routeUrl(pathname, newQuery), { scroll: false });
  }

  function resetSearchFilters() {
    setLocalFilters({
      genre: undefined,
      tuning: undefined,
      capo: undefined,
      difficulty: undefined,
      sortBy: searchQuery ? "relevance" : "newest",
    });
  }

  // disabled if user has the "default" filters selected for each filter
  function disableResetFiltersButton() {
    const defaultSortByFilter = searchQuery
      ? localFilters.sortBy === "relevance"
      : localFilters.sortBy === "newest";

    return (
      disableFiltersAndLayoutToggle ||
      (localFilters.genre === undefined &&
        localFilters.tuning === undefined &&
        localFilters.capo === undefined &&
        localFilters.difficulty === undefined &&
        defaultSortByFilter)
    );
  }

  function disableApplyFiltersButton() {
    return (
      disableFiltersAndLayoutToggle ||
      (localFilters.genre === genre &&
        localFilters.tuning === tuning &&
        localFilters.capo === capo &&
        localFilters.difficulty === difficulty &&
        localFilters.sortBy === sortBy)
    );
  }

  // FYI: I really dislike this, but suppressing the hydration error
  // for localstorage layout was an even worse approach.
  if (gateUntilWindowIsAvailable) return null;

  return (
    <div className="baseFlex min-h-[calc(100dvh-4rem-6rem-56px)] w-full !items-start gap-4 md:min-h-[calc(100dvh-4rem-12rem-56px)]">
      {/* tablet+ filters sidebar */}
      <div className="baseVertFlex sticky top-20 !hidden h-fit w-56 shrink-0 !items-start !justify-start gap-4 rounded-lg border bg-accent p-4 text-primary-foreground tablet:!flex">
        <div className="baseFlex gap-2">
          <LuFilter className="size-5" />
          <span className="text-lg font-medium">Filters</span>
        </div>
        {/* genre selector */}
        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label htmlFor="genre">Genre</Label>
          <Select
            disabled={disableFiltersAndLayoutToggle}
            value={localFilters.genre ? localFilters.genre : "allGenres"}
            onValueChange={(value) => {
              if (value === null) return;
              return setLocalFilters((prev) => ({ ...prev, genre: value }));
            }}
          >
            <SelectTrigger
              id="genre"
              className="w-full focus:ring-primary-foreground/75"
            >
              <SelectValue placeholder="Select a genre">
                {localFilters.genre && localFilters.genre !== "allGenres" ? (
                  <div className="baseFlex gap-2">
                    <div
                      style={{
                        backgroundColor:
                          genreColors.get(localFilters.genre) || "",
                        boxShadow: "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                      }}
                      className="h-3 w-3 rounded-full"
                    ></div>
                    {localFilters.genre}
                  </div>
                ) : (
                  <span>All genres</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={"allGenres"}>All genres</SelectItem>

              <Separator className="my-1 w-full bg-primary" />

              {[...genreColors.entries()].map(([name, color]) => {
                return (
                  <SelectItem key={name} value={name}>
                    <div className="baseFlex !justify-start gap-2">
                      <div
                        style={{
                          backgroundColor: color,
                          boxShadow: "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                        }}
                        className="h-3 w-3 rounded-full"
                      ></div>

                      {name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label htmlFor="tuning">Tuning</Label>
          <Select
            disabled={disableFiltersAndLayoutToggle}
            value={
              localFilters.tuning ? localFilters.tuning.toLowerCase() : "all"
            }
            onValueChange={(value) => {
              if (value === null) return;
              setLocalFilters((prev) => ({
                ...prev,
                tuning: value,
              }));
            }}
          >
            <SelectTrigger
              id="tuning"
              className="h-10 w-full focus:ring-primary-foreground/75"
            >
              <SelectValue placeholder="Select tuning...">
                {localFilters.tuning ? (
                  <>
                    {localFilters.tuning === "custom" ? (
                      "Custom"
                    ) : (
                      <PrettyTuning
                        tuning={localFilters.tuning}
                        displayWithFlex={true}
                      />
                    )}
                  </>
                ) : (
                  "All tunings"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[300px]">
              {/* all tunings select item */}
              <SelectItem value={"all"}>All tunings</SelectItem>

              <Separator className="my-1 w-full bg-primary" />

              {/* Standard Tunings */}
              {tunings.map((tuningObj) => (
                <SelectItem
                  key={tuningObj.simpleNotes}
                  value={tuningObj.notes.toLowerCase()} // Use the full notes string as the value
                >
                  <div className="baseFlex w-[235px] !justify-between">
                    <span className="font-medium">{tuningObj.name}</span>
                    <PrettyTuning tuning={tuningObj.simpleNotes} width="w-36" />
                  </div>
                </SelectItem>
              ))}

              <Separator className="my-1 w-full bg-primary" />

              {/* custom tuning catch-all selection */}
              <SelectItem value={"custom"}>Custom tunings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label htmlFor="capo">Capo</Label>
          <Select
            disabled={disableFiltersAndLayoutToggle}
            value={
              localFilters.capo !== undefined
                ? localFilters.capo.toString()
                : "all"
            }
            onValueChange={(value) => {
              if (value === null) return;
              setLocalFilters((prev) => ({
                ...prev,
                capo:
                  value === "true"
                    ? true
                    : value === "false"
                      ? false
                      : undefined,
              }));
            }}
          >
            <SelectTrigger
              id="capo"
              className="w-full focus:ring-primary-foreground/75"
            >
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={"all"}>Capo + Non-capo</SelectItem>

              <Separator className="my-1 w-full bg-primary" />

              <SelectItem value={"true"}>With capo</SelectItem>
              <SelectItem value={"false"}>Without capo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            disabled={disableFiltersAndLayoutToggle}
            value={
              localFilters.difficulty
                ? localFilters.difficulty.toString()
                : "all"
            }
            onValueChange={(value) => {
              if (value === null) return;
              setLocalFilters((prev) => ({
                ...prev,
                difficulty: value === "all" ? undefined : parseInt(value),
              }));
            }}
          >
            <SelectTrigger
              id="difficulty"
              className="w-full focus:ring-primary-foreground/75"
            >
              <SelectValue placeholder="Select a difficulty">
                {localFilters.difficulty ? (
                  <div className="baseFlex gap-2">
                    <DifficultyBars difficulty={localFilters.difficulty ?? 5} />
                    {DIFFICULTIES[(localFilters.difficulty ?? 5) - 1]}
                  </div>
                ) : (
                  <span>All difficulties</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[350px]">
              <SelectGroup>
                <SelectItem value={"all"}>
                  <span>All difficulties</span>
                </SelectItem>

                <Separator className="my-1 w-full bg-primary" />

                <SelectItem value={"1"}>
                  <div className="baseVertFlex !items-start gap-1">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={1} />
                      <span className="font-medium">Beginner</span>
                    </div>
                    <p className="text-sm opacity-75">
                      {difficultyDescriptions[0]}
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value={"2"}>
                  <div className="baseVertFlex !items-start gap-1">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={2} />
                      <span className="font-medium">Easy</span>
                    </div>
                    <p className="text-sm opacity-75">
                      {difficultyDescriptions[1]}
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value={"3"}>
                  <div className="baseVertFlex !items-start gap-1">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={3} />
                      <span className="font-medium">Intermediate</span>
                    </div>
                    <p className="text-sm opacity-75">
                      {difficultyDescriptions[2]}
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value={"4"}>
                  <div className="baseVertFlex !items-start gap-1">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={4} />
                      <span className="font-medium">Advanced</span>
                    </div>
                    <p className="text-sm opacity-75">
                      {difficultyDescriptions[3]}
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value={"5"}>
                  <div className="baseVertFlex !items-start gap-1">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={5} />
                      <span className="font-medium">Expert</span>
                    </div>
                    <p className="text-sm opacity-75">
                      {difficultyDescriptions[4]}
                    </p>
                  </div>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label htmlFor="sortBy">Sort by</Label>
          <Select
            disabled={disableFiltersAndLayoutToggle}
            value={localFilters.sortBy}
            onValueChange={(value) => {
              if (value === null) return;
              return setLocalFilters((prev) => ({
                ...prev,
                sortBy: value,
              }));
            }}
          >
            <SelectTrigger
              id="sortBy"
              className="w-full focus:ring-primary-foreground/75"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="mostPopular">Most popular</SelectItem>
              <SelectItem value="leastPopular">Least popular</SelectItem>
              <SelectItem value="relevance" disabled={!searchQuery}>
                Relevance
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="baseFlex w-full !justify-between gap-2">
          <Button
            variant="link"
            disabled={disableResetFiltersButton()}
            onClick={() => resetSearchFilters()}
            className="h-5 !p-0"
          >
            Reset filters
          </Button>

          <Button
            variant="outline"
            disabled={disableApplyFiltersButton()}
            onClick={() => applyFilters()}
            className="text-primary-foreground hover:text-foreground"
          >
            Apply
          </Button>
        </div>
      </div>

      <div className="baseVertFlex relative h-full min-w-0 flex-1">
        <div
          ref={stickyStylesSentinelRef}
          className="absolute top-0 h-[1px]"
        ></div>
        {viewportLabel.includes("mobile") ? (
          // mobile: # of results / filter drawer trigger
          <motion.div
            ref={mobileToolbarRef}
            initial={false}
            animate={{
              paddingBottom: "0.75rem",
            }}
            transition={{ duration: 0.5, ease: "linear" }}
            className={`baseVertFlex sticky top-16 z-20 w-full !justify-between border-b-0 border-t bg-accent pt-3 text-primary-foreground md:border-x tablet:!hidden ${stickyHeaderNotActive ? "md:rounded-t-lg" : "rounded-t-none"}`}
          >
            <AnimatePresence initial={false}>
              <div className="baseFlex w-full !justify-between gap-2 px-4">
                {/* # of results */}
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={
                      isFetching && !isFetchingNextPage
                        ? "mobileSearchResultsCountSkeleton"
                        : "mobileSearchResultsCount"
                    }
                    variants={opacityVariants}
                    initial="closed"
                    animate="expanded"
                    exit="closed"
                    transition={{ duration: 0.3 }}
                  >
                    <>
                      {isFetching && !isFetchingNextPage ? (
                        <div className="pulseAnimation h-6 w-36 rounded-md !bg-primary-foreground/35"></div>
                      ) : (
                        <span>
                          {`${searchResultsCount} tab${
                            searchResultsCount === 1 ? "" : "s"
                          } found`}
                        </span>
                      )}
                    </>
                  </motion.div>
                </AnimatePresence>

                <div className="baseFlex gap-2">
                  {/* layout type selector */}
                  <div className="baseFlex gap-3">
                    <Label>Layout</Label>
                    <div
                      data-search-layout-toggle=""
                      className="relative isolate overflow-hidden rounded-md border"
                    >
                      <div data-layout-labels="" className="grid grid-cols-2">
                        <Button
                          variant="toggle"
                          aria-label="Grid view"
                          aria-pressed={layoutType.value === "grid"}
                          size="sm"
                          disabled={disableFiltersAndLayoutToggle}
                          style={{
                            color:
                              theme === "light"
                                ? layoutType.value === "grid"
                                  ? "hsl(var(--foreground))"
                                  : "hsl(var(--background))"
                                : "hsl(var(--primary-foreground))",
                          }}
                          className="baseFlex relative gap-2 border-none"
                          onClick={() => {
                            changeLayout("grid");
                          }}
                        >
                          <BsGridFill className="size-4" />
                        </Button>

                        <Button
                          variant="toggle"
                          aria-label="Table view"
                          aria-pressed={layoutType.value === "table"}
                          size="sm"
                          disabled={disableFiltersAndLayoutToggle}
                          style={{
                            color:
                              theme === "light"
                                ? layoutType.value === "table"
                                  ? "hsl(var(--foreground))"
                                  : "hsl(var(--background))"
                                : "hsl(var(--primary-foreground))",
                          }}
                          className="baseFlex relative gap-2 border-none"
                          onClick={() => {
                            changeLayout("table");
                          }}
                        >
                          <CiViewTable className="size-4 stroke-[0.5px]" />
                        </Button>
                      </div>

                      <div
                        style={{
                          transform:
                            layoutType.value === "grid"
                              ? "translateX(0)"
                              : "translateX(100%)",
                          backgroundColor:
                            theme === "light"
                              ? "hsl(var(--background))"
                              : "hsl(var(--primary))",
                        }}
                        data-layout-pill=""
                        className="togglePill pointer-events-none absolute inset-y-0 left-0 !z-[-1] w-1/2 rounded-sm"
                      ></div>
                    </div>
                  </div>

                  {/* filter drawer trigger */}
                  <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DrawerTrigger
                      render={
                        <Button
                          variant="outline"
                          aria-label="Search filters"
                          disabled={disableFiltersAndLayoutToggle}
                          className="baseFlex w-9 text-primary-foreground active:scale-95 motion-reduce:transform-none"
                        >
                          <LuFilter className="size-4 shrink-0" />
                        </Button>
                      }
                    />
                    <DrawerContent className="max-h-[calc(100dvh-1rem)] !items-start !justify-start">
                      <VisuallyHidden>
                        <DrawerDescription>
                          Use the search filters to narrow down your results.
                        </DrawerDescription>
                      </VisuallyHidden>

                      <div className="baseFlex w-full shrink-0 !justify-between px-2">
                        <Button
                          variant="drawerNavigation"
                          disabled={disableResetFiltersButton()}
                          onClick={resetSearchFilters}
                          className="h-10 w-12 !p-0 font-normal active:scale-95 motion-reduce:transform-none"
                        >
                          Reset
                        </Button>
                        <DrawerTitle className="baseFlex gap-2 text-base font-medium tracking-normal">
                          <LuFilter className="size-4" />
                          Search filters
                        </DrawerTitle>
                        <Button
                          variant="drawerNavigation"
                          disabled={disableApplyFiltersButton()}
                          onClick={applyFilters}
                          className="h-10 w-12 !p-0 active:scale-95 motion-reduce:transform-none"
                        >
                          Apply
                        </Button>
                      </div>

                      <div className="min-h-0 w-full overflow-y-auto overscroll-contain pb-2 pt-3">
                        <SearchFilterCarousel
                          label="Genre"
                          value={
                            localFilters.genre === "allGenres"
                              ? undefined
                              : localFilters.genre
                          }
                          onValueChange={(genre) =>
                            setLocalFilters((prev) => ({ ...prev, genre }))
                          }
                          options={[
                            { value: undefined, label: "All genres" },
                            ...[...genreColors.entries()].map(
                              ([name, color]) => ({
                                value: name,
                                label: name,
                                badgeColor: color,
                              }),
                            ),
                          ]}
                        />
                        <SearchFilterCarousel
                          label="Tuning"
                          value={localFilters.tuning}
                          onValueChange={(tuning) =>
                            setLocalFilters((prev) => ({ ...prev, tuning }))
                          }
                          options={[
                            { value: undefined, label: "All tunings" },
                            ...tunings.map((tuning) => ({
                              value: tuning.notes.toLowerCase(),
                              label: (
                                <>
                                  <span>{tuning.name}</span>
                                </>
                              ),
                            })),
                            { value: "custom", label: "Custom tunings" },
                          ]}
                        />
                        <SearchFilterCarousel
                          label="Capo"
                          value={localFilters.capo}
                          onValueChange={(capo) =>
                            setLocalFilters((prev) => ({ ...prev, capo }))
                          }
                          options={[
                            { value: undefined, label: "Any" },
                            { value: true, label: "With capo" },
                            { value: false, label: "Without capo" },
                          ]}
                        />
                        <SearchFilterCarousel
                          label="Difficulty"
                          value={localFilters.difficulty}
                          onValueChange={(difficulty) =>
                            setLocalFilters((prev) => ({ ...prev, difficulty }))
                          }
                          options={[
                            { value: undefined, label: "All difficulties" },
                            ...DIFFICULTIES.map((name, index) => ({
                              value: index + 1,
                              label: (
                                <>
                                  <DifficultyBars difficulty={index + 1} />
                                  {name}
                                </>
                              ),
                            })),
                          ]}
                        />
                        <SearchFilterCarousel<typeof sortBy>
                          label="Sort by"
                          value={localFilters.sortBy}
                          onValueChange={(sortBy) =>
                            setLocalFilters((prev) => ({ ...prev, sortBy }))
                          }
                          options={[
                            { value: "newest", label: "Newest" },
                            { value: "oldest", label: "Oldest" },
                            { value: "mostPopular", label: "Most popular" },
                            { value: "leastPopular", label: "Least popular" },
                            {
                              value: "relevance",
                              label: "Relevance",
                              disabled: !searchQuery,
                            },
                          ]}
                        />
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>
              </div>
            </AnimatePresence>
          </motion.div>
        ) : (
          // tablet+: # of results / view type toggle
          <div ref={desktopToolbarRef} className={styles.stickyHeader}>
            <div
              aria-hidden="true"
              className={`pageBackgroundGradient ${styles.backdrop}`}
            />
            <motion.div
              initial={false}
              animate={{
                paddingBottom: "0.75rem",
              }}
              transition={{ duration: 0.5, ease: "linear" }}
              className={cn(
                "baseVertFlex w-full !justify-between rounded-t-lg border bg-accent pt-3 text-primary-foreground",
                layoutType.value === "table" && "border-b-0",
              )}
            >
              <AnimatePresence initial={false}>
                <div className="baseFlex w-full !justify-between gap-2 px-4">
                  {/* # of results */}
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={
                        isFetching && !isFetchingNextPage
                          ? "tabletSearchResultsCountSkeleton"
                          : "tabletSearchResultsCount"
                      }
                      variants={opacityVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.3 }}
                    >
                      <>
                        {isFetching && !isFetchingNextPage ? (
                          <div className="pulseAnimation h-6 w-48 rounded-md !bg-primary-foreground/35"></div>
                        ) : (
                          <span>
                            {`${searchResultsCount} tab${
                              searchResultsCount === 1 ? "" : "s"
                            } found`}
                          </span>
                        )}
                      </>
                    </motion.div>
                  </AnimatePresence>

                  {/* layout type toggle */}
                  <div className="baseFlex gap-3">
                    <Label>Layout</Label>
                    <div
                      data-search-layout-toggle=""
                      className="relative isolate overflow-hidden rounded-md border"
                    >
                      <div data-layout-labels="" className="grid grid-cols-2">
                        <Button
                          variant="toggle"
                          aria-label="Grid view"
                          aria-pressed={layoutType.value === "grid"}
                          size="sm"
                          disabled={disableFiltersAndLayoutToggle}
                          style={{
                            color:
                              theme === "light"
                                ? layoutType.value === "grid"
                                  ? "hsl(var(--foreground))"
                                  : "hsl(var(--background))"
                                : "hsl(var(--primary-foreground))",
                          }}
                          className="baseFlex relative gap-2 rounded-sm"
                          onClick={() => {
                            changeLayout("grid");
                          }}
                        >
                          <BsGridFill className="size-4" />
                          Grid
                        </Button>

                        <Button
                          variant="toggle"
                          aria-label="Table view"
                          aria-pressed={layoutType.value === "table"}
                          size="sm"
                          disabled={disableFiltersAndLayoutToggle}
                          style={{
                            color:
                              theme === "light"
                                ? layoutType.value === "table"
                                  ? "hsl(var(--foreground))"
                                  : "hsl(var(--background))"
                                : "hsl(var(--primary-foreground))",
                          }}
                          className="baseFlex relative gap-2 rounded-sm"
                          onClick={() => {
                            changeLayout("table");
                          }}
                        >
                          <CiViewTable className="size-4 stroke-[0.5px]" />
                          Table
                        </Button>
                      </div>

                      <div
                        style={{
                          transform:
                            layoutType.value === "grid"
                              ? "translateX(0)"
                              : "translateX(100%)",
                          backgroundColor:
                            theme === "light"
                              ? "hsl(var(--background))"
                              : "hsl(var(--primary))",
                        }}
                        data-layout-pill=""
                        className="togglePill pointer-events-none absolute inset-y-0 left-0 !z-[-1] w-1/2 rounded-sm"
                      ></div>
                    </div>
                  </div>
                </div>
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* search results body */}
        <AnimatePresence mode="popLayout">
          <div className="size-full !border-t-0 border-b bg-background shadow-lg md:rounded-b-lg md:border">
            {renderSearch404 ? (
              <Render404Page
                layoutType={layoutType.value as "grid" | "table"}
              />
            ) : (
              <Fragment key={"searchResultsBody"}>
                {isFetchingUserMetadata ||
                isFetchingArtistId ||
                isFetchingRelatedArtists ? (
                  <motion.div
                    key={"searchResultsSpinner"}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="baseFlex size-full min-h-[calc(100dvh-4rem-6rem-56px-60px)] md:min-h-[calc(100dvh-4rem-12rem-56px-60px)]"
                  >
                    <Spinner className="size-8" />
                  </motion.div>
                ) : (
                  <>
                    {relatedArtists && (
                      <motion.div
                        key={"relatedArtists"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="baseVertFlex min-h-[calc(100dvh-4rem-6rem-56px-60px)] md:min-h-[calc(100dvh-4rem-12rem-56px-60px)]"
                      >
                        <div className="baseVertFlex gap-4 rounded-md border bg-secondary-active/50 px-8 py-4 shadow-md">
                          <div className="baseVertFlex gap-2 sm:gap-3">
                            <Binoculars className="size-7 sm:size-9" />
                            <p className="text-lg sm:text-xl">No tabs found</p>
                          </div>

                          {relatedArtists.length === 0 ? (
                            <Button
                              role="link"
                              className="baseFlex"
                              nativeButton={false}
                              render={
                                <Link
                                  prefetch={false}
                                  href={"/create"}
                                  onClick={() => {
                                    // TODO: add artistName to localStorage
                                    // to pre-fill the artist name in the create tab form
                                  }}
                                  className="baseFlex gap-2"
                                >
                                  <BsPlus className="size-5" />
                                  Create the first tab for this artist
                                </Link>
                              }
                            />
                          ) : (
                            <div className="baseVertFlex gap-4">
                              Related artists
                              <div className="baseVertFlex gap-4 sm:!flex-row">
                                {relatedArtists.map((artist) => (
                                  <Button
                                    role="link"
                                    key={artist.id}
                                    variant={"secondary"}
                                    className="baseFlex"
                                    nativeButton={false}
                                    render={
                                      <Link
                                        prefetch={false}
                                        href={`/artist/${artist.name}/${artist.id}`}
                                        className="baseFlex gap-1"
                                      >
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
                                        {artist.name}
                                      </Link>
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {userDoesNotExist && (
                      <motion.div
                        key={"userDoesNotExist"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="baseVertFlex min-h-[calc(100dvh-4rem-6rem-56px-60px)] md:min-h-[calc(100dvh-4rem-12rem-56px-60px)]"
                      >
                        <div className="baseVertFlex gap-4 rounded-md border bg-secondary-active/50 px-8 py-4 text-xl shadow-md">
                          <div className="baseVertFlex gap-4">
                            <Binoculars className="size-9" />
                            This user does not exist.
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {!relatedArtists &&
                      !userDoesNotExist &&
                      searchParamsParsed && (
                        <div
                          data-search-layout={layoutType.value}
                          className="w-full min-w-0"
                        >
                          {layoutType.value === "grid" && (
                            <GridTabView
                              searchQuery={searchQuery}
                              tabResults={tabResults}
                              isFetching={isFetching}
                              isFetchingNextPage={isFetchingNextPage}
                              hasNextPage={hasNextPage}
                              fetchNextPage={fetchNextPage}
                              getInfiniteQueryParams={getInfiniteQueryParams}
                              currentUser={currentUser}
                              color={color}
                              theme={theme}
                            />
                          )}

                          {layoutType.value === "table" && (
                            <TableTabView
                              searchQuery={searchQuery}
                              tabResults={tabResults}
                              isFetching={isFetching}
                              isFetchingNextPage={isFetchingNextPage}
                              hasNextPage={hasNextPage}
                              fetchNextPage={fetchNextPage}
                              getInfiniteQueryParams={getInfiniteQueryParams}
                              currentUser={currentUser}
                              stickyToolbarRef={
                                viewportLabel.includes("mobile")
                                  ? mobileToolbarRef
                                  : desktopToolbarRef
                              }
                              asPath={asPath}
                            />
                          )}
                        </div>
                      )}
                  </>
                )}
              </Fragment>
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SearchResults;
