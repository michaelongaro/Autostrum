import React from "react";
import { api } from "~/utils/api";

interface SearchResults {
  searchQuery: string;
  filters: {
    genreId?: number;
    type: "tab" | "artist" | null;
    view: "grid" | "table";
    // maybe split into two enums, one for type and one for the direction
    sort:
      | "descDate"
      | "ascDate"
      | "descAlphabetical"
      | "ascAlphabetical"
      | "descLikes"
      | "ascLikes";
  };
}

// don't forget that [...query] means that you are going to be adding
// onto query the criteria to sort by! for example somehting like
// "/sunshine?sort=ascLikes" or "/sunshine?sort=descAlphabetical"
// again defaulting to descDate to show newest ones

// also don't forget that if full redirect to new page takes too long, we can almost
// definitely just push the new url into the browser history and it should be exactly
// the same effect

// we are moving to "manual" counting of likes + # of tabs, so we will need to add this sorting logic
// to trpc functions

function SearchResults({
  searchQuery,
  filters: { genreId, type, view, sort },
}: SearchResults) {
  // do query below based on searchQuery + filters (should return either tabs[] or users[])
  const { data: tabResults, isLoading: isLoadingTabResults } =
    api.tab.getTabsBySearch.useQuery(type === "tab" ? searchQuery : "");

  const { data: artistResults, isLoading: isLoadingArtistResults } =
    api.tab.getTabsBySearch.useQuery(type === "tab" ? searchQuery : "");

  // worry about skeletons later!

  return (
    // prob better practice to let parent component decide vertical margin/padding
    // rather than do it here.
    <div className="baseVertFlex w-full rounded-md border-2 border-pink-950">
      {/* # of results + sorting options */}
      <div className="baseVertFlex w-full bg-pink-950 px-4 py-8 md:flex-row md:!justify-between"></div>

      {/* card view */}

      {/* table view */}
    </div>
  );
}

export default SearchResults;
