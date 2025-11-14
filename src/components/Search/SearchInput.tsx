import { AnimatePresence, motion } from "framer-motion";
import debounce from "lodash.debounce";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BiSearchAlt2 } from "react-icons/bi";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { FaArrowLeft } from "react-icons/fa6";
import { api } from "~/utils/api";
import { genreColors, genreDarkColors } from "~/utils/genreColors";
import { Badge } from "~/components/ui/badge";
import { IoIosMusicalNotes } from "react-icons/io";
import { AiOutlineUser } from "react-icons/ai";
import { Separator } from "~/components/ui/separator";
import { useTabStore } from "~/stores/TabStore";
import Verified from "~/components/ui/icons/Verified";
import Link from "next/link";
import Spinner from "~/components/ui/Spinner";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

interface SearchInput {
  setShowMobileSearch?: React.Dispatch<React.SetStateAction<boolean>>;
}

function SearchInput({ setShowMobileSearch }: SearchInput) {
  const { push, query } = useRouter();

  const { theme } = useTabStore((state) => ({
    theme: state.theme,
  }));

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"songs" | "artists">("songs");

  const isAboveLgViewportWidth = useViewportWidthBreakpoint(1024);

  const [showAutofillResults, setShowAutofillResults] = useState(
    isAboveLgViewportWidth === false,
  );
  const [enterButtonBeingPressed, setEnterButtonBeingPressed] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: mostPopularDailyTabsAndArtists,
    isFetching: isFetchingMostPopularDailyTabsAndArtists,
  } = api.search.getMostPopularDailyTabsAndArtists.useQuery();

  const { data: songSearchResults, isFetching: isFetchingSongResults } =
    api.search.getTabTitlesBySearchQuery.useQuery(debouncedSearchQuery, {
      enabled: debouncedSearchQuery.length > 0 && searchType === "songs",
    });

  const { data: artistSearchResults, isFetching: isFetchingArtistResults } =
    api.search.getArtistUsernamesBySearchQuery.useQuery(
      {
        query: debouncedSearchQuery,
      },
      {
        enabled: debouncedSearchQuery.length > 0 && searchType === "artists",
      },
    );

  useEffect(() => {
    setSearchQuery((query.search as string) ?? "");
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Do nothing if the results aren't showing
      if (!showAutofillResults || isAboveLgViewportWidth === false) return;

      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowAutofillResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAutofillResults, isAboveLgViewportWidth]);

  const debouncedSetSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedSearchQuery(query);
      }, 250),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel(); // Cancel any pending executions
    };
  }, [debouncedSetSearch]);

  function adjustQueryParams({
    searchQuery,
    tabId,
    artistId,
  }: {
    searchQuery: string;
    tabId?: number;
    artistId?: number;
  }) {
    setShowAutofillResults(false);
    const encodedSearchQuery = encodeURIComponent(searchQuery.trim());

    if (tabId) {
      void push(`/tab/${tabId}/${encodedSearchQuery}`);
    } else if (searchType === "artists") {
      if (artistId) {
        void push(`/artist/${encodedSearchQuery}/${artistId}/filters`);
      } else {
        void push(`/artist/${encodedSearchQuery}/filters`);
      }
    } else {
      const pathname = "/search/filters";
      const newQuery = {
        ...(encodedSearchQuery && { search: encodedSearchQuery }),
        ...(query.layout && { layout: query.layout }),
      };

      if (Object.keys(newQuery).length > 0) {
        void push({
          pathname: pathname,
          query: newQuery,
        });
      } else {
        void push(pathname);
      }
    }
  }

  return (
    <motion.div
      key={"searchContainer"}
      ref={searchContainerRef}
      initial={{
        width: isAboveLgViewportWidth === false ? "100%" : "95%",
      }}
      animate={{
        width:
          isAboveLgViewportWidth === false
            ? "100%"
            : showAutofillResults
              ? "100%"
              : "98%",
      }}
      transition={{
        ease: "easeOut",
        duration: 0.35,
      }}
      className="baseFlex relative mt-0.5 max-w-lg tablet:mt-0"
    >
      {isAboveLgViewportWidth === false && (
        <Button
          variant={"text"}
          onClick={() => {
            setShowMobileSearch?.(false);
          }}
          className="mx-1"
        >
          <FaArrowLeft className="size-4" />
        </Button>
      )}

      <div
        className={`baseFlex w-full gap-2 bg-background transition-[border-radius] ${isAboveLgViewportWidth ? "rounded-md border" : "rounded-none border-none"} ${showAutofillResults ? "rounded-b-none" : ""}`}
      >
        <Input
          ref={searchInputRef}
          type="text"
          maxLength={50}
          placeholder={`Search for your favorite ${searchType === "songs" ? "songs" : "artists"}...`}
          showFocusState={false}
          autoFocus={isAboveLgViewportWidth === false}
          onFocus={() => {
            setShowAutofillResults(true);
          }}
          onChange={(e) => {
            const query = e.target.value;
            setSearchQuery(query);

            const trimmedQuery = query.trim();
            if (trimmedQuery !== searchQuery) {
              debouncedSetSearch(trimmedQuery);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEnterButtonBeingPressed(true);

              debouncedSetSearch.flush();
              adjustQueryParams({
                searchQuery:
                  searchType === "artists"
                    ? (artistSearchResults?.[0]?.name ?? searchQuery)
                    : searchQuery,
              });
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
          className="z-0 h-10 w-full !scroll-mt-24 border-none text-base !outline-none md:h-11"
        />

        <Button
          variant={"text"}
          onClick={() => {
            debouncedSetSearch.flush();
            adjustQueryParams({
              searchQuery:
                searchType === "artists"
                  ? (artistSearchResults?.[0]?.name ?? searchQuery)
                  : searchQuery,
            });
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
          className={`${enterButtonBeingPressed ? "!brightness-75" : ""}`}
        >
          <BiSearchAlt2 className="mt-1 size-5 tablet:mt-0 tablet:size-6" />
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {/* songs/artists toggle and autofill results */}
        {/* FYI: this is a bit hacky, since "showAutofillResults" doesn't apply to mobile dialog,
            since they are always showing */}
        {(isAboveLgViewportWidth === false ||
          (isAboveLgViewportWidth && showAutofillResults)) && (
          <motion.div
            key={"searchAutofillContainer"}
            id="searchTypeContainer"
            initial={{
              opacity: 0,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.97,
            }}
            transition={{
              duration: 0.2,
            }}
            className={`absolute left-0 z-50 w-full overflow-hidden rounded-md rounded-t-none border-border bg-background ${isAboveLgViewportWidth ? "top-[45px] border !shadow-xl" : "top-11 border-t"}`}
          >
            <div className="baseFlex w-full !justify-between p-2 text-sm">
              <div className="baseFlex gap-3">
                Searching for
                <Button
                  variant={"secondary"}
                  style={{
                    backgroundColor:
                      searchType === "songs" ? "hsl(var(--accent))" : undefined,
                    color:
                      searchType === "songs"
                        ? "hsl(var(--accent-foreground))"
                        : undefined,
                  }}
                  className="baseFlex h-8 shrink-0 gap-2"
                  onClick={() => {
                    setSearchType("songs");
                    setSearchQuery("");
                    setDebouncedSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <IoIosMusicalNotes className="size-5" />
                  Songs
                </Button>
                <Button
                  variant={"secondary"}
                  style={{
                    backgroundColor:
                      searchType === "artists"
                        ? "hsl(var(--accent))"
                        : undefined,
                    color:
                      searchType === "artists"
                        ? "hsl(var(--accent-foreground))"
                        : undefined,
                  }}
                  className="baseFlex h-8 shrink-0 gap-2"
                  onClick={() => {
                    setSearchType("artists");
                    setSearchQuery("");
                    setDebouncedSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <AiOutlineUser className="size-5" />
                  Artists
                </Button>
              </div>

              <AnimatePresence>
                {(isFetchingMostPopularDailyTabsAndArtists ||
                  isFetchingSongResults ||
                  isFetchingArtistResults) && (
                  <motion.div
                    key={"loadingSpinner"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pr-1.5 tablet:pr-3"
                  >
                    <Spinner className="size-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator className="h-[1px] w-full bg-border" />

            <motion.div
              key={"autofillResults"}
              animate={{
                height: "auto",
              }}
              className="baseVertFlex min-h-dvh w-full !justify-start sm:min-h-[250px]"
            >
              {/* no search input and daily popular songs/artists loaded, show popular songs/artists */}
              {searchQuery.trim() === "" &&
                !isFetchingMostPopularDailyTabsAndArtists &&
                mostPopularDailyTabsAndArtists && (
                  <>
                    {searchType === "songs" ? (
                      <motion.div
                        key={"popularSongs"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="baseVertFlex mt-2 w-full !items-start gap-2"
                      >
                        <p className="ml-2 font-medium">Popular Songs</p>
                        <div className="baseVertFlex h-full w-full">
                          {mostPopularDailyTabsAndArtists.tabs.map(
                            (song, idx) => (
                              <Button
                                key={idx}
                                id={`autofillResult${idx}`}
                                tabIndex={-1}
                                variant={"ghost"}
                                asChild
                              >
                                <Link
                                  prefetch={false}
                                  href={`/tab/${song.id}/${encodeURIComponent(
                                    song.title,
                                  )}`}
                                  className="baseVertFlex z-50 !size-full min-h-10 !items-start rounded-none py-2 transition-all"
                                  onClick={() => {
                                    setShowAutofillResults(false);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      adjustQueryParams({
                                        searchQuery: song.title,
                                        tabId: song.id,
                                      });
                                    } else if (e.key === "Escape") {
                                      setShowAutofillResults(false);
                                    } else if (e.key === "ArrowDown") {
                                      e.preventDefault();

                                      const nextResult =
                                        document.getElementById(
                                          `autofillResult${idx + 1}`,
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

                                      const prevResult =
                                        document.getElementById(
                                          `autofillResult${idx - 1}`,
                                        );
                                      if (prevResult) {
                                        prevResult.focus();
                                      }
                                    }
                                  }}
                                >
                                  <div className="baseFlex w-full !justify-between gap-2">
                                    <span className="max-w-[70%] truncate">
                                      {song.title}
                                    </span>
                                    <Badge
                                      style={{
                                        backgroundColor: genreColors
                                          .get(song.genre)
                                          ?.replace(/\)$/, " / 0.7)"),
                                        border: "1px solid",
                                        borderColor: genreColors.get(
                                          song.genre,
                                        ),
                                      }}
                                      className="text-primary-foreground"
                                    >
                                      {song.genre}
                                    </Badge>
                                  </div>

                                  {song.artist.name && (
                                    <div className="baseFlex ml-3 !items-start font-normal">
                                      <div className="mt-1 h-[12px] w-[10px] rounded-bl-lg border border-r-0 border-t-0"></div>
                                      <div className="baseFlex ml-1.5 mt-1 gap-1.5 text-sm">
                                        {song.artist.isVerified && (
                                          <Verified className="size-5" />
                                        )}
                                        {song.artist.name}
                                      </div>
                                    </div>
                                  )}
                                </Link>
                              </Button>
                            ),
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={"popularArtists"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="baseVertFlex mt-2 w-full !items-start gap-2"
                      >
                        <p className="ml-2 font-medium">Popular Artists</p>
                        <div className="baseVertFlex w-full">
                          {mostPopularDailyTabsAndArtists.artists.map(
                            (artist, idx) => (
                              <Button
                                key={idx}
                                id={`autofillResult${idx}`}
                                tabIndex={-1}
                                variant={"ghost"}
                                asChild
                              >
                                <Link
                                  prefetch={false}
                                  href={`/artist/${encodeURIComponent(
                                    artist.name,
                                  )}/${artist.id}/filters`}
                                  className="baseFlex z-50 min-h-10 w-full !justify-start gap-2 rounded-none py-2 transition-all"
                                  onClick={() => {
                                    setShowAutofillResults(false);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      adjustQueryParams({
                                        searchQuery: artist.name,
                                        artistId: artist.id,
                                      });
                                    } else if (e.key === "Escape") {
                                      setShowAutofillResults(false);
                                    } else if (e.key === "ArrowDown") {
                                      e.preventDefault();

                                      const nextResult =
                                        document.getElementById(
                                          `autofillResult${idx + 1}`,
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

                                      const prevResult =
                                        document.getElementById(
                                          `autofillResult${idx - 1}`,
                                        );
                                      if (prevResult) {
                                        prevResult.focus();
                                      }
                                    }
                                  }}
                                >
                                  {artist.isVerified && (
                                    <Verified className="size-5" />
                                  )}

                                  <p className="max-w-[100%] truncate">
                                    {artist.name}
                                  </p>
                                </Link>
                              </Button>
                            ),
                          )}
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

              {/* song query loaded, show autofill results */}
              {searchType === "songs" &&
                searchQuery.trim() !== "" &&
                !isFetchingSongResults &&
                songSearchResults !== undefined && (
                  <>
                    {songSearchResults.length === 0 ? (
                      <motion.p
                        key={"songNoResultsFound"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mt-12 sm:mt-28"
                      >
                        No results found
                      </motion.p>
                    ) : (
                      <>
                        {songSearchResults.map((song, idx) => (
                          <motion.div
                            key={`songAutofillResult${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="baseVertFlex w-full"
                          >
                            <Button
                              key={idx}
                              id={`autofillResult${idx}`}
                              tabIndex={-1}
                              variant={"ghost"}
                              asChild
                            >
                              <Link
                                prefetch={false}
                                href={`/tab/${song.id}/${encodeURIComponent(
                                  song.title,
                                )}`}
                                className="baseVertFlex z-50 !size-full min-h-10 !items-start rounded-none py-2 transition-all"
                                onClick={() => {
                                  setShowAutofillResults(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    adjustQueryParams({
                                      searchQuery: song.title,
                                      tabId: song.id,
                                    });
                                  } else if (e.key === "Escape") {
                                    setShowAutofillResults(false);
                                  } else if (e.key === "ArrowDown") {
                                    e.preventDefault();

                                    const nextResult = document.getElementById(
                                      `autofillResult${idx + 1}`,
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
                                      `autofillResult${idx - 1}`,
                                    );
                                    if (prevResult) {
                                      prevResult.focus();
                                    }
                                  }
                                }}
                              >
                                <div className="baseFlex w-full !justify-between gap-2">
                                  <span className="max-w-[70%] truncate">
                                    {song.title}
                                  </span>
                                  <Badge
                                    style={{
                                      backgroundColor: genreColors
                                        .get(song.genre)
                                        ?.replace(/\)$/, " / 0.7)"),
                                      border: "1px solid",
                                      borderColor: genreColors.get(song.genre),
                                    }}
                                    className="text-primary-foreground"
                                  >
                                    {song.genre}
                                  </Badge>
                                </div>

                                {song.artistName && (
                                  <div className="baseFlex ml-3 !items-start font-normal">
                                    <div className="mt-1 h-[12px] w-[10px] rounded-bl-lg border border-r-0 border-t-0"></div>
                                    <div className="baseFlex ml-1.5 mt-1 gap-1.5 text-sm">
                                      {song.artistIsVerified && (
                                        <Verified className="size-5" />
                                      )}
                                      {song.artistName}
                                    </div>
                                  </div>
                                )}
                              </Link>
                            </Button>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </>
                )}

              {/* artist query loaded, show autofill results */}
              {searchType === "artists" &&
                searchQuery.trim() !== "" &&
                !isFetchingArtistResults &&
                artistSearchResults !== undefined && (
                  <>
                    {artistSearchResults.length === 0 ? (
                      <motion.p
                        key={"artistNoResultsFound"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mt-12 sm:mt-28"
                      >
                        No results found
                      </motion.p>
                    ) : (
                      <>
                        {artistSearchResults.map((artist, idx) => (
                          <motion.div
                            key={`autofillResult${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="baseVertFlex w-full"
                          >
                            <Button
                              key={idx}
                              id={`artistAutofillResult${idx}`}
                              tabIndex={-1}
                              variant={"ghost"}
                              asChild
                            >
                              <Link
                                prefetch={false}
                                href={`/artist/${encodeURIComponent(
                                  artist.name,
                                )}/${artist.id}/filters`}
                                className="baseFlex z-50 min-h-10 w-full !justify-start gap-2 rounded-none py-2 transition-all"
                                onClick={() => {
                                  setShowAutofillResults(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    adjustQueryParams({
                                      searchQuery: artist.name,
                                      artistId: artist.id,
                                    });
                                  } else if (e.key === "Escape") {
                                    setShowAutofillResults(false);
                                  } else if (e.key === "ArrowDown") {
                                    e.preventDefault();

                                    const nextResult = document.getElementById(
                                      `autofillResult${idx + 1}`,
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
                                      `autofillResult${idx - 1}`,
                                    );
                                    if (prevResult) {
                                      prevResult.focus();
                                    }
                                  }
                                }}
                              >
                                {artist.isVerified && (
                                  <Verified className="size-5" />
                                )}

                                <p className="max-w-[100%] truncate">
                                  {artist.name}
                                </p>
                              </Link>
                            </Button>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SearchInput;
