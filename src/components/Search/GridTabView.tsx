import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useInView } from "react-intersection-observer";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import GridTabCard from "./GridTabCard";
import TabCardSkeleton from "./TabCardSkeleton";
import NoResultsFound from "./NoResultsFound";

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
  selectedPinnedTabId?: number;
  setSelectedPinnedTabId?: Dispatch<SetStateAction<number>>;
  setResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
  hideLikesAndPlayButtons?: boolean;
}

function GridTabView({
  genreId,
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
  selectedPinnedTabId,
  setSelectedPinnedTabId,
  setResultsCountIsLoading,
  hideLikesAndPlayButtons,
}: GridTabView) {
  const { userId } = useAuth();
  const { query, asPath } = useRouter();

  const { data: artistProfileBeingViewed } =
    api.artist.getByIdOrUsername.useQuery(
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

  function getInfiniteQueryParams() {
    return {
      searchQuery,
      genreId: genreId,
      sortByRelevance,
      sortBy: additionalSortFilter,
      likedByUserId: asPath.includes("/likes") && userId ? userId : undefined,
      userIdToSelectFrom:
        (asPath.includes("/tabs") || asPath.includes("/preferences")) && userId
          ? userId
          : artistProfileBeingViewed
          ? artistProfileBeingViewed.userId
          : undefined,
    };
  }

  const {
    data: tabResults,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.tab.getInfiniteTabsBySearchQuery.useInfiniteQuery(
    getInfiniteQueryParams(),
    {
      getNextPageParam: (lastPage) => lastPage.data.nextCursor,
      onSuccess: (data) => {
        setSearchResultsCount(data?.pages?.[0]?.count ?? 0);
      },
    }
  );

  useEffect(() => {
    // only want to show loading indicator if we're fetching initial "page"
    setResultsCountIsLoading(isFetching && !isFetchingNextPage);
  }, [isFetching, isFetchingNextPage, setResultsCountIsLoading]);

  const { ref } = useInView({
    threshold: 0.75,
    onChange: (inView) => {
      if (inView && hasNextPage) {
        void fetchNextPage();
      }
    },
  });

  return (
    <motion.div
      key={"GridTabViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex w-full !flex-nowrap !justify-start gap-4 overflow-y-auto transition-all @container"
    >
      <div
        style={{ gridAutoRows: "minmax(min-content, max-content)" }}
        className="grid w-full grid-cols-1 place-items-center gap-4 p-4 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4"
      >
        <>
          {tabResults?.pages.map((page) =>
            page.data.tabs?.map((tab, index) => (
              <AnimatePresence key={tab.id} mode={"wait"}>
                {index === page.data.tabs.length - 1 ? (
                  <GridTabCard
                    ref={ref}
                    minimalTab={tab}
                    selectedPinnedTabId={selectedPinnedTabId}
                    setSelectedPinnedTabId={setSelectedPinnedTabId}
                    infiniteQueryParams={getInfiniteQueryParams()}
                    hideLikesAndPlayButtons={hideLikesAndPlayButtons}
                  />
                ) : (
                  <GridTabCard
                    minimalTab={tab}
                    selectedPinnedTabId={selectedPinnedTabId}
                    setSelectedPinnedTabId={setSelectedPinnedTabId}
                    infiniteQueryParams={getInfiniteQueryParams()}
                    hideLikesAndPlayButtons={hideLikesAndPlayButtons}
                  />
                )}
              </AnimatePresence>
            ))
          )}

          {isFetching &&
            Array.from(Array(3).keys()).map((index) => (
              <AnimatePresence key={index} mode={"wait"}>
                <TabCardSkeleton
                  uniqueKey={`tabCardSkeleton${index}`}
                  hideArtist={asPath.includes("/preferences")}
                  hideLikesAndPlayButtons={hideLikesAndPlayButtons}
                />
              </AnimatePresence>
            ))}
        </>
      </div>

      {/* no results */}
      {!isFetching && tabResults?.pages?.[0]?.data.tabs.length === 0 && (
        <NoResultsFound customKey={"gridTabViewNoResults"} />
      )}
    </motion.div>
  );
}

export default GridTabView;
