import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AiFillHeart } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import { useInView } from "react-intersection-observer";
import { shallow } from "zustand/shallow";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import TableArtistRow from "./TableArtistRow";
import NoResultsFound from "./NoResultsFound";

interface TableArtistView {
  searchQuery: string;
  sortByRelevance: boolean;
  additionalSortFilter:
    | "newest"
    | "oldest"
    | "leastLiked"
    | "mostLiked"
    | "none";
}

function TableArtistView({
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
}: TableArtistView) {
  const { setSearchResultsCount } = useTabStore(
    (state) => ({
      setSearchResultsCount: state.setSearchResultsCount,
    }),
    shallow
  );

  const {
    data: artistResults,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.artist.getInfiniteArtistsBySearchQuery.useInfiniteQuery(
    { searchQuery, sortByRelevance, sortBy: additionalSortFilter },
    {
      getNextPageParam: (lastPage) => lastPage.data.nextCursor,
      onSuccess: (data) => {
        setSearchResultsCount(data?.pages?.[0]?.count ?? 0);
      },
    }
  );

  const { ref, inView } = useInView({
    threshold: 0.75,
  });

  const [showArtificialLoadingSpinner, setShowArtificialLoadingSpinner] =
    useState(false);

  useEffect(() => {
    if (isFetching) {
      setShowArtificialLoadingSpinner(true);
      setTimeout(() => {
        setShowArtificialLoadingSpinner(false);
      }, 1500);
    }
  }, [isFetching]);

  useEffect(() => {
    if (inView && hasNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <motion.div
      key={"TableArtistViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex w-full gap-4 p-2 transition-all md:p-4"
    >
      <Table>
        {/* ideally want table to be rounded, but wasn't having much luck. look up online
        because I know on lyricize it was a bit of a hassle*/}
        <TableHeader>
          <TableRow>
            <TableHead>Artist</TableHead>
            <TableHead>Tabs</TableHead>
            <TableHead>Likes</TableHead>
            <TableHead>Date joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="w-full">
          {(!showArtificialLoadingSpinner || isFetchingNextPage) &&
          artistResults ? (
            <>
              {artistResults.pages.map((page) =>
                page.data.artists?.map((artist, index) => (
                  <>
                    {index === page.data.artists.length - 1 ? (
                      <TableArtistRow ref={ref} key={artist.id} {...artist} />
                    ) : (
                      <TableArtistRow key={artist.id} {...artist} />
                    )}
                  </>
                ))
              )}

              {/* loading spinner */}
              <AnimatePresence mode="wait">
                {isFetchingNextPage && (
                  // there is extra space on top during initial load when no cards are rendered, try to eliminate
                  <motion.div
                    key={"gridTabViewLoadingSpinner"}
                    initial={{ opacity: 0, scale: 0, height: "0" }}
                    animate={{ opacity: 1, scale: 1, height: "auto" }}
                    exit={{ opacity: 0, scale: 0, height: "0" }}
                    transition={{
                      opacity: { duration: 0.25 },
                      scale: { duration: 0.15 },
                      height: { duration: 0.35 },
                      // height: { duration: 0.25}
                    }}
                    className="baseFlex w-full"
                  >
                    <div className="baseFlex h-24 w-full gap-4">
                      <p className="text-lg">Loading</p>
                      <svg
                        className="h-7 w-7 animate-spin rounded-full bg-inherit fill-none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <>
              {Array.from(Array(3).keys()).map((index) => (
                <AnimatePresence key={index} mode={"wait"}>
                  <TableArtistSkeleton key={`artistTableSkeleton${index}`} />
                </AnimatePresence>
              ))}
            </>
          )}
        </TableBody>
      </Table>

      {/* no results */}
      {!showArtificialLoadingSpinner &&
        !isFetching &&
        artistResults?.pages?.[0]?.data.artists.length === 0 && (
          <NoResultsFound customKey={"tableArtistViewNoResults"} />
        )}
    </motion.div>
  );
}

export default TableArtistView;

function TableArtistSkeleton() {
  return (
    <TableRow className="w-full">
      <TableCell>
        <div className="baseFlex !justify-start gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-pink-300"></div>
          <div className="h-6 w-24 animate-pulse rounded-md bg-pink-300"></div>
        </div>
      </TableCell>

      <TableCell>
        <div className="baseFlex !justify-start gap-2">
          <GiMusicalScore className="h-6 w-6" />
          <div className="h-6 w-8 animate-pulse rounded-md bg-pink-300"></div>
        </div>
      </TableCell>

      <TableCell className="baseFlex !justify-start gap-2">
        <div className="baseFlex !justify-start gap-2">
          <AiFillHeart className="h-6 w-6 text-pink-800" />
          <div className="h-6 w-8 animate-pulse rounded-md bg-pink-300"></div>
        </div>
      </TableCell>

      <TableCell>
        <div className="h-6 w-16 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>
    </TableRow>
  );
}
