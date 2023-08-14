import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { debounce } from "lodash";
import { useRouter } from "next/router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { Badge } from "../ui/badge";

interface SearchInput {
  initialSearchQueryFromUrl?: string;
}

function SearchInput({ initialSearchQueryFromUrl }: SearchInput) {
  const { push, query, asPath, pathname } = useRouter();

  const [searchQuery, setSearchQuery] = useState(
    initialSearchQueryFromUrl ?? ""
  );

  useEffect(() => {
    if (initialSearchQueryFromUrl) {
      setSearchQuery(initialSearchQueryFromUrl);
    }
  }, [initialSearchQueryFromUrl]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const [hidingAutofillResults, setHidingAutofillResults] = useState(false);
  const [artificallyShowLoadingSpinner, setArtificallyShowLoadingSpinner] =
    useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: tabTitlesAndUsernamesFromSearchQuery,
    isLoading: isLoadingTabTitles,
  } = api.tab.getTabTitlesAndUsernamesBySearchQuery.useQuery(
    {
      query: debouncedSearchQuery,
      includeUsernames: asPath.includes("/explore"),
    },
    {
      enabled: debouncedSearchQuery.length > 0,
    }
  );

  function adjustQueryParams(type: "tabs" | "artists", searchQuery: string) {
    const prevQuery = { ...query };
    if (type === "artists" && query.genreId) {
      delete prevQuery.genreId;
    }
    if (type === "artists") {
      prevQuery.type = "artists";
    } else {
      delete prevQuery.type;
    }

    if (searchQuery.length === 0) {
      delete prevQuery.search;
    } else {
      prevQuery.search = searchQuery;
    }

    void push(
      {
        pathname:
          asPath.includes("/explore") && !asPath.includes("filters")
            ? `${pathname}/filters`
            : pathname,
        query: {
          ...prevQuery,
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
    <div className="baseFlex gap-4">
      <div className="relative">
        <Input
          ref={searchInputRef}
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
                setTimeout(() => setArtificallyShowLoadingSpinner(false), 250);
              }, 250)();
            }

            setSearchQuery(query);
          }}
          onKeyDown={(e) => {
            if (
              document.activeElement === searchInputRef.current &&
              e.key === "Enter"
            ) {
              // TODO: probably also want to darken search button on enter down
              // and then lighten on enter up

              setHidingAutofillResults(true);

              adjustQueryParams(
                // response order is tabs and then artists, so if the first result is an artist,
                // we know that's the only type of result we have
                tabTitlesAndUsernamesFromSearchQuery?.[0]?.type === "username"
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
                className="mobileNavbarGlassmorphic absolute z-10 w-full rounded-md !shadow-xl"
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
                      <p className="w-full rounded-md p-2">No results found</p>
                    ) : (
                      <>
                        {tabTitlesAndUsernamesFromSearchQuery?.map(
                          (data, idx) => (
                            <div
                              key={idx}
                              className="baseFlex w-full cursor-pointer !justify-start gap-2 rounded-md p-2 transition-all hover:bg-pink-500"
                              onClick={() => {
                                setHidingAutofillResults(true);
                                adjustQueryParams(
                                  // response order is tabs and then artists, so if the first result is an artist,
                                  // we know that's the only type of result we have
                                  data.type === "title" ? "tabs" : "artists",
                                  data.value
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
  );
}

export default SearchInput;
