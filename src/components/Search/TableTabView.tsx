import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentRef,
} from "overlayscrollbars-react";
import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useInView } from "react-intersection-observer";
import { Table, TableBody } from "~/components/ui/table";
import type { InfiniteQueryParams } from "~/server/api/routers/search";
import { api } from "~/utils/api";
import NoResultsFound from "./NoResultsFound";
import TableTabRow from "./TableTabRow";

interface TableTabView {
  searchQuery?: string;
  genreId?: number;
  tuning?: string;
  capo?: boolean;
  difficulty?: number;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  setSearchResultsCount: Dispatch<SetStateAction<number>>;
  setSearchsearchResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
  tableHeaderRef: RefObject<OverlayScrollbarsComponentRef<"div"> | null>;
  tableBodyRef: RefObject<OverlayScrollbarsComponentRef<"div"> | null>;
}

function TableTabView({
  searchQuery,
  genreId,
  tuning,
  capo,
  difficulty,
  sortBy,
  setSearchResultsCount,
  setSearchsearchResultsCountIsLoading,
  tableHeaderRef,
  tableBodyRef,
}: TableTabView) {
  const { userId } = useAuth();
  const { query, asPath } = useRouter();

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
      userIdToSelectFrom: asPath.includes("/user")
        ? ((query.userId as string) ?? undefined)
        : asPath.includes("/profile/tabs")
          ? (userId ?? undefined)
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

  // FYI: using separate <AnimatePresence> instead of wrapping entire output in one
  // because <OverlayScrollbarsComponent> needs to be a direct child of the DOM element I guess?

  return (
    <motion.div
      key={"TableTabViewSearchResults"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`baseVertFlex min-h-[calc(100dvh-4rem-6rem-56px-60px-45px)] w-full gap-4 transition-all md:min-h-[calc(100dvh-4rem-12rem-56px-60px-45px)] ${
        (isFetching && !isFetchingNextPage) ||
        tabResults?.pages?.[0]?.data.tabs.length === 0
          ? "" // loading spinner (when no results exist) and <NoResultsFound /> should be centered
          : "!justify-start"
      }`}
    >
      {tabResults && tabResults.pages[0]?.count !== 0 && (
        <OverlayScrollbarsComponent
          ref={tableBodyRef}
          options={{
            scrollbars: { autoHide: "leave", autoHideDelay: 150 },
          }}
          events={{
            // keeps the table header and body in sync when scrolling
            scroll(instance) {
              const header = tableHeaderRef.current
                ?.osInstance()
                ?.elements().viewport;
              if (!header) return;

              header.scrollLeft = instance.elements().viewport.scrollLeft;
            },
          }}
          defer
          className="w-full"
        >
          <div className="relative w-[1160px]">
            <Table>
              <colgroup id="tableTabViewColGroup">
                {/* Direct /edit page button */}
                {asPath.includes("/profile/tabs") && (
                  <col className="w-[72px] sm:!w-[90.95px]" />
                )}

                {/* Title */}
                <col className="w-[250px] sm:!w-[314.53px]" />

                {/* Artist */}
                {!query.artist &&
                  !query.user &&
                  !asPath.includes("/profile/tabs") && (
                    <col className="w-[200px]" />
                  )}

                {/* Rating */}
                <col />

                {/* Difficulty */}
                <col />

                {/* Genre */}
                <col />

                {/* Date */}
                <col />

                {/* Bookmark toggle */}
                <col className="w-[72px] sm:!w-[90.95px]" />
              </colgroup>

              <AnimatePresence mode="popLayout">
                <TableBody className="w-full @container">
                  {tabResults.pages.map((page) =>
                    page.data.tabs?.map((tab, index) => (
                      <AnimatePresence key={tab.id} mode={"wait"}>
                        {index === page.data.tabs.length - 1 ? (
                          <TableTabRow
                            minimalTab={tab}
                            currentUser={currentUser}
                            infiniteQueryParams={getInfiniteQueryParams()}
                            ref={
                              ref as unknown as React.RefObject<HTMLTableRowElement>
                            }
                          />
                        ) : (
                          <TableTabRow
                            minimalTab={tab}
                            currentUser={currentUser}
                          />
                        )}
                      </AnimatePresence>
                    )),
                  )}
                </TableBody>
              </AnimatePresence>
            </Table>
          </div>
        </OverlayScrollbarsComponent>
      )}

      <AnimatePresence mode="popLayout">
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
            customKey={"tableTabViewNoResults"}
            searchQueryExists={Boolean(searchQuery)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TableTabView;
