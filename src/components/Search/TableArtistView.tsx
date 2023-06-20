import { AnimatePresence, motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/utils/api";
import TableArtistRow from "./TableArtistRow";

interface TableArtistView {
  searchQuery?: string;
  sortByRelevance: boolean;
  additionalSortFilter?: "newest" | "oldest" | "leastLiked" | "mostLiked";
}

function TableArtistView({
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
}: TableArtistView) {
  const { data: artistResults, isLoading: isLoadingArtistResults } =
    api.artist.getInfiniteArtistsBySearchQuery.useInfiniteQuery(
      { searchQuery, sortByRelevance, sortBy: additionalSortFilter },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  console.log(artistResults);

  // may need resize observer to refetch data when more tabs are able to be shown
  // but maybe also is automatically handled by IntersectionObserver hook for main infinite scroll

  // not sure if this is best workaround because I would ideally not have loading spinner at all but:
  // maybe show loading spinner when isLoadingTabResults is true and then as soon as it is false
  // have a manual timeout to show correct amount of cards being rendered with their skeleton loading
  // state and then after that timeout is done, show the actual cards with their data?
  // ^^^ really all depends on how long it takes to fetch data in first place

  return (
    <motion.div
      key={"TableArtistViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full p-2 md:p-4"
    >
      <AnimatePresence mode="wait">
        {isLoadingArtistResults && (
          // alternatively look into like animated loading dots?
          <motion.div
            key={"searchAutofill"}
            initial={{ opacity: 0, top: "3rem" }}
            animate={{ opacity: 1, top: "3.5rem" }}
            exit={{ opacity: 0, top: "3rem" }}
            transition={{ duration: 0.25 }}
            className="lightestGlassmorphic absolute w-full rounded-md"
          >
            <div className="baseFlex w-full gap-4 py-4">
              <p>Loading</p>
              <svg
                className="h-6 w-6 animate-spin rounded-full bg-inherit fill-none"
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
          {artistResults?.pages.map((page) =>
            page.artists?.map((artist) => (
              <TableArtistRow key={artist.id} {...artist} />
            ))
          )}
        </TableBody>
      </Table>

      {/* hmm should also have "no results" jsx block too right? */}
    </motion.div>
  );
}

export default TableArtistView;
