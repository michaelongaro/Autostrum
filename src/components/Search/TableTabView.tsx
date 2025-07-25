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
import Spinner from "~/components/ui/Spinner";

interface TableTabView {
  searchQuery?: string;
  genre?: string;
  tuning?: string;
  capo?: boolean;
  difficulty?: number;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  setSearchResultsCount: Dispatch<SetStateAction<number>>;
  setSearchsearchResultsCountIsLoading: Dispatch<SetStateAction<boolean>>;
  tableHeaderRef: RefObject<OverlayScrollbarsComponentRef<"div"> | null>;
  tableBodyRef: RefObject<OverlayScrollbarsComponentRef<"div"> | null>;
  activeScrollerRef: RefObject<"header" | "body" | null>;
  handlePointerDown: (scroller: "header" | "body") => void;
  handlePointerUp: () => void;
  theme: "light" | "dark";
}

function TableTabView({
  searchQuery,
  genre,
  tuning,
  capo,
  difficulty,
  sortBy,
  setSearchResultsCount,
  setSearchsearchResultsCountIsLoading,
  tableHeaderRef,
  tableBodyRef,
  activeScrollerRef,
  handlePointerDown,
  handlePointerUp,
  theme,
}: TableTabView) {
  const { userId } = useAuth();
  const { query, asPath } = useRouter();

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  function getInfiniteQueryParams(): InfiniteQueryParams {
    return {
      searchQuery,
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
    },
  );

  useEffect(() => {
    // only want to show loading indicator if we're fetching initial "page"
    setSearchsearchResultsCountIsLoading(isFetching && !isFetchingNextPage);
  }, [isFetching, isFetchingNextPage, setSearchsearchResultsCountIsLoading]);

  const { ref } = useInView({
    threshold: 0.25,
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
            scroll(instance) {
              // Only sync if this is NOT the active scroller.
              if (activeScrollerRef.current === "header") {
                return;
              }

              const header = tableHeaderRef.current
                ?.osInstance()
                ?.elements().viewport;
              if (!header) return;

              header.scrollLeft = instance.elements().viewport.scrollLeft;
            },
            initialized(instance) {
              const { viewport } = instance.elements();
              viewport.addEventListener("pointerdown", () =>
                handlePointerDown("body"),
              );
              viewport.addEventListener("pointerup", handlePointerUp);
            },
            destroyed(instance) {
              const { viewport } = instance.elements();
              viewport.removeEventListener("pointerdown", () =>
                handlePointerDown("body"),
              );
              viewport.removeEventListener("pointerup", handlePointerUp);
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
                {!asPath.includes("/artist") && <col className="w-[200px]" />}

                {/* Rating */}
                <col
                  className={`${asPath.includes("/profile/tabs") ? "w-[141.5px] sm:w-[115.89px]" : asPath.includes("/artist") ? "w-[209.5px] sm:w-[188.63px]" : "w-[159.5px] sm:w-[138.63px]"} `}
                />

                {/* Difficulty */}
                <col
                  className={`${asPath.includes("/profile/tabs") ? "w-[141.5px] sm:w-[115.89px]" : asPath.includes("/artist") ? "w-[209.5px] sm:w-[188.63px]" : "w-[159.5px] sm:w-[138.63px]"} `}
                />

                {/* Genre */}
                <col
                  className={`${asPath.includes("/profile/tabs") ? "w-[141.5px] sm:w-[115.89px]" : asPath.includes("/artist") ? "w-[209.5px] sm:w-[188.63px]" : "w-[159.5px] sm:w-[138.63px]"} `}
                />

                {/* Date */}
                <col
                  className={`${asPath.includes("/profile/tabs") ? "w-[141.5px] sm:w-[115.89px]" : asPath.includes("/artist") ? "w-[209.5px] sm:w-[188.63px]" : "w-[159.5px] sm:w-[138.63px]"} `}
                />

                {/* Bookmark toggle */}
                <col className="w-[72px] sm:!w-[90.95px]" />
              </colgroup>

              <AnimatePresence mode="popLayout">
                <TableBody className="w-full @container">
                  {tabResults.pages.map((page) =>
                    page.data.tabs?.map((tab, index) => (
                      <TableTabRow
                        key={tab.id}
                        minimalTab={tab}
                        currentUser={currentUser}
                        infiniteQueryParams={getInfiniteQueryParams()}
                        theme={theme}
                        ref={
                          index === page.data.tabs.length - 1
                            ? (ref as unknown as React.RefObject<HTMLTableRowElement>)
                            : undefined
                        }
                      />
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
            key={"tableTabViewSpinner"}
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
            customKey={"tableTabViewNoResults"}
            searchQueryExists={Boolean(searchQuery)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TableTabView;
