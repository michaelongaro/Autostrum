type RelevanceOrder = {
  _relevance: {
    fields: ["username"];
    search: string;
    sort: "asc" | "desc";
  };
};

type CreatedAtOrder = {
  createdAt: "asc" | "desc";
};

type LikesReceivedOrder = {
  likesReceived: {
    _count: "asc" | "desc";
  };
};

type OrderBy =
  | [RelevanceOrder | CreatedAtOrder | LikesReceivedOrder]
  | undefined;

export default function buildArtistOrderBy(
  sortBy: string,
  sortByRelevance: boolean,
  searchQuery?: string
): OrderBy {
  const tempOrderBy: (RelevanceOrder | CreatedAtOrder | LikesReceivedOrder)[] =
    [];

  if (searchQuery && sortByRelevance) {
    tempOrderBy.push({
      _relevance: {
        fields: ["username"],
        // Replace spaces, newlines, tabs with underscore
        search: searchQuery.replace(/[\s\n\t]/g, "_"),
        sort: "asc",
      },
    });
  }

  switch (sortBy) {
    case "newest":
      tempOrderBy.push({ createdAt: "desc" });
      break;
    case "oldest":
      tempOrderBy.push({ createdAt: "asc" });
      break;
    case "mostLiked":
      tempOrderBy.push({ likesReceived: { _count: "desc" } });
      break;
    case "leastLiked":
      tempOrderBy.push({ likesReceived: { _count: "asc" } });
      break;
  }

  return tempOrderBy.length > 0 ? (tempOrderBy as OrderBy) : undefined;
}
