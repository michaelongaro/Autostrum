import { useRouter } from "next/router";
import React from "react";
import { api } from "~/utils/api";

interface SearchResults {
  genreId?: number;
  type?: "tabs" | "artists";
  searchQuery?: string;
  sortByRelevance: boolean;
  additionalSortFilter?: "newest" | "oldest" | "leastLiked" | "mostLiked";
  viewType: "grid" | "table";
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
  genreId,
  type,
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
  viewType,
}: SearchResults) {
  const { asPath } = useRouter();

  // memo to set store filter values to query params if they aren't the same
  // may need to combine with setting store values to null initially so you don't get
  // weird behavior

  // do query below based on searchQuery + filters (should return either tabs[] or users[])
  const { data: tabResults, isLoading: isLoadingTabResults } =
    api.tab.getInfiniteTabsBySearchQuery.useInfiniteQuery(
      // TODO: fix input types on trpc function
      {
        searchQuery,
        genreId,
        sortByRelevance,
        sortBy,
      },
      {
        enabled: type === "tab",
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  // const { data: artistResults, isLoading: isLoadingArtistResults } =
  //   api.user.getUsersBySearch.useInfiniteQuery(filterType === "artist" ? {
  //     searchQuery,
  //     genreId,
  //     sortBy,
  //   } : null);

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
