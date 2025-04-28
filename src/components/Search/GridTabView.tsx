import { Fragment, useEffect, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useInView } from "react-intersection-observer";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import GridTabCard from "./GridTabCard";
import TabCardSkeleton from "./TabCardSkeleton";
import NoResultsFound from "./NoResultsFound";

interface GridTabView {
  searchQuery?: string;
  genreId?: number;
  tuning?: string;
  capo?: boolean;
  difficulty?: number;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  setResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
}

function GridTabView({
  searchQuery,
  genreId,
  tuning,
  capo,
  difficulty,
  sortBy,
  setResultsCountIsLoading,
}: GridTabView) {
  const { userId } = useAuth();
  const { query, asPath } = useRouter();

  const { setSearchResultsCount } = useTabStore((state) => ({
    setSearchResultsCount: state.setSearchResultsCount,
  }));

  const { data: userProfileBeingViewed } = api.user.getByIdOrUsername.useQuery(
    {
      username: query.username as string,
    },
    {
      enabled: !!query.username,
    },
  );

  const { data: currentUser } = api.user.getByIdOrUsername.useQuery(
    {
      userId: userId!,
    },
    {
      enabled: !!userId,
    },
  );

  function getInfiniteQueryParams() {
    return {
      searchQuery,
      genreId,
      tuning,
      capo: capo ?? undefined,
      difficulty: difficulty ?? undefined,
      sortBy,
      userIdToSelectFrom:
        (asPath.includes("/user") || asPath.includes("/profile/tabs")) && userId
          ? userId
          : userProfileBeingViewed
            ? userProfileBeingViewed.userId
            : undefined,
      artistIdToSelectFrom:
        asPath.includes("/artist") && query.artistId
          ? Number(query.artistId)
          : undefined,
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
    },
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
        <AnimatePresence mode={"popLayout"}>
          {tabResults?.pages.map((page) =>
            page.data.tabs?.map((tab, index) => (
              <Fragment key={tab.id}>
                {index === page.data.tabs.length - 1 ? (
                  <GridTabCard
                    minimalTab={tab}
                    currentUser={currentUser}
                    ref={ref as unknown as React.RefObject<HTMLDivElement>}
                  />
                ) : (
                  <GridTabCard minimalTab={tab} currentUser={currentUser} />
                )}
              </Fragment>
            )),
          )}

          {isFetching &&
            Array.from(Array(3).keys()).map((index) => (
              <TabCardSkeleton
                key={`tabCardSkeleton${index}`}
                uniqueKey={`tabCardSkeleton${index}`}
                hideArtist={asPath.includes("/preferences")}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* no results */}
      {!isFetching && tabResults?.pages?.[0]?.data.tabs.length === 0 && (
        <NoResultsFound customKey={"gridTabViewNoResults"} />
      )}
    </motion.div>
  );
}

export default GridTabView;
