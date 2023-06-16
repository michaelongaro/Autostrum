import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { debounce } from "lodash";
import { Badge } from "../ui/badge";
import { BiErrorCircle } from "react-icons/bi";

interface Layout {
  children: ReactNode;
}

// pretty sure that you can use this layout for every component with a searchbar
// ^ actually on profile tabs/likes I believe you can only have one layout per component so you may need to create a new layout that is
//   the profile nav wrapped around this and then apply that to tabs/likes pages

function ExploreLayout({ children }: Layout) {
  const { push, query, asPath, pathname } = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [serve404Page, setServe404Page] = useState(false);

  const [hidingAutofillResults, setHidingAutofillResults] = useState(false);
  const [artificallyShowLoadingSpinner, setArtificallyShowLoadingSpinner] =
    useState(false);

  const {
    data: tabTitlesAndUsernamesFromSearchQuery,
    isLoading: isLoadingTabTitles,
  } =
    api.tab.getTabTitlesAndUsernamesBySearchQuery.useQuery(
      debouncedSearchQuery
    );

  // maybe useLayoutEffect if this is causing a flicker
  useEffect(() => {
    // may need to extract this to a separate function and call it both here and in
    // [...filteredQuery] index.tsx
    if (Object.keys(query).length === 0) return;

    const { filteredQuery, ...queryObj } = query;

    const validQueryKeys = [
      "genreId",
      "type",
      "search",
      "relevance",
      "sort",
      "view",
    ];

    for (const key of Object.keys(queryObj)) {
      if (!validQueryKeys.includes(key)) {
        setServe404Page(true);
        return;
      }
    }

    for (const [key, value] of Object.entries(queryObj)) {
      switch (key) {
        case "genreId":
          if (
            typeof value === "string" &&
            (isNaN(parseInt(value)) ||
              parseInt(value) < 1 ||
              parseInt(value) > 9)
          ) {
            setServe404Page(true);
            return;
          }
          break;
        case "type":
          if (
            typeof value === "string" &&
            value !== "tabs" &&
            value !== "artists"
          ) {
            setServe404Page(true);
            return;
          }
          break;
        case "search":
          if (typeof value === "string" && value.length > 30) {
            setServe404Page(true);
            return;
          }
          break;
        case "relevance":
          if (
            typeof value === "string" &&
            value !== "true" &&
            value !== "false"
          ) {
            setServe404Page(true);
            return;
          }
          break;
        case "sort":
          if (
            typeof value === "string" &&
            value !== "newest" &&
            value !== "oldest" &&
            value !== "leastLiked" &&
            value !== "mostLiked"
          ) {
            setServe404Page(true);
            return;
          }
          break;
        case "view":
          if (
            typeof value === "string" &&
            value !== "grid" &&
            value !== "table"
          ) {
            setServe404Page(true);
            return;
          }
          break;
      }
    }
  }, [query]);

  function adjustQueryParams(type: "tabs" | "artists", searchQuery: string) {
    // provide sensible default fallbacks if params aren't defined
    const queryParamsWithDefaults = {
      genreId: type === "tabs" && query.genreId ? query.genreId : "9",
      type: type,
      search: searchQuery,
      relevance: query.relevance ?? "true",
      sort: query.sort ?? "mostLiked",
      view: query.view ?? "grid", // should eventually pull + prefer userMetadata preference!
    };

    void push(
      {
        pathname: asPath.includes("filters") ? pathname : `${pathname}/filters`,
        query: {
          ...query,
          ...queryParamsWithDefaults,
        },
      },
      undefined,
      {
        scroll: false, // defaults to true but try both
        shallow: true,
      }
    );
  }

  return (
    // definitely improve responsiveness of this layout
    <motion.div
      key={"exploreLayout"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // TODO: have width be dynamic so that 404 section isn't basically the full width of screen
      className="lightGlassmorphic baseVertFlex my-24 w-10/12 rounded-md p-2 md:w-3/4 md:p-8"
    >
      {serve404Page ? (
        <div className="baseVertFlex gap-2 px-8 py-4 md:gap-4">
          <div className="baseFlex gap-4 text-2xl font-bold">
            404 Error <BiErrorCircle className="h-8 w-8" />
          </div>
          <div className="text-lg">Page not found</div>
          <div className="mt-8">
            Please check your URL for any typos and try again.
          </div>
        </div>
      ) : (
        <>
          <div className="baseFlex gap-4">
            <div className="relative">
              <Input
                type="text"
                maxLength={30}
                placeholder="Search for your favorite tabs and artists"
                onChange={(e) => {
                  const query = e.target.value;

                  const trimmedQuery = query.trim();
                  if (trimmedQuery !== searchQuery) {
                    debounce(() => {
                      setHidingAutofillResults(false);
                      setDebouncedSearchQuery(trimmedQuery);
                      setArtificallyShowLoadingSpinner(true);
                      setTimeout(
                        () => setArtificallyShowLoadingSpinner(false),
                        250
                      );
                    }, 250)();
                  }

                  setSearchQuery(query);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setHidingAutofillResults(true);

                    adjustQueryParams(
                      // response order is tabs and then artists, so if the first result is an artist,
                      // we know that's the only type of result we have
                      tabTitlesAndUsernamesFromSearchQuery?.[0]?.type ===
                        "username"
                        ? "artists"
                        : "tabs",
                      searchQuery
                    );
                  }
                }}
                value={searchQuery}
                className="h-9 w-80 text-base md:h-12 md:w-96 md:text-lg"
              />

              {/* autofill */}
              <AnimatePresence mode="wait">
                {/* not sure if this is cleanest approach */}
                {!hidingAutofillResults &&
                  searchQuery.length > 0 &&
                  debouncedSearchQuery.length > 0 && (
                    <motion.div
                      key={"searchAutofill"}
                      initial={{ opacity: 0, top: "3rem" }}
                      animate={{ opacity: 1, top: "3.5rem" }}
                      exit={{ opacity: 0, top: "3rem" }}
                      transition={{ duration: 0.25 }}
                      className="lightestGlassmorphic absolute w-full rounded-md"
                    >
                      {artificallyShowLoadingSpinner || isLoadingTabTitles ? (
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
                      ) : (
                        <>
                          {tabTitlesAndUsernamesFromSearchQuery === null ? (
                            <p className="w-full rounded-md p-2">
                              No results found
                            </p>
                          ) : (
                            <>
                              {tabTitlesAndUsernamesFromSearchQuery?.map(
                                (data, idx) => (
                                  <div
                                    key={idx}
                                    className="baseFlex w-full cursor-pointer !justify-start gap-2 rounded-md p-2 transition-all hover:bg-pink-900"
                                    onClick={() => {
                                      setHidingAutofillResults(true);
                                      adjustQueryParams(
                                        // response order is tabs and then artists, so if the first result is an artist,
                                        // we know that's the only type of result we have
                                        data.type === "title"
                                          ? "tabs"
                                          : "artists",
                                        searchQuery
                                      );
                                    }}
                                  >
                                    <Badge
                                      className={`${
                                        data.type === "title"
                                          ? "bg-blue-500"
                                          : "bg-green-500"
                                      }`}
                                    >
                                      {data.type === "title" ? "Tab" : "Artist"}
                                    </Badge>
                                    {data.value}
                                  </div>
                                )
                              )}
                            </>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* TODO: I really don't like how if you have a <Button><Link> setup, they are treated as two separate things, I feel like you should make a 
              custom class to apply to <Link>s that make them look exactly like buttons, but can click the whole thing and tabbing will just highlight the link! */}

            <Button
              onClick={() => {
                setHidingAutofillResults(true);

                adjustQueryParams(
                  // response order is tabs and then artists, so if the first result is an artist,
                  // we know that's the only type of result we have
                  tabTitlesAndUsernamesFromSearchQuery?.[0]?.type === "username"
                    ? "artists"
                    : "tabs",
                  searchQuery
                );
              }}
            >
              Search
            </Button>
          </div>

          <div className="min-h-[100dvh] w-full">
            <AnimatePresence mode="wait">{children}</AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default ExploreLayout;
