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
import type { Genre } from "@prisma/client";
import { BsArrowDownShort, BsGridFill } from "react-icons/bs";
import { MdTableRows } from "react-icons/md";
import GridView from "./GridView";
import TableView from "./TableView";

interface SearchResults {
  genreId?: number;
  type?: "tabs" | "artists";
  searchQuery?: string;
  sortByRelevance: boolean;
  additionalSortFilter?: "newest" | "oldest" | "leastLiked" | "mostLiked";
  viewType: "grid" | "table";
}

// don't forget that [...query] means that you are going to be adding
// onto query the criteria to sort by! for example somehting like
// "/sunshine?sort=ascLikes" or "/sunshine?sort=descAlphabetical"
// again defaulting to descDate to show newest ones

// also don't forget that if full redirect to new page takes too long, we can almost
// definitely just push the new url into the browser history and it should be exactly
// the same effect

// we are moving to "manual" counting of likes + # of tabs, so we will need to add this sorting logic
// to trpc functions

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

    if (genreArray.data.length === 8) {
      genreArray.data.push({
        id: 9,
        name: "All genres",
        color: "#ec4899",
      });
    }

    return genreArray.data;
  }, [genreArray.data]);

  function handleTypeChange(type: "tabs" | "artists") {
    void push(
      {
        pathname,
        query: {
          ...query,
          type,
        },
      },
      undefined,
      {
        scroll: false, // defaults to true but try both
        shallow: true,
      }
    );
  }

  // &filteredQuery=filters gets added onto end of url...

  function handleGenreChange(stringifiedId: string) {
    void push(
      {
        pathname,
        query: {
          ...query,
          genreId: stringifiedId,
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
    void push(
      {
        pathname,
        query: {
          ...query,
          view: viewType,
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
    void push(
      {
        pathname,
        query: {
          ...query,
          relevance: query.relevance === "true" ? false : true,
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

    switch (query.sort) {
      case "newest":
        if (type === "date") {
          newSortParam = "oldest";
        } else {
          newSortParam = "mostLiked";
        }
        break;
      case "oldest":
        if (type === "date") {
          newSortParam = "";
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
          newSortParam = "";
        } else {
          newSortParam = "newest";
        }
        break;
      case undefined:
        if (type === "date") {
          newSortParam = "newest";
        } else {
          newSortParam = "mostLiked";
        }
        break;
    }

    const newQueries = { ...query };

    if (newSortParam === "") delete newQueries.sort;
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
    <div className="baseVertFlex mt-8 w-full rounded-md border-2 border-pink-900">
      {/* # of results + sorting options */}
      <div className="baseVertFlex w-full bg-pink-900 px-4 py-2 md:flex-row md:!justify-between">
        {/* # of results */}
        {/* tabResults.length */}
        {searchQuery && (
          <p className="text-lg">{`${15} results for "${searchQuery}"`}</p>
        )}
        {/* most likely need another block for if searchQuery is undefined where it will show like
            "All {genre} tabs" or "All artists". Think about it */}

        {/* sorting options */}
        <div className="baseFlex gap-2 md:gap-4">
          {/* type (artist page only shows tabs so hide selector) */}
          {!asPath.includes("/artist") && (
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
            {(asPath.includes("/artist") || type === "tabs") && (
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
                  // not sure on logic here, maybe change this so that unless type="tabs" genreId
                  // HAS to be defined (9 being "all genres") ?
                  value={(genreId ?? 9).toString()}
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
                <MdTableRows className="h-4 w-4" />
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

      {/* card view */}
      <AnimatePresence>
        {viewType === "grid" ? (
          <GridView
            genreId={genreId}
            type={type}
            searchQuery={searchQuery}
            sortByRelevance={sortByRelevance}
            additionalSortFilter={additionalSortFilter}
          />
        ) : (
          <TableView
            genreId={genreId}
            type={type}
            searchQuery={searchQuery}
            sortByRelevance={sortByRelevance}
            additionalSortFilter={additionalSortFilter}
          />
        )}
      </AnimatePresence>

      {/* table view */}
    </div>
  );
}

export default SearchResults;
