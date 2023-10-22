import { useEffect, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AiFillHeart } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import { useInView } from "react-intersection-observer";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import GridArtistCard from "./GridArtistCard";
import NoResultsFound from "./NoResultsFound";

interface GridArtistView {
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

function GridArtistView({
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
  setResultsCountIsLoading,
}: GridArtistView) {
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
      key={"GridArtistViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex w-full gap-4 transition-all"
    >
      <div
        style={{ gridAutoRows: "minmax(min-content, max-content)" }}
        className="grid w-full grid-cols-1 place-items-center gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        <>
          {artistResults?.pages.map((page) =>
            page.data.artists?.map((artist, index) => (
              <AnimatePresence key={artist.id} mode={"wait"}>
                {index === page.data.artists.length - 1 ? (
                  <GridArtistCard ref={ref} {...artist} />
                ) : (
                  <GridArtistCard {...artist} />
                )}
              </AnimatePresence>
            ))
          )}

          {isFetching &&
            Array.from(Array(3).keys()).map((index) => (
              <AnimatePresence key={index} mode={"wait"}>
                <ArtistCardSkeleton key={`artistCardSkeleton${index}`} />
              </AnimatePresence>
            ))}
        </>
      </div>

      {/* no results */}
      {!isFetching && artistResults?.pages?.[0]?.data.artists.length === 0 && (
        <NoResultsFound customKey={"gridArtistViewNoResults"} />
      )}
    </motion.div>
  );
}

export default GridArtistView;

interface ArtistCardSkeleton {
  key: string;
}

function ArtistCardSkeleton({ key }: ArtistCardSkeleton) {
  return (
    <motion.div
      key={key}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="lightestGlassmorphic baseVertFlex w-full gap-6 rounded-md border-2 px-2 py-4 shadow-sm"
    >
      <div className="baseVertFlex gap-3">
        {/* profile image + username */}
        <div className="h-16 w-16 animate-pulse rounded-full bg-pink-300"></div>
        <div className="my-1 h-5 w-24 animate-pulse rounded-md bg-pink-300"></div>
      </div>

      {/* artist total tabs + likes */}
      <div className="baseFlex w-full !flex-nowrap gap-2">
        <div className="baseFlex gap-2">
          <GiMusicalScore className="h-6 w-6" />
          <div className="h-6 w-8 animate-pulse rounded-md bg-pink-300"></div>
        </div>
        <div className="baseFlex gap-2">
          <AiFillHeart className="h-6 w-6 text-pink-800" />
          <div className="h-6 w-8 animate-pulse rounded-md bg-pink-300"></div>
        </div>
      </div>
    </motion.div>
  );
}
