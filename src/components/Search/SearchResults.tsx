import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { BsArrowDownShort, BsGridFill } from "react-icons/bs";
import { CiViewTable } from "react-icons/ci";
import { LuFilter } from "react-icons/lu";
import { shallow } from "zustand/shallow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
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
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
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
}: SearchResults) {
  const { asPath, push, query, pathname } = useRouter();

  const localStorageViewType = useLocalStorageValue("autostrumViewType");

  const [resultsCountIsLoading, setResultsCountIsLoading] = useState(false);

  const { searchResultsCount } = useTabStore(
    (state) => ({
      searchResultsCount: state.searchResultsCount,
    }),
    shallow
  );

  const genreArray = api.genre.getAll.useQuery();

  const genreArrayData = useMemo(() => {
    if (!genreArray.data) return [];

    // not 100% sure why we can't just return below:
    // [...genreArray.data, { id: 9, name: "All genres", color: "#ec4899" }]
    if (genreArray.data.length === 8) {
      genreArray.data.push({
        id: 9,
        name: "All genres",
        color: "#ec4899",
      });
    }

    return genreArray.data;
  }, [genreArray.data]);

  const queryResults = useMemo(() => {
    const formattedTabString = searchResultsCount === 1 ? "tab" : "tabs";
    const formattedArtistString =
      searchResultsCount === 1 ? "artist" : "artists";

    if (type === "tabs") {
      // Found 10 "Rock" tabs
      if (searchQuery === "" && genreId >= 1 && genreId <= 8) {
        return (
          <div className="text-lg">
            {`Found ${searchResultsCount}`}
            <Badge
              style={{ backgroundColor: genreArrayData[genreId - 1]?.color }}
              className="mx-2"
            >
              {genreArrayData[genreId - 1]?.name}
            </Badge>
            {formattedTabString}
          </div>
        );
      }

      // Found 10 "Rock" tabs for "search query"
      if (searchQuery !== "" && genreId >= 1 && genreId <= 8) {
        return (
          <p className="text-lg">
            Found {searchResultsCount}
            <Badge
              style={{ backgroundColor: genreArrayData[genreId - 1]?.color }}
              className="mx-2"
            >
              {genreArrayData[genreId - 1]?.name}
            </Badge>
            tabs for &quot;
            {searchQuery}
            &quot;
          </p>
        );
      }

      // Found 10 tabs across "All genres"
      if (searchQuery === "" && genreId === 9) {
        return (
          <div className="text-lg">
            {`Found ${searchResultsCount} ${formattedTabString} across`}
            <Badge className="mx-2 bg-pink-500">All genres</Badge>
          </div>
        );
      }

      // Found 10 tabs across "All genres" for "search query"
      if (searchQuery !== "" && genreId === 9) {
        return (
          <div className="text-lg">
            {`Found ${searchResultsCount} ${formattedTabString} across`}
            <Badge className="mx-2 bg-pink-500">All genres</Badge>
            for &quot;{searchQuery}&quot;
          </div>
        );
      }
    }

    // all "artist" results are below:

    // Found 10 artists
    if (searchQuery === "" && type === "artists") {
      return (
        <p className="text-lg">
          Found {searchResultsCount} {formattedArtistString}
        </p>
      );
    }

    // Found 10 artists for "search query"
    else {
      return (
        <p className="text-lg">
          Found {searchResultsCount} artists for &quot;
          {searchQuery}
          &quot;
        </p>
      );
    }
  }, [searchResultsCount, type, genreId, searchQuery, genreArrayData]);

  // all param change handlers below will remove the param if it is getting set
  // to the "default" values that we have defined in the useGetUrlParamFilters hook
  function handleTypeChange(type: "tabs" | "artists") {
    const newQuery = { ...query };
    if (type === "artists") {
      newQuery.type = "artists";
    } else {
      delete newQuery.type;
    }

    void push({
      pathname,
      query: {
        ...newQuery,
      },
    });
  }

  function handleGenreChange(stringifiedId: string) {
    const newQuery = { ...query };
    if (parseInt(stringifiedId) >= 1 && parseInt(stringifiedId) <= 8) {
      newQuery.genreId = stringifiedId;
    } else {
      delete newQuery.genreId;
    }

    console.log("hit");

    void push({
      pathname,
      query: {
        ...newQuery,
      },
    });
  }

  function handleViewChange(viewType: "grid" | "table") {
    localStorageViewType.set(viewType);

    const newQuery = { ...query };
    if (viewType === "grid") {
      delete newQuery.view;
    } else {
      newQuery.view = "table";
    }

    void push({
      pathname,
      query: {
        ...newQuery,
      },
    });
  }

  function handleRelevanceChange() {
    const newQuery = { ...query };
    if (query.relevance === undefined) {
      newQuery.relevance = "false";
    } else {
      delete newQuery.relevance;
    }

    void push({
      pathname,
      query: {
        ...newQuery,
      },
    });
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

    // push new url to router
    void push({
      pathname,
      query: newQueries,
    });
  }

  // we have individual options for each sort type on mobile instead of clicking
  // through the either date/likes to cycle through the options.
  function handleMobileSortChange(
    type: "newest" | "oldest" | "leastLiked" | "mostLiked" | "none"
  ) {
    const newQueries = { ...query };

    if (type === "newest") delete newQueries.sort;
    else newQueries.sort = type;

    // push new url to router
    void push({
      pathname,
      query: newQueries,
    });
  }

  return (
    <div className="baseVertFlex min-h-[500px] w-full !flex-nowrap !justify-start rounded-md border-8 border-t-2 border-pink-800 shadow-md">
      {/* # of results + sorting options */}
      <div className="baseFlex w-full !items-center !justify-between gap-4 bg-pink-800 p-2 @container xl:min-h-[76px]">
        {/* # of results */}
        <AnimatePresence mode="wait">
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
              {queryResults}
            </motion.div>
          )}
        </AnimatePresence>

        {/* mobile sorting options */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="baseFlex gap-2 @3xl:hidden">
              Filter
              <LuFilter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            side={"bottom"}
            className="baseVertFlex min-w-[20rem] !items-start gap-2 bg-pink-50 text-pink-950"
          >
            <Label className="baseFlex gap-2">
              Search filters
              <LuFilter className="h-4 w-4" />
            </Label>
            <Separator className="mb-2 w-full bg-pink-500" />
            {pathname.includes("/explore") && (
              <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) =>
                    handleTypeChange(value as "tabs" | "artists")
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                value={genreId.toString()}
                onValueChange={(value) => handleGenreChange(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Genres</SelectLabel>

                    {genreArrayData.map((genre) => {
                      return (
                        <SelectItem key={genre.id} value={genre.id.toString()}>
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
                value={viewType}
                onValueChange={(value) =>
                  handleViewChange(value as "grid" | "table")
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <SelectContent>
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
          </PopoverContent>
        </Popover>

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

                      {genreArrayData.map((genre) => {
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
