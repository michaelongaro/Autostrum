import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useInView } from "react-intersection-observer";
import { api } from "~/utils/api";
import GridTabCard from "./GridTabCard";
import NoResultsFound from "./NoResultsFound";
import type { InfiniteQueryParams } from "~/server/api/routers/search";
import type { COLORS, THEME } from "~/stores/TabStore";
import Spinner from "~/components/ui/Spinner";

interface GridTabView {
  searchQuery?: string;
  genre?: string;
  tuning?: string;
  capo?: boolean;
  difficulty?: number;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  setSearchResultsCount: Dispatch<SetStateAction<number>>;
  setSearchsearchResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
  color: COLORS;
  theme: THEME;
}

function GridTabView({
  searchQuery,
  genre,
  tuning,
  capo,
  difficulty,
  sortBy,
  setSearchResultsCount,
  setSearchsearchResultsCountIsLoading,
  color,
  theme,
}: GridTabView) {
  const { userId } = useAuth();
  const { query, asPath } = useRouter();

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  function getInfiniteQueryParams(): InfiniteQueryParams {
    return {
      searchQuery: decodeURIComponent(searchQuery ?? ""),
      genre,
      tuning,
      capo: capo ?? undefined,
      difficulty: difficulty ?? undefined,
      sortBy,
      usernameToSelectFrom: asPath.includes("/user")
        ? ((query.username as string) ?? undefined)
        : asPath.includes("/profile/tabs")
          ? (currentUser?.username ?? undefined)
          : undefined,
      artistIdToSelectFrom:
        asPath.includes("/artist") && query.id ? Number(query.id) : undefined,
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
      enabled: Boolean(asPath.includes("/profile/tabs") ? currentUser : true),
      // need to wait for currentUser to be fetched before trying to search when
      // on current user's tabs page
    },
  );

  useEffect(() => {
    // only want to show loading indicator if we're fetching initial "page"
    setSearchsearchResultsCountIsLoading(isFetching && !isFetchingNextPage);
  }, [isFetching, isFetchingNextPage, setSearchsearchResultsCountIsLoading]);

  console.log(tabResults);

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
                  color={color}
                  theme={theme}
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
            <Spinner className={tabResults ? "size-6" : "size-8"} />
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
