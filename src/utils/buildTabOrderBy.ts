type RelevanceOrder = {
  _relevance: {
    fields: ["title"];
    search: string;
    sort: "asc" | "desc";
  };
};

type CreatedAtOrder = {
  createdAt: "asc" | "desc";
};

type LikesOrder = {
  likes: {
    _count: "asc" | "desc";
  };
};

type OrderBy = [RelevanceOrder | CreatedAtOrder | LikesOrder] | undefined;

export default function buildTabOrderBy(
  sortBy: string,
  sortByRelevance: boolean,
  searchQuery?: string
): OrderBy {
  const tempOrderBy: (RelevanceOrder | CreatedAtOrder | LikesOrder)[] = [];

  if (searchQuery && sortByRelevance) {
    tempOrderBy.push({
      _relevance: {
        fields: ["title"],
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
      tempOrderBy.push({ likes: { _count: "desc" } });
      break;
    case "leastLiked":
      tempOrderBy.push({ likes: { _count: "asc" } });
      break;
  }

  return tempOrderBy.length > 0 ? (tempOrderBy as OrderBy) : undefined;
}
