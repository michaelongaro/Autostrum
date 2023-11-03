import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, type Dispatch, type SetStateAction, Fragment } from "react";
import { TbPinned } from "react-icons/tb";
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
import TableTabRow from "./TableTabRow";
import NoResultsFound from "./NoResultsFound";

interface TableTabView {
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

function TableTabView({
  genreId,
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
  selectedPinnedTabId,
  setSelectedPinnedTabId,
  setResultsCountIsLoading,
  hideLikesAndPlayButtons,
}: TableTabView) {
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
      key={"TableTabViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`baseVertFlex  w-full gap-4 overflow-y-auto p-4 transition-all ${
        hideLikesAndPlayButtons ? "max-h-[70vh]" : ""
      }`}
    >
      <Table>
        {/* ideally want table to be rounded, but wasn't having much luck. look up online
        because I know on lyricize it was a bit of a hassle*/}
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            {selectedPinnedTabId !== undefined && (
              <TableHead>
                <TbPinned className="h-4 w-4" />
              </TableHead>
            )}
            <TableHead>Genre</TableHead>
            <TableHead className="min-w-[175px]">Artist</TableHead>
            <TableHead>Date</TableHead>
            {/* empty headers for likes and play/pause columns */}
            <TableHead></TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="w-full">
          <>
            {tabResults?.pages.map((page) =>
              page.data.tabs?.map((tab, index) => (
                <Fragment key={tab.id}>
                  {index === page.data.tabs.length - 1 ? (
                    <TableTabRow
                      ref={ref}
                      key={tab.id}
                      minimalTab={tab}
                      selectedPinnedTabId={selectedPinnedTabId}
                      setSelectedPinnedTabId={setSelectedPinnedTabId}
                      infiniteQueryParams={getInfiniteQueryParams()}
                      hideLikesAndPlayButtons={hideLikesAndPlayButtons}
                    />
                  ) : (
                    <TableTabRow
                      key={tab.id}
                      minimalTab={tab}
                      selectedPinnedTabId={selectedPinnedTabId}
                      setSelectedPinnedTabId={setSelectedPinnedTabId}
                      infiniteQueryParams={getInfiniteQueryParams()}
                      hideLikesAndPlayButtons={hideLikesAndPlayButtons}
                    />
                  )}
                </Fragment>
              ))
            )}

            {isFetching &&
              Array.from(Array(3).keys()).map((index) => (
                <AnimatePresence key={index} mode={"wait"}>
                  <TableTabSkeleton
                    key={`tabTableSkeleton${index}`}
                    forPinnedModal={asPath.includes("/preferences")}
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

// TODO: probably don't want to show the artist for pinned modal since it is already implied..

function TableTabSkeleton({
  forPinnedModal,
  hideLikesAndPlayButtons,
}: {
  forPinnedModal: boolean;
  hideLikesAndPlayButtons?: boolean;
}) {
  return (
    <TableRow className="w-full">
      <TableCell>
        <div className="h-6 w-32 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>
      {forPinnedModal && (
        <TableCell>
          <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
        </TableCell>
      )}
      <TableCell>
        <div className="h-8 w-32 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>

      <TableCell className="baseFlex !flex-nowrap !justify-start gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-pink-300"></div>
        <div className="h-6 w-24 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>

      <TableCell>
        <div className="h-8 w-24 animate-pulse rounded-md bg-pink-300"></div>
      </TableCell>
      {!hideLikesAndPlayButtons && (
        <>
          <TableCell>
            <div className="h-8 w-12 animate-pulse rounded-md bg-pink-300"></div>
          </TableCell>
          <TableCell>
            <div className="h-8 w-12 animate-pulse rounded-md bg-pink-300"></div>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
