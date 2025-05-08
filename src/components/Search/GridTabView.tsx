import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useInView } from "react-intersection-observer";
import { api } from "~/utils/api";
import GridTabCard from "./GridTabCard";
import NoResultsFound from "./NoResultsFound";
import type { InfiniteQueryParams } from "~/server/api/routers/search";

interface GridTabView {
  searchQuery?: string;
  genreId?: number;
  tuning?: string;
  capo?: boolean;
  difficulty?: number;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  setSearchResultsCount: Dispatch<SetStateAction<number>>;
  setSearchsearchResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
}

function GridTabView({
  searchQuery,
  genreId,
  tuning,
  capo,
  difficulty,
  sortBy,
  setSearchResultsCount,
  setSearchsearchResultsCountIsLoading,
}: GridTabView) {
  const { userId } = useAuth();
  const { query, asPath } = useRouter();

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

  function getInfiniteQueryParams(): InfiniteQueryParams {
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
    setSearchsearchResultsCountIsLoading(isFetching && !isFetchingNextPage);
  }, [isFetching, isFetchingNextPage, setSearchsearchResultsCountIsLoading]);

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
      className={`baseVertFlex size-full min-h-[calc(100dvh-4rem-6rem-56px-60px)] @container md:min-h-[calc(100dvh-4rem-12rem-56px-60px)] ${
        (isFetching && !isFetchingNextPage) ||
        tabResults?.pages?.[0]?.data.tabs.length === 0
          ? "" // loading spinner (when no results exist) and <NoResultsFound /> should be centered
          : "!justify-start"
      }`}
    >
      <AnimatePresence mode="popLayout">
        {tabResults && tabResults.pages[0]?.count !== 0 && (
          <div
            style={{ gridAutoRows: "minmax(min-content, max-content)" }}
            className="grid w-full grid-cols-1 place-items-center gap-4 p-4 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4"
          >
            {tabResults.pages.map((page) =>
              page.data.tabs.map((tab, index) => (
                <GridTabCard
                  key={tab.id}
                  minimalTab={tab}
                  currentUser={currentUser}
                  infiniteQueryParams={getInfiniteQueryParams()}
                  ref={
                    index === page.data.tabs.length - 1
                      ? (ref as unknown as React.RefObject<HTMLDivElement>)
                      : undefined
                  }
                />
              )),
            )}
          </div>
        )}

        {/* loading spinner when fetching tabs */}
        {isFetching && (
          <motion.div
            key={"gridTabViewSpinner"}
            initial={{ opacity: 0, marginTop: "0", marginBottom: "0" }}
            animate={{
              opacity: 1,
              marginTop:
                tabResults && tabResults.pages.length !== 0 ? "1.75rem" : "0",
              marginBottom:
                tabResults && tabResults.pages.length !== 0 ? "1.75rem" : "0",
            }}
            exit={{ opacity: 0 }} // FYI: not sure if this is correct,
            // but omitting exit margin animations because it looks off to see the spinner
            // slide back up when it's really supposed to just fade out.
            transition={{ duration: 0.25 }}
          >
            <svg
              className={`animate-stableSpin rounded-full bg-inherit fill-none ${
                tabResults ? "size-6" : "size-8"
              }`}
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
          </motion.div>
        )}

        {/* no results */}
        {!isFetching && tabResults?.pages?.[0]?.data.tabs.length === 0 && (
          <NoResultsFound
            customKey={"gridTabViewNoResults"}
            searchQueryExists={Boolean(searchQuery)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default GridTabView;
