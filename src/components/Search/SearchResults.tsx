import { useMemo } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "../ui/select";
import { BsArrowDownShort, BsGridFill } from "react-icons/bs";
import { CiViewTable } from "react-icons/ci";
import GridTabView from "./GridTabView";
import GridArtistView from "./GridArtistView";
import TableTabView from "./TableTabView";
import TableArtistView from "./TableArtistView";

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
}

function SearchResults({
  genreId,
  type,
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
  viewType,
}: SearchResults) {
  const { asPath, push, query, pathname } = useRouter();

  // worry about skeletons later!

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
        scroll: false, // defaults to true but try both
        shallow: true,
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
        scroll: false, // defaults to true but try both
        shallow: true,
      }
    );
  }

  function handleViewChange(viewType: "grid" | "table") {
    const newQuery = { ...query };
    if (viewType === "table") {
      newQuery.view = viewType;
    } else {
      delete newQuery.view;
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
        scroll: false, // defaults to true but try both
        shallow: true,
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
        scroll: false, // defaults to true but try both
        shallow: true,
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

    if (newSortParam === "mostLiked") delete newQueries.sort;
    else newQueries.sort = newSortParam;

    // push new url to router
    void push(
      {
        pathname,
        query: newQueries,
      },
      undefined,
      {
        scroll: false, // defaults to true but try both
        shallow: true,
      }
    );
  }

  return (
    // prob better practice to let parent component decide vertical margin/padding
    // rather than do it here.
    <div className="baseVertFlex mt-8 w-full rounded-md border-8 border-t-2 border-pink-900 shadow-md">
      {/* # of results + sorting options */}
      <div className="baseVertFlex w-full !items-start gap-2 bg-pink-900 px-4 py-2 md:flex-row md:!items-center md:!justify-between">
        {/* # of results */}
        {/* will have to create separate trpc functions for tabs/artists that do the same query but return
            just the total counts for those queries */}
        {searchQuery && (
          <p className="text-lg">{`${15} results for "${searchQuery}"`}</p>
        )}
        {/* most likely need another block for if searchQuery is undefined where it will show like
            "All {genre} tabs - {numberOfTabs}" or "All artists - {numberOfArtists}". Think about it */}

        {/* sorting options */}
        <div className="baseFlex !justify-start gap-2 md:!justify-center md:gap-4">
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
              // below component should check if it is for pinned modal &&
              // have supporting logic/styling
              <GridTabView
                genreId={genreId}
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
              />
            ) : (
              <GridArtistView
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
              />
            )}
          </>
        ) : (
          <>
            {/* table view */}
            {type === "tabs" ? (
              // below component should check if it is for pinned modal &&
              // have supporting logic/styling
              <TableTabView
                genreId={genreId}
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
              />
            ) : (
              <TableArtistView
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
              />
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchResults;
