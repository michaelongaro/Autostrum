import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useInView } from "react-intersection-observer";
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
import NoResultsFound from "./NoResultsFound";
import TableTabRow from "./TableTabRow";
import type { ParsedUrlQuery } from "querystring";
import { FaStar } from "react-icons/fa";

interface TableTabView {
  searchQuery?: string;
  genreId?: number;
  tuning?: string;
  capo?: boolean;
  difficulty?: number;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  setResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
}

function TableTabView({
  searchQuery,
  genreId,
  tuning,
  capo,
  difficulty,
  sortBy,
  setResultsCountIsLoading,
}: TableTabView) {
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
      key={"TableTabViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex w-full gap-4 p-4 transition-all"
    >
      <Table>
        {/* ideally want table to be rounded, but wasn't having much luck. look up online
        because I know on lyricize it was a bit of a hassle*/}
        <TableHeader className="!sticky top-0">
          <TableRow className="hover:!bg-transparent">
            <TableHead>Title</TableHead>

            {!query.artist &&
              !query.user &&
              !asPath.includes("/profile/tabs") && (
                <TableHead>Artist</TableHead>
              )}

            <TableHead>Rating</TableHead>

            {!query.difficulty && <TableHead>Difficulty</TableHead>}

            {!query.genreId && <TableHead>Genre</TableHead>}

            <TableHead>Date</TableHead>

            {/* Empty header for bookmark toggle */}
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="w-full">
          <>
            {tabResults?.pages.map((page) =>
              page.data.tabs?.map((tab, index) => (
                <AnimatePresence key={tab.id} mode={"wait"}>
                  {index === page.data.tabs.length - 1 ? (
                    <TableTabRow
                      minimalTab={tab}
                      currentUser={currentUser}
                      ref={
                        ref as unknown as React.RefObject<HTMLTableRowElement>
                      }
                    />
                  ) : (
                    <TableTabRow minimalTab={tab} currentUser={currentUser} />
                  )}
                </AnimatePresence>
              )),
            )}

            {isFetching &&
              Array.from(Array(3).keys()).map((index) => (
                <AnimatePresence key={index} mode={"wait"}>
                  <TableTabSkeleton
                    key={`tabTableSkeleton${index}`}
                    query={query}
                  />
                </AnimatePresence>
              ))}
          </>
        </TableBody>
      </Table>

      {/* no results */}
      {!isFetching && tabResults?.pages?.[0]?.data.tabs.length === 0 && (
        <NoResultsFound customKey={"tableTabViewNoResults"} />
      )}
    </motion.div>
  );
}

export default TableTabView;

function TableTabSkeleton({ query }: { query: ParsedUrlQuery }) {
  return (
    <TableRow className="w-full">
      {/* title */}
      <TableCell>
        <div className="h-6 w-48 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>

      {/* artist */}
      {!query.artist &&
        !query.user &&
        !query.username &&
        !query.tuning &&
        !query.capo && (
          <TableCell>
            <div className="h-6 w-32 animate-pulse rounded-md bg-pink-300"></div>
          </TableCell>
        )}

      {/* rating */}
      <TableCell>
        <div className="baseFlex !justify-start gap-2">
          <div className="h-6 w-12 animate-pulse rounded-md bg-pink-300"></div>
          <FaStar className="size-3" />
          <div className="h-6 w-12 animate-pulse rounded-md bg-pink-300"></div>
        </div>
      </TableCell>

      {/* difficulty */}
      {!query.difficulty && (
        <TableCell>
          <div className="h-6 w-24 animate-pulse rounded-md bg-pink-300"></div>
        </TableCell>
      )}

      {/* genre */}
      {!query.genreId && (
        <TableCell>
          <div className="h-6 w-16 animate-pulse rounded-md bg-pink-300"></div>
        </TableCell>
      )}

      {/* date */}
      <TableCell>
        <div className="h-6 w-20 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>

      {/* bookmark toggle */}
      <TableCell>
        <div className="h-10 w-10 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>
    </TableRow>
  );
}
