import { AnimatePresence, motion } from "framer-motion";
import { useEffect, Fragment, type Dispatch, type SetStateAction } from "react";
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
  setResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
}

function TableArtistView({
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
  setResultsCountIsLoading,
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
      key={"TableArtistViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex w-full gap-4 p-4 transition-all"
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
          <>
            {artistResults?.pages.map((page) =>
              page.data.artists?.map((artist, index) => (
                <Fragment key={artist.id}>
                  {index === page.data.artists.length - 1 ? (
                    <TableArtistRow ref={ref} key={artist.id} {...artist} />
                  ) : (
                    <TableArtistRow key={artist.id} {...artist} />
                  )}
                </Fragment>
              ))
            )}

            {isFetching &&
              Array.from(Array(3).keys()).map((index) => (
                <AnimatePresence key={index} mode={"wait"}>
                  <TableArtistSkeleton key={`artistTableSkeleton${index}`} />
                </AnimatePresence>
              ))}
          </>
        </TableBody>
      </Table>

      {/* no results */}
      {!isFetching && artistResults?.pages?.[0]?.data.artists.length === 0 && (
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
