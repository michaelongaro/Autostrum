import React from "react";

interface TableView {
  genreId?: number;
  type?: "tabs" | "artists";
  searchQuery?: string;
  sortByRelevance: boolean;
  additionalSortFilter?: "newest" | "oldest" | "leastLiked" | "mostLiked";
}

function TableView({
  genreId,
  type,
  searchQuery,
  sortByRelevance,
  additionalSortFilter,
}: TableView) {
  // const { data: artistResults, isLoading: isLoadingArtistResults } =
  //   api.user.getUsersBySearch.useInfiniteQuery(filterType === "artist" ? {
  //     searchQuery,
  //     genreId,
  //     sortBy,
  //   } : null);

  return <div>TableView</div>;
}

export default TableView;
