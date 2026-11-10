import type { InfiniteData } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useLayoutEffect, useRef, type RefObject, type UIEvent } from "react";
import { useInView } from "react-intersection-observer";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type {
  InfiniteQueryParams,
  MinimalTabRepresentation,
} from "~/server/api/routers/search";
import type { UserMetadata } from "~/server/api/routers/user";
import NoResultsFound from "./NoResultsFound";
import TableTabRow from "./TableTabRow";
import SearchResultsSpinner from "./SearchResultsSpinner";
import styles from "./SearchResults.module.css";

interface TableTabView {
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
  stickyToolbarRef: RefObject<HTMLDivElement | null>;
  asPath: string;
}

function TableTabView({
  searchQuery,
  tabResults,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  getInfiniteQueryParams,
  currentUser,
  stickyToolbarRef,
  asPath,
}: TableTabView) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headingStripRef = useRef<HTMLDivElement>(null);
  const headings = [
    ...(asPath.includes("/profile/tabs")
      ? [{ label: "Edit", hidden: true }]
      : []),
    { label: "Title" },
    ...(!asPath.includes("/artist") ? [{ label: "Artist" }] : []),
    { label: "Rating" },
    { label: "Difficulty" },
    { label: "Genre" },
    { label: "Date" },
    { label: "Bookmark", hidden: true },
  ];

  function syncLegacyHeadingPan(event: UIEvent<HTMLDivElement>) {
    // Safari before CSS scroll timelines still gets native vertical sticking.
    // Only its horizontal heading offset needs an event; page scroll is untouched.
    if (
      !CSS.supports("animation-timeline: scroll()") &&
      headingStripRef.current
    ) {
      headingStripRef.current.style.transform = `translateX(${-event.currentTarget.scrollLeft}px)`;
    }
  }
  const hasRows = Boolean(tabResults?.pages[0]?.data.tabs.length);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const table = tableRef.current;
    const header = headerRef.current;
    const toolbar = stickyToolbarRef.current;
    const scroller = scrollerRef.current;
    if (!track || !table || !header || !toolbar || !scroller) return;

    // Observe layout sizes only. Vertical sticking is always handled by CSS.
    const measure = () => {
      const stickyTop =
        parseFloat(getComputedStyle(toolbar).top) +
        toolbar.getBoundingClientRect().height;
      track.style.setProperty("--table-sticky-top", `${stickyTop}px`);
      track.style.setProperty(
        "--table-columns",
        [...header.querySelectorAll("th")]
          .map((cell) => `${cell.getBoundingClientRect().width}px`)
          .join(" "),
      );
      track.style.setProperty(
        "--table-horizontal-travel",
        `${Math.min(0, scroller.clientWidth - scroller.scrollWidth)}px`,
      );
      if (
        !CSS.supports("animation-timeline: scroll()") &&
        headingStripRef.current
      ) {
        headingStripRef.current.style.transform = `translateX(${-scroller.scrollLeft}px)`;
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    observer.observe(scroller);
    observer.observe(header);
    observer.observe(toolbar);
    measure();
    return () => observer.disconnect();
  }, [hasRows, stickyToolbarRef]);

  const { ref } = useInView({
    threshold: 0.25,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetching) {
        void fetchNextPage();
      }
    },
  });

  return (
    <div className="baseVertFlex relative min-h-[calc(100dvh-4rem-6rem-56px-60px-45px)] w-full !justify-start gap-4 transition-all md:min-h-[calc(100dvh-4rem-12rem-56px-60px-45px)]">
      {tabResults && tabResults.pages[0]?.count !== 0 && (
        <div
          ref={trackRef}
          data-search-table=""
          className={`w-full ${styles.tableTrack}`}
        >
          {/* Safari's overflow wrapper cannot support page-sticky descendants.
              This non-interactive presentation reuses the real table's columns;
              the actual thead remains in the single accessible table below. */}
          <div
            data-table-headings=""
            className={styles.compatibilityHeader}
            aria-hidden="true"
          >
            <div ref={headingStripRef} className={styles.headingStrip}>
              {headings.map((heading) => (
                <div key={heading.label} className="flex h-8 items-center px-4">
                  {"hidden" in heading ? null : heading.label}
                </div>
              ))}
            </div>
          </div>
          <div
            ref={scrollerRef}
            className={styles.tableScroller}
            onScroll={syncLegacyHeadingPan}
          >
            <div className="relative w-[1160px] sm:w-[1158px]">
              <Table ref={tableRef} className="table-fixed">
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
                  <col className="w-[72px] sm:!w-[88.95px]" />
                </colgroup>

                <TableHeader
                  ref={headerRef}
                  className={`bg-panel ${styles.tableHeader}`}
                >
                  <TableRow className="hover:bg-panel">
                    {headings.map((heading) => (
                      <TableHead
                        key={heading.label}
                        scope="col"
                        className="h-8 px-4 py-1 text-inherit"
                      >
                        {"hidden" in heading ? (
                          <span className="sr-only">{heading.label}</span>
                        ) : (
                          heading.label
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody className="w-full @container">
                  {tabResults.pages.map((page) =>
                    page.data.tabs?.map((tab, index) => (
                      <TableTabRow
                        key={tab.id}
                        minimalTab={tab}
                        currentUser={currentUser}
                        infiniteQueryParams={getInfiniteQueryParams()}
                        ref={
                          index === page.data.tabs.length - 1
                            ? (ref as unknown as React.RefObject<HTMLTableRowElement>)
                            : undefined
                        }
                      />
                    )),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      <SearchResultsSpinner
        hasResults={Boolean(tabResults?.pages[0]?.data.tabs.length)}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
      />

      <AnimatePresence mode="popLayout">
        {/* no results */}
        {!isFetching && tabResults?.pages?.[0]?.data.tabs.length === 0 && (
          <div className="baseFlex grow">
            <NoResultsFound
              customKey={"tableTabViewNoResults"}
              searchQuery={searchQuery}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TableTabView;
