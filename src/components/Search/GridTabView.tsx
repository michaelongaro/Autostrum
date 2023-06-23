import { useState, useEffect } from "react";

import { api } from "~/utils/api";
import { AnimatePresence, motion } from "framer-motion";
import GridTabCard from "./GridTabCard";
import { useInView } from "react-intersection-observer";
import { useRouter } from "next/router";
import { useAuth } from "@clerk/nextjs";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

interface GridTabView {
  genreId: number;
  searchQuery: string;
  sortByRelevance: boolean;
  additionalSortFilter:
    | "newest"
    | "oldest"
    | "leastLiked"
    | "mostLiked"
    | "none";
}

function GridTabView({
  genreId,
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
}: GridTabView) {
  const { userId } = useAuth();
  const { query, asPath } = useRouter();

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      username: query.username as string,
    },
    {
      enabled: !!query.username,
    }
  );

  const { setSearchResultsCount } = useTabStore(
    (state) => ({
      setSearchResultsCount: state.setSearchResultsCount,
    }),
    shallow
  );

  const {
    data: tabResults,
    isFetching,
    hasNextPage,
    fetchNextPage,
    refetch: refetchTabs,
  } = api.tab.getInfiniteTabsBySearchQuery.useInfiniteQuery(
    {
      searchQuery,
      genreId: genreId,
      sortByRelevance,
      sortBy: additionalSortFilter,
      likedByUserId: asPath.includes("/likes") && userId ? userId : undefined,
      userIdToSelectFrom:
        asPath.includes("/tabs") && userId
          ? userId
          : typeof query.username === "string"
          ? artist?.userId
          : undefined,
    },
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
      key={"GridTabViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex w-full gap-4 transition-all"
    >
      <div
        style={
          !tabResults || tabResults?.pages?.[0]?.data.tabs.length === 0
            ? { padding: "0" }
            : {}
        }
        className="grid w-full grid-cols-1 place-items-center gap-4 p-2 md:grid-cols-2 md:p-4 lg:grid-cols-3 xl:grid-cols-4"
      >
        {tabResults?.pages.map((page) =>
          page.data.tabs?.map((tab, index) => (
            <AnimatePresence key={tab.id} mode={"wait"}>
              {index === page.data.tabs.length - 1 ? (
                <GridTabCard ref={ref} tab={tab} refetchTab={refetchTabs} />
              ) : (
                <GridTabCard tab={tab} refetchTab={refetchTabs} />
              )}
            </AnimatePresence>
          ))
        )}
      </div>

      {/* no results */}
      <AnimatePresence mode="wait">
        {tabResults?.pages?.[0]?.data.tabs.length === 0 &&
          !showArtificialLoadingSpinner &&
          !isFetching && (
            <motion.p
              key={"gridTabViewNoResults"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="py-8 text-lg"
            >
              No results found.
            </motion.p>
          )}
      </AnimatePresence>

      {/* loading spinner */}
      <AnimatePresence mode="wait">
        {(showArtificialLoadingSpinner || isFetching) && (
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
    </motion.div>
  );
}

export default GridTabView;
