import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BsGridFill } from "react-icons/bs";
import { CiViewTable } from "react-icons/ci";
import { LuFilter } from "react-icons/lu";
import { useInView } from "react-intersection-observer";
import { Drawer } from "vaul";
import Render404Page from "~/components/Search/Render404Page";
import { Button } from "~/components/ui/button";
import DifficultyBars from "~/components/ui/DifficultyBars";
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
import { genreList } from "~/utils/genreList";
import { tuningNotes, tunings } from "~/utils/tunings";
import { Label } from "~/components/ui/label";
import GridTabView from "./GridTabView";
import TableTabView from "./TableTabView";

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

function SearchResults() {
  const { asPath, push, query, pathname } = useRouter();

  const {
    searchResultsCount,
    mobileHeaderModal,
    setMobileHeaderModal,
    viewportLabel,
  } = useTabStore((state) => ({
    searchResultsCount: state.searchResultsCount,
    mobileHeaderModal: state.mobileHeaderModal,
    setMobileHeaderModal: state.setMobileHeaderModal,
    viewportLabel: state.viewportLabel,
  }));

  const [applyStickyStyles, setApplyStickyStyles] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resultsCountIsLoading, setResultsCountIsLoading] = useState(false);
  const [drawerHandleDisabled, setDrawerHandleDisabled] = useState(false);

  const localStorageLayoutType = useLocalStorageValue("autostrumLayoutType");

  useEffect(() => {
    if (!mobileHeaderModal.showing) {
      setDrawerOpen(false);
    }
  }, [mobileHeaderModal.showing]);

  const {
    searchQuery,
    genreId,
    tuning,
    capo,
    difficulty,
    sortBy,
    layoutType,
    renderSearch404,
    searchParamsParsed,
  } = useGetUrlParamFilters();

  const { ref: stickyStylesSentinelRef } = useInView({
    threshold: 0,
    delay: 0,
    onChange: (inView) => {
      setApplyStickyStyles(inView);
    },
  });

  // fyi: all param change handlers below will remove the param if it is getting set
  // to the "default" values that we have defined in the useGetUrlParamFilters hook

  function handleGenreChange(stringifiedId: string) {
    const newQuery = { ...query };
    if (parseInt(stringifiedId) >= 1 && parseInt(stringifiedId) <= 8) {
      newQuery.genreId = stringifiedId;
    } else {
      delete newQuery.genreId;
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

  function handleTuningChange(tuning: string) {
    const newQuery = { ...query };

    const lowercaseTuning = tuning.toLowerCase();

    if (tuningNotes.includes(lowercaseTuning)) {
      newQuery.tuning = lowercaseTuning;
    } else if (tuning === "custom") {
      newQuery.tuning = "custom";
    } else {
      delete newQuery.tuning;
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

  function handleCapoChange(capo: "all" | "true" | "false") {
    const newQuery = { ...query };
    if (capo === "true" || capo === "false") {
      newQuery.capo = capo;
    } else {
      delete newQuery.capo;
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

  function handleDifficultyChange(difficulty: string) {
    const newQuery = { ...query };
    if (parseInt(difficulty) >= 1 && parseInt(difficulty) <= 5) {
      newQuery.difficulty = difficulty;
    } else {
      delete newQuery.difficulty;
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

  function handleLayoutChange(layoutType: "grid" | "table") {
    localStorageLayoutType.set(layoutType);

    const newQuery = { ...query };
    if (layoutType === "grid") {
      delete newQuery.layout;
    } else {
      newQuery.layout = "table";
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

  function resetSearchFilters() {
    const newQuery = { ...query };
    delete newQuery.genreId;
    delete newQuery.tuning;
    delete newQuery.capo;
    delete newQuery.difficulty;
    delete newQuery.sortBy;
    delete newQuery.layout;

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

  return (
    // TODO: calc values are just guesses
    <div className="baseFlex min-h-[calc(100dvh-10rem)] w-full !items-start gap-2 rounded-lg tablet:min-h-[calc(100dvh-14rem)]">
      {/* tablet+ filters sidebar */}
      <div
        className={`baseVertFlex sticky top-16 !hidden h-fit w-64 !items-start !justify-start gap-4 rounded-lg bg-pink-800 p-4 transition-all tablet:!flex ${applyStickyStyles ? "" : "rounded-t-none"}`}
      >
        <p className="text-lg font-medium">Filters</p>
        {/* genre selector */}
        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label>Genre</Label>
          <Select
            value={genreId ? genreId.toString() : "allGenres"}
            onValueChange={(value) => handleGenreChange(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={"allGenres"}>
                <div className="baseFlex gap-2">
                  <div
                    style={{
                      backgroundColor: "gray", // TODO: make this a circular gradient rainbow of all
                      // the colors in genreList
                      boxShadow: "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                    }}
                    className="h-3 w-3 rounded-full"
                  ></div>
                  All genres
                </div>
              </SelectItem>

              <Separator className="my-1 w-full bg-pink-600" />

              {Object.values(genreList).map((genre) => {
                return (
                  <SelectItem key={genre.id} value={genre.id.toString()}>
                    <div className="baseFlex gap-2">
                      <div
                        style={{
                          backgroundColor: genre.color,
                          boxShadow: "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                        }}
                        className="h-3 w-3 rounded-full"
                      ></div>

                      {genre.name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label>Tuning</Label>
          <Select
            value={tuning ? tuning.toLowerCase() : "all"}
            onValueChange={(value) => {
              handleTuningChange(value);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select tuning...">
                {tuning ? (
                  <>
                    {tuning === "custom" ? (
                      "Custom"
                    ) : (
                      <PrettyTuning tuning={tuning} displayWithFlex={true} />
                    )}
                  </>
                ) : (
                  "All tunings"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              style={{
                textShadow: "none",
              }}
              className="w-[300px]"
            >
              {/* all tunings select item */}
              <SelectItem value={"all"} className="font-medium">
                All tunings
              </SelectItem>

              <Separator className="my-1 w-full bg-pink-600" />

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

              <Separator className="my-1 w-full bg-pink-600" />

              {/* custom tuning catch-all selection */}
              <SelectItem value={"custom"} className="font-medium">
                Custom tunings
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label>Capo</Label>
          <Select
            value={capo ? capo.toString() : "all"}
            onValueChange={(value) => {
              handleCapoChange(value as "all" | "true" | "false");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={"all"}>Capo + Non-capo</SelectItem>

              <Separator className="my-1 w-full bg-pink-600" />

              <SelectItem value={"true"}>With capo</SelectItem>
              <SelectItem value={"false"}>Without capo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label>Difficulty</Label>
          <Select
            value={difficulty ? difficulty.toString() : "all"}
            onValueChange={(value) => {
              handleDifficultyChange(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a difficulty">
                {difficulty ? (
                  <div className="baseFlex gap-2">
                    <DifficultyBars difficulty={difficulty ?? 5} />
                    {DIFFICULTIES[(difficulty ?? 5) - 1]}
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

                <Separator className="my-1 w-full bg-pink-600" />

                <SelectItem value={"1"}>
                  <div className="baseVertFlex !items-start gap-1">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={1} />
                      <span className="font-medium">Beginner</span>
                    </div>
                    <p className="text-sm opacity-75">
                      Open chords, basic melodies, simple strumming.
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
                      Common progressions, basic barre chords, straightforward
                      rhythms.
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
                      Alternate picking, varied voicings, position shifts.
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
                      Fast playing, bends, slides, tapping, expressive control.
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
                      Virtuoso speed, sweep picking, extended voicings,
                      interpretation.
                    </p>
                  </div>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="baseVertFlex w-full !items-start gap-1.5">
          <Label>Sort by</Label>
          <Select
            onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
            value={sortBy}
            onValueChange={(value) =>
              handleSortByChange(
                value as
                  | "relevance"
                  | "newest"
                  | "oldest"
                  | "mostPopular"
                  | "leastPopular",
              )
            }
          >
            <SelectTrigger className="w-full">
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

        <Button
          variant="link"
          onClick={() => resetSearchFilters()}
          className="h-5 !p-0"
        >
          Reset filters
        </Button>
      </div>

      <div className="baseVertFlex relative size-full">
        <div
          ref={stickyStylesSentinelRef}
          className="absolute top-0 h-[1px]"
        ></div>

        {viewportLabel.includes("mobile") ? (
          // mobile: # of results / filter drawer trigger
          <div className="baseFlex sticky top-0 w-full !justify-between rounded-t-lg bg-pink-800 px-4 py-2 tablet:!hidden">
            {/* # of results */}
            {resultsCountIsLoading ? (
              <motion.div
                key={"searchResultsCountSkeleton"}
                variants={opacityVariants}
                initial="closed"
                animate="expanded"
                exit="closed"
              >
                <div className="h-8 w-48 animate-pulse rounded-md bg-pink-300"></div>
              </motion.div>
            ) : (
              <motion.div
                key={"searchResultsCount"}
                variants={opacityVariants}
                initial="closed"
                animate="expanded"
                exit="closed"
              >
                {`${searchResultsCount} result${
                  searchResultsCount === 1 ? "" : "s"
                } found`}
              </motion.div>
            )}

            {/* filter drawer trigger */}
            <Drawer.Root
              open={drawerOpen}
              onOpenChange={(open) => {
                setDrawerOpen(open);
                setMobileHeaderModal({
                  showing: open,
                  zIndex: open ? (asPath.includes("/profile") ? 50 : 49) : 48,
                });
              }}
              modal={false}
              dismissible={!drawerHandleDisabled}
            >
              <Drawer.Trigger asChild>
                <Button
                  variant={"outline"}
                  className="baseFlex gap-2 @3xl:hidden"
                >
                  Filter
                  <LuFilter className="h-4 w-4" />
                </Button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Content
                  style={{
                    zIndex: asPath.includes("/preferences") ? 60 : 50,
                    textShadow: "none",
                  }}
                  className="baseVertFlex fixed bottom-0 left-0 right-0 !items-start gap-4 rounded-t-2xl bg-pink-100 p-4 pb-6 text-pink-950"
                >
                  <div className="mx-auto mb-2 h-1 w-12 flex-shrink-0 rounded-full bg-gray-300" />

                  <Label className="baseFlex gap-2">
                    Search filters
                    <LuFilter className="h-4 w-4" />
                  </Label>
                  <Separator className="mb-2 w-full bg-pink-600" />

                  {/* TODO */}
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </div>
        ) : (
          // tablet+: # of results / view type toggle
          <div className="baseFlex sticky top-16 z-10 !hidden w-full !justify-between rounded-t-lg bg-pink-800 px-4 py-3 tablet:!flex">
            {/* # of results */}
            {resultsCountIsLoading ? (
              <motion.div
                key={"searchResultsCountSkeleton"}
                variants={opacityVariants}
                initial="closed"
                animate="expanded"
                exit="closed"
              >
                <div className="h-8 w-48 animate-pulse rounded-md bg-pink-300"></div>
              </motion.div>
            ) : (
              <motion.div
                key={"searchResultsCount"}
                variants={opacityVariants}
                initial="closed"
                animate="expanded"
                exit="closed"
              >
                {`${searchResultsCount} result${searchResultsCount === 1 ? "" : "s"} found`}
              </motion.div>
            )}

            {/* view type toggle */}
            <div className="baseFlex gap-3">
              <Label>Layout</Label>
              <div className="baseFlex gap-2">
                <Button
                  variant={layoutType === "grid" ? "toggledOn" : "toggledOff"}
                  size="sm"
                  onClick={() => handleLayoutChange("grid")}
                  className="baseFlex gap-2"
                >
                  <BsGridFill className="h-4 w-4" />
                  Grid
                </Button>
                <Button
                  variant={layoutType === "table" ? "toggledOn" : "toggledOff"}
                  size="sm"
                  onClick={() => handleLayoutChange("table")}
                  className="baseFlex gap-2"
                >
                  <CiViewTable className="h-4 w-4" />
                  Table
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* search results body */}
        <div className="lightGlassmorphic w-full rounded-b-lg">
          <AnimatePresence>
            {renderSearch404 ? (
              <Render404Page />
            ) : (
              <>
                {searchParamsParsed && (
                  <>
                    {layoutType === "grid" && (
                      <GridTabView
                        searchQuery={searchQuery}
                        genreId={genreId}
                        tuning={tuning}
                        capo={capo}
                        difficulty={difficulty}
                        sortBy={sortBy}
                        setResultsCountIsLoading={setResultsCountIsLoading}
                      />
                    )}

                    {layoutType === "table" && (
                      <TableTabView
                        searchQuery={searchQuery}
                        genreId={genreId}
                        tuning={tuning}
                        capo={capo}
                        difficulty={difficulty}
                        sortBy={sortBy}
                        setResultsCountIsLoading={setResultsCountIsLoading}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default SearchResults;
