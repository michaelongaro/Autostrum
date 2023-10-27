import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useState, type Dispatch, type SetStateAction } from "react";
import { BsArrowDownShort, BsGridFill } from "react-icons/bs";
import { CiViewTable } from "react-icons/ci";
import { LuFilter } from "react-icons/lu";
import { Drawer } from "vaul";
import { shallow } from "zustand/shallow";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { genreList } from "~/utils/genreList";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import GridArtistView from "./GridArtistView";
import GridTabView from "./GridTabView";
import TableArtistView from "./TableArtistView";
import TableTabView from "./TableTabView";

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

export interface InfiniteQueryParams {
  searchQuery: string;
  genreId: number;
  sortByRelevance: boolean;
  sortBy: "newest" | "oldest" | "mostLiked" | "leastLiked" | "none";
  likedByUserId: string | undefined;
  userIdToSelectFrom: string | undefined;
}

interface SearchResults {
  genreId: number;
  type: "tabs" | "artists";
  searchQuery: string;
  sortByRelevance: boolean;
  additionalSortFilter:
    | "newest"
    | "oldest"
    | "leastLiked"
    | "mostLiked"
    | "none";
  viewType: "grid" | "table";
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
  hideLikesAndPlayButtons?: boolean;
}

function SearchResults({
  genreId,
  type,
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
  viewType,
  selectedPinnedTabId,
  setSelectedPinnedTabId,
  hideLikesAndPlayButtons,
}: SearchResults) {
  const { asPath, push, query, pathname } = useRouter();

  const localStorageViewType = useLocalStorageValue("autostrumViewType");

  const [resultsCountIsLoading, setResultsCountIsLoading] = useState(false);
  const [drawerHandleDisabled, setDrawerHandleDisabled] = useState(false);

  const isAboveSmallViewportWidth = useViewportWidthBreakpoint(640);

  const { searchResultsCount } = useTabStore(
    (state) => ({
      searchResultsCount: state.searchResultsCount,
    }),
    shallow
  );

  function formatQueryResultsCount() {
    const formattedTabString = searchResultsCount === 1 ? "tab" : "tabs";
    const formattedArtistString =
      searchResultsCount === 1 ? "artist" : "artists";

    if (type === "tabs") {
      // Found 10 "Rock" tabs
      if (searchQuery === "" && genreId >= 1 && genreId <= 8) {
        return (
          <div className="text-base sm:text-lg">
            {`Found ${searchResultsCount}`}
            <Badge
              variant={isAboveSmallViewportWidth ? "default" : "smallerText"}
              style={{ backgroundColor: genreList[genreId]?.color }}
              className="relative bottom-[2px] mx-2"
            >
              {genreList[genreId]?.name}
            </Badge>
            {formattedTabString}
          </div>
        );
      }

      // Found 10 "Rock" tabs for "search query"
      if (searchQuery !== "" && genreId >= 1 && genreId <= 8) {
        return (
          <p className="text-base sm:text-lg">
            Found {searchResultsCount}
            <Badge
              variant={isAboveSmallViewportWidth ? "default" : "smallerText"}
              style={{ backgroundColor: genreList[genreId]?.color }}
              className="relative bottom-[2px] mx-2"
            >
              {genreList[genreId]?.name}
            </Badge>
            tabs for &quot;
            {searchQuery}
            &quot;
          </p>
        );
      }

      // Found 10 tabs across "All genres" (for search query)
      if (genreId === 9) {
        return (
          <div className="text-base sm:text-lg">
            {`Found ${searchResultsCount} ${formattedTabString} across`}
            <Badge
              variant={isAboveSmallViewportWidth ? "default" : "smallerText"}
              className="relative bottom-[2px] mx-2 bg-pink-500"
            >
              All genres
            </Badge>
            {searchQuery !== "" && <span>for &quot;{searchQuery}&quot;</span>}
          </div>
        );
      }

      // fallback test
      return <div></div>;
    }

    // all "artist" results are below:

    // Found 10 artists
    if (searchQuery === "" && type === "artists") {
      return (
        <p className="text-base sm:text-lg">
          Found {searchResultsCount} {formattedArtistString}
        </p>
      );
    }

    // Found 10 artists for "search query"
    return (
      <p className="text-base sm:text-lg">
        Found {searchResultsCount} artists for &quot;
        {searchQuery}
        &quot;
      </p>
    );
  }

  // all param change handlers below will remove the param if it is getting set
  // to the "default" values that we have defined in the useGetUrlParamFilters hook
  function handleTypeChange(type: "tabs" | "artists") {
    const newQuery = { ...query };
    if (type === "artists") {
      newQuery.type = "artists";
    } else {
      delete newQuery.type;
    }

    void push(
      {
        pathname,
        query: {
          ...newQuery,
        },
      },
      undefined,
      {
        scroll: false,
      }
    );
  }

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
        query: {
          ...newQuery,
        },
      },
      undefined,
      {
        scroll: false,
      }
    );
  }

  function handleViewChange(viewType: "grid" | "table") {
    localStorageViewType.set(viewType);

    const newQuery = { ...query };
    if (viewType === "grid") {
      delete newQuery.view;
    } else {
      newQuery.view = "table";
    }

    void push(
      {
        pathname,
        query: {
          ...newQuery,
        },
      },
      undefined,
      {
        scroll: false,
      }
    );
  }

  function handleRelevanceChange() {
    const newQuery = { ...query };
    if (query.relevance === undefined) {
      newQuery.relevance = "false";
    } else {
      delete newQuery.relevance;
    }

    void push(
      {
        pathname,
        query: {
          ...newQuery,
        },
      },
      undefined,
      {
        scroll: false,
      }
    );
  }

  // ask chatgpt to clean this logic up for you
  function handleSortChange(type: "date" | "likes") {
    let newSortParam = "";

    switch (additionalSortFilter) {
      case "newest":
        if (type === "date") {
          newSortParam = "oldest";
        } else {
          newSortParam = "mostLiked";
        }
        break;
      case "oldest":
        if (type === "date") {
          newSortParam = "none";
        } else {
          newSortParam = "mostLiked";
        }
        break;
      case "mostLiked":
        if (type === "likes") {
          newSortParam = "leastLiked";
        } else {
          newSortParam = "newest";
        }
        break;
      case "leastLiked":
        if (type === "likes") {
          newSortParam = "none";
        } else {
          newSortParam = "newest";
        }
        break;
      case "none":
        if (type === "date") {
          newSortParam = "newest";
        } else {
          newSortParam = "mostLiked";
        }
        break;
    }

    const newQueries = { ...query };

    if (newSortParam === "newest") delete newQueries.sort;
    else newQueries.sort = newSortParam;

    void push(
      {
        pathname,
        query: newQueries,
      },
      undefined,
      {
        scroll: false,
      }
    );
  }

  // we have individual options for each sort type on mobile instead of clicking
  // through the either date/likes to cycle through the options.
  function handleMobileSortChange(
    type: "newest" | "oldest" | "leastLiked" | "mostLiked" | "none"
  ) {
    const newQueries = { ...query };

    if (type === "newest") delete newQueries.sort;
    else newQueries.sort = type;

    void push(
      {
        pathname,
        query: newQueries,
      },
      undefined,
      {
        scroll: false,
      }
    );
  }

  return (
    <div className="baseVertFlex min-h-[375px] w-full !flex-nowrap !justify-start rounded-md md:min-h-[525px]">
      {/* # of results + sorting options */}
      <div
        className="baseFlex w-full !items-center !justify-between gap-4 rounded-md bg-gradient-to-br
 from-pink-800/90 via-pink-800/95 to-pink-800 px-4 py-2 shadow-md @container xl:min-h-[76px]"
      >
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
            {formatQueryResultsCount()}
          </motion.div>
        )}

        {/* mobile sorting options */}
        <Drawer.Root dismissible={!drawerHandleDisabled}>
          <Drawer.Trigger asChild>
            <Button variant={"outline"} className="baseFlex gap-2 @3xl:hidden">
              Filter
              <LuFilter className="h-4 w-4" />
            </Button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Drawer.Content
              style={{
                zIndex: asPath.includes("/preferences") ? 60 : 50,
              }}
              className="baseVertFlex fixed bottom-0 left-0 right-0 !items-start gap-2 bg-pink-50 p-4 pb-6 text-pink-950"
            >
              <div className="mx-auto mb-2 h-1 w-12 flex-shrink-0 rounded-full bg-gray-300" />

              <Label className="baseFlex gap-2">
                Search filters
                <LuFilter className="h-4 w-4" />
              </Label>
              <Separator className="mb-2 w-full bg-pink-500" />
              {pathname.includes("/explore") && (
                <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                  <Label>Type</Label>
                  <Select
                    onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                    value={type}
                    onValueChange={(value) =>
                      handleTypeChange(value as "tabs" | "artists")
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        zIndex: asPath.includes("/preferences") ? 60 : 50,
                      }}
                    >
                      <SelectGroup>
                        <SelectLabel>Result type</SelectLabel>
                        <SelectItem value="tabs">Tabs</SelectItem>
                        <SelectItem value="artists">Artists</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                <Label>Genre</Label>
                <Select
                  onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                  value={genreId.toString()}
                  onValueChange={(value) => handleGenreChange(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      zIndex: asPath.includes("/preferences") ? 60 : 50,
                    }}
                  >
                    <SelectGroup>
                      <SelectLabel>Genres</SelectLabel>

                      {Object.values(genreList).map((genre) => {
                        return (
                          <SelectItem
                            key={genre.id}
                            value={genre.id.toString()}
                          >
                            <div className="baseFlex gap-2">
                              <div
                                style={{
                                  backgroundColor: genre.color,
                                }}
                                className="h-3 w-3 rounded-full"
                              ></div>
                              {genre.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                <Label>View</Label>
                <Select
                  onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                  value={viewType}
                  onValueChange={(value) =>
                    handleViewChange(value as "grid" | "table")
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      zIndex: asPath.includes("/preferences") ? 60 : 50,
                    }}
                  >
                    <SelectGroup>
                      <SelectLabel>Results layout</SelectLabel>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="table">Table</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                <Label>Sort by</Label>
                <Select
                  onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                  value={additionalSortFilter}
                  onValueChange={(value) =>
                    handleMobileSortChange(
                      value as
                        | "newest"
                        | "oldest"
                        | "leastLiked"
                        | "mostLiked"
                        | "none"
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      zIndex: asPath.includes("/preferences") ? 60 : 50,
                    }}
                  >
                    <SelectGroup>
                      <SelectLabel>Sort by</SelectLabel>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="leastLiked">Least likes</SelectItem>
                      <SelectItem value="mostLiked">Most likes</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {searchQuery && (
                <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                  <Label>Relevance</Label>
                  <Switch
                    checked={sortByRelevance}
                    onCheckedChange={() => handleRelevanceChange()}
                  />
                </div>
              )}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {/* desktop sorting options */}
        <div className="baseFlex !hidden !justify-start gap-2 @3xl:!flex md:!justify-center md:gap-4">
          {/* type (artist page only shows tabs so hide selector) */}
          {asPath.includes("/explore") && (
            <div className="baseVertFlex !items-start gap-1.5">
              <Label>Type</Label>
              <div className="baseFlex gap-2">
                <Button
                  variant={type !== "artists" ? "toggledOn" : "toggledOff"}
                  size="sm"
                  onClick={() => handleTypeChange("tabs")}
                >
                  Tabs
                </Button>
                <Button
                  variant={type === "artists" ? "toggledOn" : "toggledOff"}
                  size="sm"
                  onClick={() => handleTypeChange("artists")}
                >
                  Artists
                </Button>
              </div>
            </div>
          )}

          {/* genre selector */}
          <AnimatePresence>
            {type === "tabs" && (
              <motion.div
                key={"searchResultsGenreSelector"}
                initial={{ opacity: 0, width: 0, scale: 0 }}
                animate={{ opacity: 1, width: "auto", scale: 1 }}
                exit={{ opacity: 0, width: 0, scale: 0 }}
                transition={{
                  scale: {
                    duration: 0.15,
                  },
                  opacity: {
                    duration: 0.25,
                  },
                  width: {
                    duration: 0.25,
                  },
                }}
                className="baseVertFlex !items-start gap-1.5"
              >
                <Label>Genre</Label>
                <Select
                  value={genreId.toString()}
                  onValueChange={(value) => handleGenreChange(value)}
                >
                  <SelectTrigger className="w-[180px] border-2">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Genres</SelectLabel>

                      {Object.values(genreList).map((genre) => {
                        return (
                          <SelectItem
                            key={genre.id}
                            value={genre.id.toString()}
                          >
                            <div className="baseFlex gap-2">
                              <div
                                style={{
                                  backgroundColor: genre.color,
                                }}
                                className="h-3 w-3 rounded-full"
                              ></div>
                              {genre.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* view */}
          <div className="baseVertFlex !items-start gap-1.5">
            <Label>View</Label>
            <div className="baseFlex gap-2">
              <Button
                variant={viewType === "grid" ? "toggledOn" : "toggledOff"}
                size="sm"
                onClick={() => handleViewChange("grid")}
              >
                <BsGridFill className="h-4 w-4" />
              </Button>
              <Button
                variant={viewType === "table" ? "toggledOn" : "toggledOff"}
                size="sm"
                onClick={() => handleViewChange("table")}
              >
                <CiViewTable className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* relevance + extra sorting filters */}
          <div className="baseVertFlex !items-start gap-1.5">
            <Label>Sort by</Label>
            <div className="baseFlex gap-2">
              {searchQuery && (
                <Button
                  variant={sortByRelevance ? "toggledOn" : "toggledOff"}
                  size="sm"
                  onClick={() => handleRelevanceChange()}
                >
                  Relevance
                </Button>
              )}
              <Button
                variant={
                  additionalSortFilter === "newest" ||
                  additionalSortFilter === "oldest"
                    ? "toggledOn"
                    : "toggledOff"
                }
                size="sm"
                onClick={() => handleSortChange("date")}
              >
                Date
                <AnimatePresence>
                  {(additionalSortFilter === "newest" ||
                    additionalSortFilter === "oldest") && (
                    <motion.div
                      key={"searchResultsDateSortArrow"}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <BsArrowDownShort
                        style={{
                          transform:
                            additionalSortFilter === "newest"
                              ? "rotate(0deg)"
                              : "rotate(180deg)",
                        }}
                        className="h-4 w-4 transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
              <Button
                variant={
                  additionalSortFilter === "leastLiked" ||
                  additionalSortFilter === "mostLiked"
                    ? "toggledOn"
                    : "toggledOff"
                }
                size="sm"
                onClick={() => handleSortChange("likes")}
              >
                Likes
                <AnimatePresence>
                  {(additionalSortFilter === "leastLiked" ||
                    additionalSortFilter === "mostLiked") && (
                    <motion.div
                      key={"searchResultsLikesSortArrow"}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <BsArrowDownShort
                        style={{
                          transform:
                            additionalSortFilter === "mostLiked"
                              ? "rotate(0deg)"
                              : "rotate(180deg)",
                        }}
                        className="h-4 w-4 transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewType === "grid" ? (
          <>
            {/* card view */}
            {type === "tabs" ? (
              <GridTabView
                genreId={genreId}
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
                selectedPinnedTabId={selectedPinnedTabId}
                setSelectedPinnedTabId={setSelectedPinnedTabId}
                setResultsCountIsLoading={setResultsCountIsLoading}
                hideLikesAndPlayButtons={hideLikesAndPlayButtons}
              />
            ) : (
              <GridArtistView
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
                setResultsCountIsLoading={setResultsCountIsLoading}
              />
            )}
          </>
        ) : (
          <>
            {/* table view */}
            {type === "tabs" ? (
              <TableTabView
                genreId={genreId}
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
                selectedPinnedTabId={selectedPinnedTabId}
                setSelectedPinnedTabId={setSelectedPinnedTabId}
                setResultsCountIsLoading={setResultsCountIsLoading}
                hideLikesAndPlayButtons={hideLikesAndPlayButtons}
              />
            ) : (
              <TableArtistView
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
                setResultsCountIsLoading={setResultsCountIsLoading}
              />
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchResults;
