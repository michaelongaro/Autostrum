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

interface GridTabView {
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
    threshold: 0.75,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetching) {
        void fetchNextPage();
      }
    },
  });

  return (
    <div className="baseVertFlex relative size-full min-h-[calc(100dvh-4rem-6rem-56px-60px)] !justify-start @container md:min-h-[calc(100dvh-4rem-12rem-56px-60px)]">
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

        <SearchResultsSpinner
          hasResults={Boolean(tabResults?.pages[0]?.data.tabs.length)}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
        />

        {/* no results */}
        {!isFetching && tabResults?.pages?.[0]?.data.tabs.length === 0 && (
          <div className="baseFlex grow">
            <NoResultsFound
              customKey={"gridTabViewNoResults"}
              searchQuery={searchQuery}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GridTabView;
