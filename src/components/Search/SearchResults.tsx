import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/router";
import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentRef,
} from "overlayscrollbars-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  Fragment,
} from "react";
import { BsGridFill, BsPlus } from "react-icons/bs";
import { CiViewTable } from "react-icons/ci";
import { GoChevronRight } from "react-icons/go";
import { LuFilter } from "react-icons/lu";
import { useInView } from "react-intersection-observer";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerPortal,
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
import TableTabView from "./TableTabView";
import Binoculars from "~/components/ui/icons/Binoculars";
import Link from "next/link";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import Spinner from "~/components/ui/Spinner";

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

// TODO: rename these to be more descriptive

const baseDrawerVariants = {
  initial: {
    opacity: 0,
    x: "-100%",
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: "-100%",
  },
};

const individualDrawerVariants = {
  initial: {
    opacity: 0,
    x: "100%",
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: "100%",
  },
};

const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];
const difficultyDescriptions = [
  "Open chords, basic melodies, simple strumming.",
  "Common progressions, basic barre chords, straightforward rhythms.",
  "Alternate picking, varied voicings, position shifts.",
  "Fast playing, bends, slides, tapping, expressive control.",
  "Virtuoso speed, sweep picking, extended voicings, interpretation.",
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
  const { asPath, push, query, pathname } = useRouter();

  const { viewportLabel, color, theme } = useTabStore((state) => ({
    viewportLabel: state.viewportLabel,
    color: state.color,
    theme: state.theme,
  }));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<
    "Search filters" | "Genre" | "Tuning" | "Capo" | "Difficulty" | "Sort by"
  >("Search filters");

  const [gateUntilWindowIsAvailable, setGateUntilWindowIsAvailable] =
    useState(true);

  const [searchResultsCount, setSearchResultsCount] = useState(0);
  const [searchResultsCountIsLoading, setSearchsearchResultsCountIsLoading] =
    useState(false);

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

  const layoutType = useLocalStorageValue("autostrum-layout", {
    defaultValue: "grid",
    initializeWithValue: true,
  });

  // really bad ux to immediately push() user to new route whenever they
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

  const tableHeaderRef = useRef<OverlayScrollbarsComponentRef<"div">>(null);
  const tableBodyRef = useRef<OverlayScrollbarsComponentRef<"div">>(null);

  const activeScrollerRef = useRef<"header" | "body" | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAboveSmViewport = useViewportWidthBreakpoint(640);

  const {
    ref: stickyStylesSentinelRef,
    inView: stickyHeaderNotActive, // TODO: find a better name for this
  } = useInView({
    threshold: 0,
    initialInView: true,
    rootMargin: "-64px", // height of the sticky header
  });

  const handlePointerDown = useCallback((scroller: "header" | "body") => {
    // Clear any pending timeout from a previous momentum scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    activeScrollerRef.current = scroller;
  }, []);

  const handlePointerUp = useCallback(() => {
    // To handle momentum scrolling, we don't clear the active scroller
    // immediately. Instead, we set a timeout.
    scrollTimeoutRef.current = setTimeout(() => {
      activeScrollerRef.current = null;
      scrollTimeoutRef.current = null;
    }, 750);
  }, []);

  function getDynamicGridTemplateColumns() {
    let gridTemplateColumns = "";

    // Direct /edit page button
    if (asPath.includes("/profile/tabs")) {
      gridTemplateColumns += isAboveSmViewport ? "90.95px " : "72px ";
    }

    // Title
    gridTemplateColumns += isAboveSmViewport ? "314.53px " : "250px ";

    // Artist
    if (!asPath.includes("/artist")) {
      gridTemplateColumns += "200px ";
    }

    // Rating / Difficulty / Genre / Date
    gridTemplateColumns += "repeat(4, ";

    if (isAboveSmViewport) {
      gridTemplateColumns += asPath.includes("/profile/tabs")
        ? "115.89px"
        : asPath.includes("/artist")
          ? "188.63px"
          : "138.63px";
    } else {
      gridTemplateColumns += asPath.includes("/profile/tabs")
        ? "141.5px"
        : asPath.includes("/artist")
          ? "209.5px"
          : "159.5px";
    }

    gridTemplateColumns += ") ";

    // Bookmark toggle
    gridTemplateColumns += isAboveSmViewport ? "90.95px" : "72px";

    return gridTemplateColumns;
  }

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

    void push(
      {
        pathname,
        query: newQuery,
      },
      undefined,
      {
        scroll: false,
      },
    );
  }

  // default value changes between "relevance" and "newest"
  // based on if there is a search query or not.
  function handleSortByChange(
    type: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular",
  ) {
    const newQueries = { ...query };

    if (newQueries.search && type === "relevance") {
      delete newQueries.sortBy;
    } else if (!newQueries.search && type === "newest") {
      delete newQueries.sortBy;
    } else {
      newQueries.sortBy = type;
    }

    void push(
      {
        pathname,
        query: newQueries,
      },
      undefined,
      {
        scroll: false,
      },
    );
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
      <div
        className={`baseVertFlex sticky top-16 !hidden h-fit w-56 shrink-0 !items-start !justify-start gap-4 rounded-lg border bg-accent p-4 text-primary-foreground transition-all tablet:!flex ${stickyHeaderNotActive ? "" : "rounded-t-none"}`}
      >
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
            onValueChange={(value) =>
              setLocalFilters((prev) => ({ ...prev, genre: value }))
            }
          >
            <SelectTrigger id="genre" className="w-full">
              <SelectValue placeholder="Select a genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={"allGenres"}>
                <div className="baseFlex gap-2">
                  <div
                    style={{
                      backgroundColor: "gray", // TODO: make this a circular gradient rainbow of all
                      // the colors in genreColors
                      boxShadow: "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                    }}
                    className="h-3 w-3 rounded-full"
                  ></div>
                  All genres
                </div>
              </SelectItem>

              <Separator className="my-1 w-full bg-primary" />

              {[...genreColors.entries()].map(([name, color]) => {
                return (
                  <SelectItem key={name} value={name}>
                    <div className="baseFlex gap-2">
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
              setLocalFilters((prev) => ({
                ...prev,
                tuning: value,
              }));
            }}
          >
            <SelectTrigger id="tuning" className="h-10 w-full">
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
              <SelectItem value={"all"} className="font-medium">
                All tunings
              </SelectItem>

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
              <SelectItem value={"custom"} className="font-medium">
                Custom tunings
              </SelectItem>
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
            <SelectTrigger id="capo" className="w-full">
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
              setLocalFilters((prev) => ({
                ...prev,
                difficulty: value === "all" ? undefined : parseInt(value),
              }));
            }}
          >
            <SelectTrigger id="difficulty" className="w-full">
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
                  <span className="font-medium">All difficulties</span>
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
            onValueChange={(value) =>
              setLocalFilters((prev) => ({
                ...prev,
                sortBy: value as
                  | "relevance"
                  | "newest"
                  | "oldest"
                  | "mostPopular"
                  | "leastPopular",
              }))
            }
          >
            <SelectTrigger id="sortBy" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance" disabled={!searchQuery}>
                Relevance
              </SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="mostPopular">Most popular</SelectItem>
              <SelectItem value="leastPopular">Least popular</SelectItem>
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

      <div className="baseVertFlex relative size-full">
        <div
          ref={stickyStylesSentinelRef}
          className="absolute top-0 h-[1px]"
        ></div>
        {viewportLabel.includes("mobile") ? (
          // mobile: # of results / filter drawer trigger
          <motion.div
            initial={false}
            animate={{
              paddingBottom:
                layoutType.value === "table" ? "0.25rem" : "0.75rem",
            }}
            transition={{ duration: 0.5, ease: "linear" }}
            className="baseVertFlex sticky top-16 z-20 w-full !justify-between border-b-0 border-t bg-accent pt-3 text-primary-foreground tablet:!hidden"
          >
            {/* scroll area + only show on hover for BOTH the header + the table scrollbars */}
            <AnimatePresence initial={false}>
              <div className="baseFlex w-full !justify-between gap-2 px-4">
                {/* # of results */}
                <AnimatePresence mode="popLayout">
                  {searchResultsCountIsLoading ? (
                    <motion.div
                      key={"mobileSearchResultsCountSkeleton"}
                      variants={opacityVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.3 }}
                    >
                      <div className="pulseAnimation h-6 w-36 rounded-md bg-primary-foreground/50"></div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"mobileSearchResultsCount"}
                      variants={opacityVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.3 }}
                    >
                      {`${searchResultsCount} tab${
                        searchResultsCount === 1 ? "" : "s"
                      } found`}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="baseFlex gap-2">
                  {/* layout type selector */}
                  <div className="baseFlex gap-3">
                    <Label>Layout</Label>
                    <div className="baseFlex relative overflow-y-hidden rounded-md border">
                      <Button
                        variant={
                          layoutType.value === "grid" ? "toggleOn" : "toggleOff"
                        }
                        size="sm"
                        disabled={disableFiltersAndLayoutToggle}
                        onClick={() => {
                          layoutType.set("grid");
                        }}
                        className="baseFlex relative gap-2 border-none"
                      >
                        <BsGridFill className="size-4" />
                      </Button>

                      <Button
                        variant={
                          layoutType.value === "table"
                            ? "toggleOn"
                            : "toggleOff"
                        }
                        size="sm"
                        disabled={disableFiltersAndLayoutToggle}
                        onClick={() => {
                          layoutType.set("table");
                        }}
                        className="baseFlex relative gap-2 border-none"
                      >
                        <CiViewTable className="size-4 stroke-[0.5px]" />
                      </Button>

                      <div
                        style={{
                          transform:
                            layoutType.value === "grid"
                              ? "translateX(0)"
                              : "translateX(40px)",
                          transition:
                            "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                        className="absolute inset-0 !z-[-1] w-[40px] rounded-sm bg-background"
                      ></div>
                    </div>
                  </div>

                  {/* filter drawer trigger */}
                  <Drawer
                    open={drawerOpen}
                    onOpenChange={(open) => {
                      setDrawerOpen(open);
                    }}
                    onClose={() => {
                      setDrawerView("Search filters");
                    }}
                  >
                    <DrawerTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="baseFlex w-9 text-primary-foreground"
                      >
                        <LuFilter className="size-4 shrink-0" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerPortal>
                      <DrawerContent className="baseVertFlex fixed bottom-0 left-0 right-0 h-[471px] !items-start !justify-start rounded-t-2xl bg-secondary pt-3">
                        <VisuallyHidden>
                          <DrawerTitle>Search filters</DrawerTitle>
                          <DrawerDescription>
                            Use the search filters to narrow down your results.
                          </DrawerDescription>
                        </VisuallyHidden>

                        <div className="baseFlex w-full !justify-between px-3">
                          <AnimatePresence mode="popLayout">
                            {drawerView === "Search filters" ? (
                              <motion.div
                                key={"resetFiltersButton"}
                                variants={opacityVariants}
                                initial="closed"
                                animate="expanded"
                                exit="closed"
                                transition={{ duration: 0.25 }}
                                className="w-[56.5px]"
                              >
                                <Button
                                  variant="drawerNavigation"
                                  disabled={disableResetFiltersButton()}
                                  onClick={() => resetSearchFilters()}
                                  className="h-5 !p-0 font-normal"
                                >
                                  Reset
                                </Button>
                              </motion.div>
                            ) : (
                              <motion.div
                                key={"returnToAllFiltersButton"}
                                variants={opacityVariants}
                                initial="closed"
                                animate="expanded"
                                exit="closed"
                                transition={{ duration: 0.25 }}
                                className="baseFlex -ml-1 !justify-start"
                              >
                                <Button
                                  variant="drawerNavigation"
                                  onClick={() =>
                                    setDrawerView("Search filters")
                                  }
                                  className="h-5 !p-0 font-normal"
                                >
                                  <GoChevronRight className="size-5 rotate-180" />
                                  Filters
                                </Button>
                              </motion.div>
                            )}

                            {/* drawer title */}
                            {drawerView === "Search filters" ? (
                              <motion.div
                                key={"baseDrawerTitle"}
                                variants={opacityVariants}
                                initial="closed"
                                animate="expanded"
                                exit="closed"
                                transition={{ duration: 0.25 }}
                                className="baseFlex gap-2 whitespace-nowrap text-nowrap font-medium"
                              >
                                <LuFilter className="size-4" />
                                <span>Search filters</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key={"drawerTitle"}
                                variants={opacityVariants}
                                initial="closed"
                                animate="expanded"
                                exit="closed"
                                transition={{ duration: 0.25 }}
                                className="baseFlex gap-2 whitespace-nowrap text-nowrap font-medium"
                              >
                                <span>{drawerView}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="baseFlex w-[56.5px] !justify-end">
                            <Button
                              variant="drawerNavigation"
                              disabled={disableApplyFiltersButton()}
                              onClick={() => applyFilters()}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>

                        <Separator className="mt-2 w-full bg-gray" />

                        {/* Main body content */}
                        <div className="baseVertFlex h-[391px] w-full !justify-start overflow-y-auto">
                          <AnimatePresence mode="popLayout" initial={false}>
                            {/* All filters */}
                            {drawerView === "Search filters" && (
                              <motion.div
                                key={"allFilters"}
                                variants={baseDrawerVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="baseVertFlex w-full"
                              >
                                <Button
                                  variant={"drawer"}
                                  disabled={disableFiltersAndLayoutToggle}
                                  onClick={() => setDrawerView("Genre")}
                                  className="baseFlex w-full !justify-between gap-2"
                                >
                                  <div className="baseFlex">
                                    <span className="w-[75px] text-left font-semibold">
                                      Genre
                                    </span>
                                    <div className="baseFlex gap-2">
                                      <div
                                        style={{
                                          backgroundColor: localFilters.genre
                                            ? genreColors.get(
                                                localFilters.genre,
                                              )
                                            : "gray",
                                          boxShadow:
                                            "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                                        }}
                                        className="h-3 w-3 rounded-full"
                                      ></div>
                                      {localFilters.genre
                                        ? localFilters.genre
                                        : "All genres"}
                                    </div>
                                  </div>

                                  <GoChevronRight className="size-4" />
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  disabled={disableFiltersAndLayoutToggle}
                                  onClick={() => setDrawerView("Tuning")}
                                  className="baseFlex w-full !justify-between gap-2"
                                >
                                  <div className="baseFlex">
                                    <span className="w-[75px] text-left font-semibold">
                                      Tuning
                                    </span>
                                    <div className="baseFlex gap-2">
                                      {localFilters.tuning ? (
                                        localFilters.tuning === "custom" ? (
                                          "Custom"
                                        ) : (
                                          <PrettyTuning
                                            tuning={localFilters.tuning}
                                            displayWithFlex={true}
                                          />
                                        )
                                      ) : (
                                        "All tunings"
                                      )}
                                    </div>
                                  </div>

                                  <GoChevronRight className="size-4" />
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  disabled={disableFiltersAndLayoutToggle}
                                  onClick={() => setDrawerView("Capo")}
                                  className="baseFlex w-full !justify-between gap-2"
                                >
                                  <div className="baseFlex">
                                    <span className="w-[75px] text-left font-semibold">
                                      Capo
                                    </span>
                                    <div className="baseFlex gap-2">
                                      {localFilters.capo === true
                                        ? "With capo"
                                        : localFilters.capo === false
                                          ? "Without capo"
                                          : "Capo + Non-capo"}
                                    </div>
                                  </div>

                                  <GoChevronRight className="size-4" />
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  disabled={disableFiltersAndLayoutToggle}
                                  onClick={() => setDrawerView("Difficulty")}
                                  className="baseFlex w-full !justify-between gap-2"
                                >
                                  <div className="baseFlex">
                                    <span className="w-[75px] text-left font-semibold">
                                      Difficulty
                                    </span>
                                    <div className="baseFlex gap-2">
                                      {localFilters.difficulty ? (
                                        <div className="baseFlex gap-2">
                                          <DifficultyBars
                                            difficulty={
                                              localFilters.difficulty ?? 5
                                            }
                                          />
                                          {
                                            DIFFICULTIES[
                                              (localFilters.difficulty ?? 5) - 1
                                            ]
                                          }
                                        </div>
                                      ) : (
                                        "All difficulties"
                                      )}
                                    </div>
                                  </div>

                                  <GoChevronRight className="size-4" />
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  disabled={disableFiltersAndLayoutToggle}
                                  onClick={() => setDrawerView("Sort by")}
                                  className="baseFlex w-full !justify-between gap-2"
                                >
                                  <div className="baseFlex">
                                    <span className="w-[75px] text-left font-semibold">
                                      Sort by
                                    </span>
                                    <div className="baseFlex gap-2">
                                      {localFilters.sortBy === "relevance" &&
                                      searchQuery
                                        ? "Relevance"
                                        : localFilters.sortBy === "newest"
                                          ? "Newest"
                                          : localFilters.sortBy === "oldest"
                                            ? "Oldest"
                                            : localFilters.sortBy ===
                                                "mostPopular"
                                              ? "Most popular"
                                              : localFilters.sortBy ===
                                                  "leastPopular"
                                                ? "Least popular"
                                                : ""}
                                    </div>
                                  </div>

                                  <GoChevronRight className="size-4" />
                                </Button>
                              </motion.div>
                            )}

                            {/* Genre */}
                            {drawerView === "Genre" && (
                              <motion.div
                                key={"genreDrawer"}
                                variants={individualDrawerVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="baseVertFlex w-full !justify-start"
                              >
                                <Button
                                  variant={"drawer"}
                                  value={"allGenres"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() => {
                                    setLocalFilters((prev) => ({
                                      ...prev,
                                      genre: undefined,
                                    }));
                                  }}
                                >
                                  <div className="baseFlex gap-2">
                                    <div
                                      style={{
                                        backgroundColor: "gray",
                                        boxShadow:
                                          "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                                      }}
                                      className="h-3 w-3 rounded-full"
                                    ></div>
                                    All genres
                                  </div>

                                  {localFilters.genre === undefined && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                {[...genreColors.entries()].map(
                                  ([name, color]) => {
                                    return (
                                      <Button
                                        key={name}
                                        variant={"drawer"}
                                        value={name}
                                        className="baseFlex w-full !justify-between gap-2"
                                        onClick={() =>
                                          setLocalFilters((prev) => ({
                                            ...prev,
                                            genre: name,
                                          }))
                                        }
                                      >
                                        <div className="baseFlex gap-2">
                                          <div
                                            style={{
                                              backgroundColor: color,
                                              boxShadow:
                                                "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                                            }}
                                            className="h-3 w-3 rounded-full"
                                          ></div>

                                          {name}
                                        </div>

                                        {localFilters.genre === name && (
                                          <Check className="size-4" />
                                        )}
                                      </Button>
                                    );
                                  },
                                )}
                              </motion.div>
                            )}

                            {/* Tuning */}
                            {drawerView === "Tuning" && (
                              <motion.div
                                key={"tuningDrawer"}
                                variants={individualDrawerVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="baseVertFlex w-full !justify-start"
                              >
                                <Button
                                  variant={"drawer"}
                                  value={"all"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() => {
                                    setLocalFilters((prev) => ({
                                      ...prev,
                                      tuning: undefined,
                                    }));
                                  }}
                                >
                                  <div className="baseFlex gap-2">
                                    All tunings
                                  </div>

                                  {localFilters.tuning === undefined && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                {tunings.map((tuningObj) => (
                                  <Button
                                    key={tuningObj.simpleNotes}
                                    variant={"drawer"}
                                    value={tuningObj.notes.toLowerCase()}
                                    onClick={() =>
                                      setLocalFilters((prev) => ({
                                        ...prev,
                                        tuning: tuningObj.notes.toLowerCase(),
                                      }))
                                    }
                                    className="baseFlex w-full !justify-between gap-2"
                                  >
                                    <div className="baseFlex w-[235px] !justify-between">
                                      <span className="font-medium">
                                        {tuningObj.name}
                                      </span>
                                      <PrettyTuning
                                        tuning={tuningObj.simpleNotes}
                                        width="w-36"
                                      />
                                    </div>

                                    {localFilters.tuning ===
                                      tuningObj.notes.toLowerCase() && (
                                      <Check className="size-4" />
                                    )}
                                  </Button>
                                ))}

                                <Button
                                  variant={"drawer"}
                                  value={"custom"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() => {
                                    setLocalFilters((prev) => ({
                                      ...prev,
                                      tuning: "custom",
                                    }));
                                  }}
                                >
                                  <div className="baseFlex gap-2">Custom</div>

                                  {localFilters.tuning === "custom" && (
                                    <Check className="size-4" />
                                  )}
                                </Button>
                              </motion.div>
                            )}

                            {/* Capo */}
                            {drawerView === "Capo" && (
                              <motion.div
                                key={"capoDrawer"}
                                variants={individualDrawerVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="baseVertFlex w-full !justify-start"
                              >
                                <Button
                                  variant={"drawer"}
                                  value={"all"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() => {
                                    setLocalFilters((prev) => ({
                                      ...prev,
                                      capo: undefined,
                                    }));
                                  }}
                                >
                                  <div className="baseFlex gap-2">
                                    Capo + Non-capo
                                  </div>

                                  {localFilters.capo === undefined && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  value={"true"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() => {
                                    setLocalFilters((prev) => ({
                                      ...prev,
                                      capo: true,
                                    }));
                                  }}
                                >
                                  <div className="baseFlex gap-2">
                                    With capo
                                  </div>

                                  {localFilters.capo === true && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  value={"false"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() => {
                                    setLocalFilters((prev) => ({
                                      ...prev,
                                      capo: false,
                                    }));
                                  }}
                                >
                                  <div className="baseFlex gap-2">
                                    Without capo
                                  </div>

                                  {localFilters.capo === false && (
                                    <Check className="size-4" />
                                  )}
                                </Button>
                              </motion.div>
                            )}

                            {/* Difficulty */}
                            {drawerView === "Difficulty" && (
                              <motion.div
                                key={"difficultyDrawer"}
                                variants={individualDrawerVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="baseVertFlex w-full !justify-start"
                              >
                                <Button
                                  variant={"drawer"}
                                  value={"all"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() => {
                                    setLocalFilters((prev) => ({
                                      ...prev,
                                      difficulty: undefined,
                                    }));
                                  }}
                                >
                                  <div className="baseFlex gap-2">
                                    All difficulties
                                  </div>

                                  {localFilters.difficulty === undefined && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                {DIFFICULTIES.map((difficultyName, index) => {
                                  return (
                                    <Button
                                      key={index + 1}
                                      variant={"drawer"}
                                      value={(index + 1).toString()}
                                      className="baseFlex !h-[85px] w-full !justify-between gap-2"
                                      onClick={() => {
                                        setLocalFilters((prev) => ({
                                          ...prev,
                                          difficulty: index + 1,
                                        }));
                                      }}
                                    >
                                      <div className="baseVertFlex !items-start gap-1">
                                        <div className="baseFlex gap-2">
                                          <DifficultyBars
                                            difficulty={index + 1}
                                          />
                                          <span className="font-medium">
                                            {difficultyName}
                                          </span>
                                        </div>
                                        <p className="text-left text-sm opacity-75">
                                          {difficultyDescriptions[index]}
                                        </p>
                                      </div>

                                      {localFilters.difficulty ===
                                        index + 1 && (
                                        <Check className="size-4" />
                                      )}
                                    </Button>
                                  );
                                })}
                              </motion.div>
                            )}

                            {/* Sort by */}
                            {drawerView === "Sort by" && (
                              <motion.div
                                key={"sortByDrawer"}
                                variants={individualDrawerVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="baseVertFlex w-full !justify-start"
                              >
                                <Button
                                  variant={"drawer"}
                                  value={"relevance"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() =>
                                    handleSortByChange(
                                      "relevance" as
                                        | "relevance"
                                        | "newest"
                                        | "oldest"
                                        | "mostPopular"
                                        | "leastPopular",
                                    )
                                  }
                                >
                                  <div className="baseFlex gap-2">
                                    Relevance
                                  </div>

                                  {localFilters.sortBy === "relevance" && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  value={"newest"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() =>
                                    handleSortByChange(
                                      "newest" as
                                        | "relevance"
                                        | "newest"
                                        | "oldest"
                                        | "mostPopular"
                                        | "leastPopular",
                                    )
                                  }
                                >
                                  <div className="baseFlex gap-2">Newest</div>

                                  {localFilters.sortBy === "newest" && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  value={"oldest"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() =>
                                    handleSortByChange(
                                      "oldest" as
                                        | "relevance"
                                        | "newest"
                                        | "oldest"
                                        | "mostPopular"
                                        | "leastPopular",
                                    )
                                  }
                                >
                                  <div className="baseFlex gap-2">Oldest</div>

                                  {localFilters.sortBy === "oldest" && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  value={"mostPopular"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() =>
                                    handleSortByChange(
                                      "mostPopular" as
                                        | "relevance"
                                        | "newest"
                                        | "oldest"
                                        | "mostPopular"
                                        | "leastPopular",
                                    )
                                  }
                                >
                                  <div className="baseFlex gap-2">
                                    Most popular
                                  </div>

                                  {localFilters.sortBy === "mostPopular" && (
                                    <Check className="size-4" />
                                  )}
                                </Button>

                                <Button
                                  variant={"drawer"}
                                  value={"leastPopular"}
                                  className="baseFlex w-full !justify-between gap-2"
                                  onClick={() =>
                                    handleSortByChange(
                                      "leastPopular" as
                                        | "relevance"
                                        | "newest"
                                        | "oldest"
                                        | "mostPopular"
                                        | "leastPopular",
                                    )
                                  }
                                >
                                  <div className="baseFlex gap-2">
                                    Least popular
                                  </div>

                                  {localFilters.sortBy === "leastPopular" && (
                                    <Check className="size-4" />
                                  )}
                                </Button>
                              </motion.div>
                            )}

                            {/* Layout */}
                          </AnimatePresence>
                        </div>
                      </DrawerContent>
                    </DrawerPortal>
                  </Drawer>
                </div>
              </div>

              {layoutType.value === "table" && (
                <motion.div
                  key={"mobileTableTabHeader"}
                  initial={{ opacity: 0, marginTop: "0", height: "0" }}
                  animate={{
                    opacity: 1,
                    marginTop: "1rem",
                    height: "20px",
                  }}
                  exit={{ opacity: 0, marginTop: "0", height: "0" }}
                  transition={{
                    ease: "linear",
                    duration: 0.5,
                    opacity: {
                      duration: 0.15,
                    },
                  }}
                  className="w-full"
                >
                  <OverlayScrollbarsComponent
                    id="tableTabHeaderOverlayScrollbar"
                    ref={tableHeaderRef}
                    options={{
                      scrollbars: { autoHide: "leave", autoHideDelay: 150 },
                    }}
                    events={{
                      scroll(instance) {
                        // Only sync if this is NOT the active scroller, or if no scroller is active.
                        // This prevents the feedback loop. We allow `null` to handle programmatic scrolls.
                        if (activeScrollerRef.current === "body") {
                          return;
                        }

                        const body = tableBodyRef.current
                          ?.osInstance()
                          ?.elements().viewport;
                        if (!body) return;

                        body.scrollLeft =
                          instance.elements().viewport.scrollLeft;
                      },
                      initialized(instance) {
                        const { viewport } = instance.elements();
                        viewport.addEventListener("pointerdown", () =>
                          handlePointerDown("header"),
                        );
                        viewport.addEventListener("pointerup", handlePointerUp);
                      },
                      destroyed(instance) {
                        const { viewport } = instance.elements();
                        viewport.removeEventListener("pointerdown", () =>
                          handlePointerDown("header"),
                        );
                        viewport.removeEventListener(
                          "pointerup",
                          handlePointerUp,
                        );
                      },
                    }}
                    defer
                    className="w-full"
                  >
                    <div className="w-full bg-accent">
                      <div
                        className="grid grid-rows-1 items-center text-sm font-medium text-primary-foreground/70"
                        style={{
                          gridTemplateColumns: getDynamicGridTemplateColumns(),
                        }}
                      >
                        {/* conditional empty header for direct /edit page button */}
                        {asPath.includes("/profile/tabs") && (
                          <div className="h-full px-4"></div>
                        )}

                        <div className="px-4">Title</div>

                        {!asPath.includes("/artist") && (
                          <div className="px-4">Artist</div>
                        )}

                        <div className="px-4">Rating</div>

                        <div className="px-4">Difficulty</div>

                        <div className="px-4">Genre</div>

                        <div className="px-4">Date</div>

                        {/* Empty header for bookmark toggle */}
                        <div className="h-full px-4"></div>
                      </div>
                    </div>
                  </OverlayScrollbarsComponent>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          // tablet+: # of results / view type toggle
          <motion.div
            initial={false}
            animate={{
              paddingBottom:
                layoutType.value === "table" ? "0.25rem" : "0.75rem",
            }}
            transition={{ duration: 0.5, ease: "linear" }}
            className={`baseVertFlex sticky top-16 z-20 w-full !justify-between border bg-accent pt-3 text-primary-foreground ${stickyHeaderNotActive ? "rounded-t-lg" : "rounded-t-none"}`}
          >
            <AnimatePresence initial={false}>
              <div className="baseFlex w-full !justify-between gap-2 px-4">
                {/* # of results */}
                <AnimatePresence mode="popLayout">
                  {searchResultsCountIsLoading ? (
                    <motion.div
                      key={"tabletSearchResultsCountSkeleton"}
                      variants={opacityVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{
                        duration: 0.3,
                      }}
                    >
                      <div className="pulseAnimation h-6 w-48 rounded-md bg-primary-foreground/50"></div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"tabletSearchResultsCount"}
                      variants={opacityVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{
                        duration: 0.3,
                      }}
                    >
                      {`${searchResultsCount} tab${searchResultsCount === 1 ? "" : "s"} found`}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* layout type toggle */}
                <div className="baseFlex gap-3">
                  <Label>Layout</Label>
                  <div className="baseFlex relative overflow-hidden rounded-md border-2">
                    <Button
                      variant={
                        layoutType.value === "grid" ? "toggleOn" : "toggleOff"
                      }
                      size="sm"
                      disabled={disableFiltersAndLayoutToggle}
                      onClick={() => {
                        layoutType.set("grid");
                      }}
                      className="baseFlex relative gap-2 rounded-sm"
                    >
                      <BsGridFill className="size-4" />
                      Grid
                    </Button>

                    <Button
                      variant={
                        layoutType.value === "table" ? "toggleOn" : "toggleOff"
                      }
                      size="sm"
                      disabled={disableFiltersAndLayoutToggle}
                      onClick={() => {
                        layoutType.set("table");
                      }}
                      className="baseFlex relative gap-2 rounded-sm"
                    >
                      <CiViewTable className="size-4 stroke-[0.5px]" />
                      Table
                    </Button>

                    <div
                      style={{
                        transform:
                          layoutType.value === "grid"
                            ? "translateX(0)"
                            : "translateX(78px)",
                        transition:
                          "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        width: layoutType.value === "grid" ? "76.5px" : "83px",
                      }}
                      className="absolute inset-0 !z-[-1] rounded-sm bg-background"
                    ></div>
                  </div>
                </div>
              </div>

              {layoutType.value === "table" && (
                <motion.div
                  key={"tabletTableTabHeader"}
                  initial={{ opacity: 0, marginTop: "0", height: "0" }}
                  animate={{
                    opacity: 1,
                    marginTop: "1rem",
                    height: "20px",
                  }}
                  exit={{ opacity: 0, marginTop: "0", height: "0" }}
                  transition={{
                    ease: "linear",
                    duration: 0.5,
                    opacity: {
                      duration: 0.15,
                    },
                  }}
                  className="w-full"
                >
                  <OverlayScrollbarsComponent
                    id="tableTabHeaderOverlayScrollbar"
                    ref={tableHeaderRef}
                    options={{
                      scrollbars: { autoHide: "leave", autoHideDelay: 150 },
                    }}
                    events={{
                      scroll(instance) {
                        // Only sync if this is NOT the active scroller, or if no scroller is active.
                        // This prevents the feedback loop. We allow `null` to handle programmatic scrolls.
                        if (activeScrollerRef.current === "body") {
                          return;
                        }

                        const body = tableBodyRef.current
                          ?.osInstance()
                          ?.elements().viewport;
                        if (!body) return;

                        body.scrollLeft =
                          instance.elements().viewport.scrollLeft;
                      },
                      initialized(instance) {
                        const { viewport } = instance.elements();
                        viewport.addEventListener("pointerdown", () =>
                          handlePointerDown("header"),
                        );
                        viewport.addEventListener("pointerup", handlePointerUp);
                      },
                      destroyed(instance) {
                        const { viewport } = instance.elements();
                        viewport.removeEventListener("pointerdown", () =>
                          handlePointerDown("header"),
                        );
                        viewport.removeEventListener(
                          "pointerup",
                          handlePointerUp,
                        );
                      },
                    }}
                    defer
                    className="w-full"
                  >
                    <div className="w-full bg-accent">
                      <div
                        className="grid grid-rows-1 items-center text-sm font-medium text-primary-foreground/75"
                        style={{
                          gridTemplateColumns: getDynamicGridTemplateColumns(),
                        }}
                      >
                        {/* conditional empty header for direct /edit page button */}
                        {asPath.includes("/profile/tabs") && (
                          <div className="h-full px-4"></div>
                        )}

                        <div className="px-4">Title</div>

                        {!asPath.includes("/artist") && (
                          <div className="px-4">Artist</div>
                        )}

                        <div className="px-4">Rating</div>

                        <div className="px-4">Difficulty</div>

                        <div className="px-4">Genre</div>

                        <div className="px-4"> Date</div>

                        {/* Empty header for bookmark toggle */}
                        <div className="h-full px-4"></div>
                      </div>
                    </div>
                  </OverlayScrollbarsComponent>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* search results body */}
        <div className="size-full !border-t-0 border-b bg-background shadow-lg md:rounded-b-lg md:border">
          <AnimatePresence mode="popLayout">
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
                        <div className="baseVertFlex gap-4 rounded-md border bg-secondary-active/50 px-8 py-4 text-xl text-primary-foreground shadow-md">
                          <div className="baseVertFlex gap-4">
                            <Binoculars className="size-9" />
                            No tabs found
                          </div>

                          {relatedArtists.length === 0 ? (
                            <Button
                              variant={"secondary"}
                              asChild
                              className="baseFlex"
                            >
                              <Link
                                prefetch={false}
                                href={"/create"}
                                onClick={() => {
                                  // TODO: add artistName to localStorage
                                  // to pre-fill the artist name in the create tab form
                                }}
                                className="baseFlex gap-2"
                              >
                                Create the first tab for this artist
                                <BsPlus className="size-4" />
                              </Link>
                            </Button>
                          ) : (
                            <div className="baseVertFlex gap-4">
                              Related artists
                              <div className="baseVertFlex gap-4 sm:!flex-row">
                                {relatedArtists.map((artist) => (
                                  <Button
                                    key={artist.id}
                                    variant={"secondary"}
                                    asChild
                                    className="baseFlex"
                                  >
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
                                  </Button>
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
                        <>
                          {layoutType.value === "grid" && (
                            <GridTabView
                              searchQuery={searchQuery}
                              genre={genre}
                              tuning={tuning}
                              capo={capo}
                              difficulty={difficulty}
                              sortBy={sortBy}
                              setSearchResultsCount={setSearchResultsCount}
                              setSearchsearchResultsCountIsLoading={
                                setSearchsearchResultsCountIsLoading
                              }
                              color={color}
                              theme={theme}
                            />
                          )}

                          {layoutType.value === "table" && (
                            <TableTabView
                              searchQuery={searchQuery}
                              genre={genre}
                              tuning={tuning}
                              capo={capo}
                              difficulty={difficulty}
                              sortBy={sortBy}
                              setSearchResultsCount={setSearchResultsCount}
                              setSearchsearchResultsCountIsLoading={
                                setSearchsearchResultsCountIsLoading
                              }
                              tableHeaderRef={tableHeaderRef}
                              tableBodyRef={tableBodyRef}
                              activeScrollerRef={activeScrollerRef}
                              handlePointerDown={handlePointerDown}
                              handlePointerUp={handlePointerUp}
                              theme={theme}
                            />
                          )}
                        </>
                      )}
                  </>
                )}
              </Fragment>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default SearchResults;
