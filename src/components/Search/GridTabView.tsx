import type { InfiniteData } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import type {
  InfiniteQueryParams,
  MinimalTabRepresentation,
} from "~/server/api/routers/search";
import type { UserMetadata } from "~/server/api/routers/user";
import type { COLORS, THEME } from "~/stores/TabStore";
import GridTabCard from "./GridTabCard";
import NoResultsFound from "./NoResultsFound";
import SearchResultsSpinner from "./SearchResultsSpinner";
import TabCardSkeleton from "./TabCardSkeleton";

const gridClassName =
  "grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,330px),1fr))] place-items-center gap-4 p-4";

interface GridTabView {
  active: boolean;
  showInitialSkeleton: boolean;
  searchQuery?: string;
  tabResults:
    | InfiniteData<{
        data: {
          tabs: MinimalTabRepresentation[];
          nextCursor: number | null;
        };
        count: number;
      }>
    | undefined;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  getInfiniteQueryParams: () => InfiniteQueryParams;
  currentUser: UserMetadata | null | undefined;
  color: COLORS;
  theme: THEME;
}

function GridTabView({
  active,
  showInitialSkeleton,
  searchQuery,
  tabResults,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  getInfiniteQueryParams,
  currentUser,
  color,
  theme,
}: GridTabView) {
  const { ref } = useInView({
    skip: !active,
    threshold: 0.75,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetching) {
        void fetchNextPage();
      }
    },
  });

  return (
    // Preserve decoded screenshots and their paint state through layout changes.
    <div hidden={!active}>
      <div className="baseVertFlex relative size-full min-h-[calc(100dvh-4rem-6rem-56px-60px)] !justify-start @container md:min-h-[calc(100dvh-4rem-12rem-56px-60px)]">
        <AnimatePresence mode="popLayout">
          {showInitialSkeleton && (
            <div
              aria-hidden="true"
              key="skeleton"
              className={`${gridClassName} !hidden lg:!grid`}
            >
              <TabCardSkeleton uniqueKey="search-card-first" />
              <div className="hidden @[708px]:block">
                <TabCardSkeleton uniqueKey="search-card-second" />
              </div>
              <div className="hidden @[1054px]:block">
                <TabCardSkeleton uniqueKey="search-card-third" />
              </div>
            </div>
          )}
          {tabResults && tabResults.pages[0]?.count !== 0 && (
            <div
              key="results"
              data-search-grid=""
              style={{ gridAutoRows: "minmax(min-content, max-content)" }}
              className={gridClassName}
            >
              {tabResults.pages.map((page, pageIndex) =>
                page.data.tabs.map((tab, index) => (
                  <GridTabCard
                    key={tab.id}
                    active={active}
                    minimalTab={tab}
                    eagerScreenshot={active && pageIndex === 0 && index < 9}
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

          <div
            key="loading"
            className={showInitialSkeleton ? "contents lg:hidden" : "contents"}
          >
            <SearchResultsSpinner
              hasResults={Boolean(tabResults?.pages[0]?.data.tabs.length)}
              hasNextPage={hasNextPage}
              isFetching={isFetching}
              isFetchingNextPage={isFetchingNextPage}
            />
          </div>

          {/* no results */}
          {!isFetching && tabResults?.pages?.[0]?.data.tabs.length === 0 && (
            <div key="empty" className="baseFlex grow">
              <NoResultsFound
                customKey={"gridTabViewNoResults"}
                searchQuery={searchQuery}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default GridTabView;
