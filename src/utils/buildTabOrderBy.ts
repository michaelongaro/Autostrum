type RelevanceOrder = {
  _relevance: {
    fields: ["title"];
    search: string;
    sort: "asc" | "desc";
  };
};

type CreatedAtOrder = {
  updatedAt: "asc" | "desc";
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
        // TODO: this probably is why the search isn't working w/ spaces...
        // Replace spaces, newlines, tabs with underscore
        search: searchQuery.replace(/[\s\n\t]/g, "_"),

        // https://news.freshports.org/2021/03/09/to_tsquery-gives-error-syntax-error-in-tsquery-when-it-contains-a-space/
        // idk this would probably require a raw sql query though...
        sort: "asc",
      },
    });
  }

  switch (sortBy) {
    case "newest":
      tempOrderBy.push({ updatedAt: "desc" });
      break;
    case "oldest":
      tempOrderBy.push({ updatedAt: "asc" });
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
