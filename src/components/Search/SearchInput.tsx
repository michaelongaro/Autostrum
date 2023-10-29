import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import debounce from "lodash.debounce";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { BiSearchAlt2 } from "react-icons/bi";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import { genreList } from "~/utils/genreList";
import { Badge } from "../ui/badge";

interface SearchInput {
  initialSearchQueryFromUrl?: string;
}

function SearchInput({ initialSearchQueryFromUrl }: SearchInput) {
  const { userId } = useAuth();
  const { push, query, asPath, pathname } = useRouter();

  const [searchQuery, setSearchQuery] = useState(
    initialSearchQueryFromUrl ?? ""
  );

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  useEffect(() => {
    if (initialSearchQueryFromUrl) {
      setSearchQuery(initialSearchQueryFromUrl);
    }
  }, [initialSearchQueryFromUrl]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [enterButtonBeingPressed, setEnterButtonBeingPressed] = useState(false);
  const [showAutofillResults, setShowAutofillResults] = useState(false);
  const [artificallyShowLoadingSpinner, setArtificallyShowLoadingSpinner] =
    useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: artistProfileBeingViewed } =
    api.artist.getByIdOrUsername.useQuery(
      {
        username: query.username as string,
      },
      {
        enabled: !!query.username,
      }
    );

  const {
    data: tabTitlesAndUsernamesFromSearchQuery,
    isLoading: isLoadingResults,
  } = api.tab.getTabTitlesAndUsernamesBySearchQuery.useQuery(
    {
      query: debouncedSearchQuery,
      includeUsernames: asPath.includes("/explore"),
      likedByUserId: asPath.includes("/likes") && userId ? userId : undefined,
      userIdToSelectFrom:
        asPath.includes("/tabs") && userId
          ? userId
          : typeof query.username === "string"
          ? artistProfileBeingViewed?.userId
          : undefined,
    },
    {
      enabled: debouncedSearchQuery.length > 0,
    }
  );

  function adjustQueryParams(type: "tabs" | "artists", searchQuery: string) {
    setShowAutofillResults(false);

    const prevQuery = { ...query };

    delete prevQuery.genreId;

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

    void push({
      pathname:
        asPath.includes("/explore") && !asPath.includes("filters")
          ? `${pathname}/filters`
          : pathname,
      query: {
        ...prevQuery,
      },
    });
  }

  function getPlaceholderTextBasedOnParams() {
    if (asPath.includes("/preferences") || asPath.includes("/tabs")) {
      return "Search through your tabs";
    } else if (asPath.includes("/likes")) {
      return "Search for tabs you've liked";
    } else if (asPath.includes("/artist")) {
      return `Search through ${
        artistProfileBeingViewed?.username ?? ""
      }'s tabs`;
    } else {
      return "Search for your favorite tabs and artists";
    }
  }

  return (
    <div className="baseFlex gap-4">
      <div className="relative">
        <BiSearchAlt2 className="absolute left-2 top-[0.72rem] h-5 w-5 md:left-[0.7rem] md:top-[0.8rem] md:h-6 md:w-6" />
        <Input
          ref={searchInputRef}
          type="text"
          maxLength={30}
          placeholder={getPlaceholderTextBasedOnParams()}
          onFocus={() => {
            searchInputRef.current?.scrollIntoView({
              behavior: "smooth",
            });

            if (debouncedSearchQuery.length > 0) {
              setShowAutofillResults(true);
            }
          }}
          onBlur={() => {
            // was focusing <body> without this timeout when clicking on an autofill
            // result...
            setTimeout(() => {
              if (!document.activeElement?.id?.startsWith("autofillResult")) {
                setShowAutofillResults(false);
              }
            }, 0);
          }}
          onChange={(e) => {
            const query = e.target.value;

            const trimmedQuery = query.trim();
            if (trimmedQuery !== searchQuery) {
              debounce(() => {
                setDebouncedSearchQuery(trimmedQuery);
                if (trimmedQuery.length > 0) {
                  setShowAutofillResults(true);
                }
                setArtificallyShowLoadingSpinner(true);
                setTimeout(() => setArtificallyShowLoadingSpinner(false), 250);
              }, 250)();
            }

            setSearchQuery(query);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEnterButtonBeingPressed(true);

              adjustQueryParams(
                // response order is tabs and then artists, so if the first result is an artist,
                // we know that's the only type of result we have
                tabTitlesAndUsernamesFromSearchQuery?.[0]?.type === "username"
                  ? "artists"
                  : "tabs",
                searchQuery
              );
            } else if (e.key === "Escape") {
              setShowAutofillResults(false);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();

              const firstResult = document.getElementById("autofillResult0");
              if (firstResult) {
                firstResult.focus();
              }
            } else if (debouncedSearchQuery.length > 0) {
              setShowAutofillResults(true);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              setEnterButtonBeingPressed(false);
            }
          }}
          value={searchQuery}
          className="searchInputBoxShadow h-10 w-80 !scroll-mt-24 border-2 pl-8 text-sm focus-within:shadow-lg md:h-12 md:w-[25rem] md:pl-10 md:text-lg"
        />

        {/* autofill */}
        <AnimatePresence mode="wait">
          {showAutofillResults &&
            searchQuery.length > 0 &&
            debouncedSearchQuery.length > 0 && (
              <motion.div
                key={"searchAutofill"}
                initial={{
                  opacity: 0,
                  top: isAboveMediumViewportWidth ? "3rem" : "2.15rem",
                }}
                animate={{
                  opacity: 1,
                  top: isAboveMediumViewportWidth ? "3.5rem" : "2.75rem",
                }}
                exit={{
                  opacity: 0,
                  top: isAboveMediumViewportWidth ? "3rem" : "2.15rem",
                }}
                transition={{ duration: 0.25 }}
                className="mobileNavbarGlassmorphic absolute z-10 w-full rounded-md !shadow-xl"
              >
                {artificallyShowLoadingSpinner || isLoadingResults ? (
                  <div className="baseFlex w-full gap-4 py-4">
                    <p>Loading</p>
                    <svg
                      className="h-6 w-6 animate-stableSpin rounded-full bg-inherit fill-none"
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
                    {tabTitlesAndUsernamesFromSearchQuery === null ||
                    tabTitlesAndUsernamesFromSearchQuery?.length === 0 ? (
                      <p className="w-full p-2 text-center">No results found</p>
                    ) : (
                      <>
                        {tabTitlesAndUsernamesFromSearchQuery?.map(
                          (data, idx) => (
                            <div
                              key={idx}
                              id={`autofillResult${idx}`}
                              tabIndex={-1}
                              className="baseFlex w-full cursor-pointer !justify-start gap-2 rounded-md p-2 transition-all focus-within:bg-pink-500 hover:bg-pink-500"
                              onFocus={() => {
                                if (debouncedSearchQuery.length > 0) {
                                  setShowAutofillResults(true);
                                }
                              }}
                              onBlur={() => {
                                setShowAutofillResults(false);
                              }}
                              onClick={() => {
                                adjustQueryParams(
                                  // response order is tabs and then artists, so if the first result is an artist,
                                  // we know that's the only type of result we have
                                  data.type === "title" ? "tabs" : "artists",
                                  data.type === "title"
                                    ? data.value.title
                                    : data.value
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  adjustQueryParams(
                                    // response order is tabs and then artists, so if the first result is an artist,
                                    // we know that's the only type of result we have
                                    data.type === "title" ? "tabs" : "artists",
                                    data.type === "title"
                                      ? data.value.title
                                      : data.value
                                  );
                                } else if (e.key === "Escape") {
                                  setShowAutofillResults(false);
                                } else if (e.key === "ArrowDown") {
                                  e.preventDefault();

                                  const nextResult = document.getElementById(
                                    `autofillResult${idx + 1}`
                                  );
                                  if (nextResult) {
                                    nextResult.focus();
                                  }
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();

                                  if (idx === 0) {
                                    searchInputRef.current?.focus();
                                    return;
                                  }

                                  const prevResult = document.getElementById(
                                    `autofillResult${idx - 1}`
                                  );
                                  if (prevResult) {
                                    prevResult.focus();
                                  }
                                }
                              }}
                            >
                              <div className="w-[70px]">
                                <Badge
                                  style={{
                                    backgroundColor:
                                      data.type === "title"
                                        ? genreList[data.value.genreId]?.color
                                        : "hsl(142, 71%, 45%)",
                                  }}
                                  className=""
                                >
                                  {data.type === "title"
                                    ? genreList[data.value.genreId]?.name ?? ""
                                    : "Artist"}
                                </Badge>
                              </div>

                              <p className="max-w-[70%] truncate">
                                {data.type === "title"
                                  ? data.value.title ?? ""
                                  : data.value}
                              </p>
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
          adjustQueryParams(
            // response order is tabs and then artists, so if the first result is an artist,
            // we know that's the only type of result we have
            tabTitlesAndUsernamesFromSearchQuery?.[0]?.type === "username"
              ? "artists"
              : "tabs",
            searchQuery
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEnterButtonBeingPressed(true);
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            setEnterButtonBeingPressed(false);
          }
        }}
        className={`hidden shadow-sm md:block ${
          enterButtonBeingPressed ? "!brightness-75" : ""
        }`}
      >
        Search
      </Button>
    </div>
  );
}

export default SearchInput;
