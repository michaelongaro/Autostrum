import { useState, useMemo, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { debounce } from "lodash";
import { Badge } from "../ui/badge";

interface Layout {
  children: ReactNode;
}

// we really want to include user search as well, so in autocomplete results we prob need to have a badge
// next to each result that either says "artist" or "tab" to clarify. <- shadcnui badge?

// ^ then for results page we should toggles for "artist", "tab" <- defaulting to "tab"
// I am pretty sure we can get both tab and artist to fit in same footprint of card,

// Overarching goals:

// shared layout for all search related components/pages: with parent being just glassmorphic body
// and search bar on top

// genre selector moving from next to search bar to inline with filters (under "genre"), add "all" option
// as first option. obv default to "all" if url looks like /explore/query

// will be a bit interesting on how to for example sort by most likes, like how to structure query exactly

// pretty sure that you can use this layout for every component with a searchbar
// ^ actually on profile tabs/likes I believe you can only have one layout per component so you may need to create a new layout that is
//   the profile nav wrapped around this and then apply that to tabs/likes pages

// pretty sure that switching any filter will result in a new query being made, which is kind of just the way it is

function ExploreLayout({ children }: Layout) {
  const { push } = useRouter();

  // ideally we would want the input "xylophonic" to return a tab with the title of "xylo", but I think prisma will only
  // return exact substring matches. might have make some manual solution for this behavior.

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const [artificallyShowLoadingSpinner, setArtificallyShowLoadingSpinner] =
    useState(false);

  const {
    data: tabTitlesAndUsernamesFromSearchQuery,
    isLoading: isLoadingTabTitles,
  } =
    api.tab.getTabTitlesAndUsernamesBySearchQuery.useQuery(
      debouncedSearchQuery
    );

  return (
    // definitely improve responsiveness of this layout
    <motion.div
      key={"exploreLayout"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="lightGlassmorphic baseVertFlex my-24 w-10/12 rounded-md p-2 md:w-3/4 md:p-8"
    >
      <div className="baseFlex gap-4">
        <div className="relative">
          <Input
            placeholder="Search for your favorite tabs and artists"
            onChange={(e) => {
              const query = e.target.value;

              const trimmedQuery = query.trim();
              console.log(trimmedQuery, searchQuery);
              if (trimmedQuery !== searchQuery) {
                debounce(() => {
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
            value={searchQuery}
            className="h-9 w-80 text-base md:h-12 md:w-96 md:text-lg"
          />

          {/* autofill */}
          <AnimatePresence mode="wait">
            {/* not sure if this is cleanest approach */}
            {searchQuery.length > 0 && debouncedSearchQuery.length > 0 && (
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
                      <p className="w-full rounded-md p-2">No results found</p>
                    ) : (
                      <>
                        {tabTitlesAndUsernamesFromSearchQuery?.map(
                          (data, idx) => (
                            <p
                              key={idx}
                              className="baseFlex w-full cursor-pointer !justify-start gap-2 rounded-md p-2 transition-all hover:bg-accent-foreground"
                              onClick={() =>
                                void push(`/explore/${searchQuery}`)
                              }
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
                            </p>
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

        {/* may need to sanitize, turning spaces into %20% or whatever */}

        {/* I really don't like how if you have a <Button><Link> setup, they are treated as two separate things, I feel like you should make a 
              custom class to apply to <Link>s that make them look exactly like buttons, but can click the whole thing and tabbing will just highlight the link! */}

        <Button onClick={() => void push(`/explore/${searchQuery}`)}>
          Search
        </Button>
      </div>

      <div className="min-h-[100dvh] w-full">
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ExploreLayout;
