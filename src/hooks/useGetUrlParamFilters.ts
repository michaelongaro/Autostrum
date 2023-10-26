import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface IUrlParamFilters {
  genreId: number;
  type: "tabs" | "artists";
  searchQuery: string;
  view: "grid" | "table";
  sortByRelevance: boolean;
  additionalSortFilter:
    | "newest"
    | "oldest"
    | "leastLiked"
    | "mostLiked"
    | "none";
}

function useGetUrlParamFilters() {
  const { query, asPath } = useRouter();

  // this doesn't feel the best, but the extra checks in every consumer of this hook
  // to check whether the indiv fields were defined seems worse than a separate flag.
  const [initializedWithParams, setInitializedWithParams] = useState(false);
  const [serve404Page, setServe404Page] = useState(false);
  const [urlParamFilters, setUrlParamFilters] = useState<IUrlParamFilters>({
    genreId: 9,
    type: "tabs",
    searchQuery: "",
    view: "grid",
    sortByRelevance: true,
    additionalSortFilter: "newest",
  });

  useEffect(() => {
    // may need to extract this to a separate function and call it both here and in
    // [...filteredQuery] index.tsx
    if (Object.keys(query).length === 0) {
      // needed for /preferences pinned modal, since it defaults back to no
      // /filters? at all if no filters are selected, and therefore we need to reset
      // the urlParamFilters state to its default values.
      setUrlParamFilters({
        genreId: 9,
        type: "tabs",
        searchQuery: "",
        view: "grid",
        sortByRelevance: true,
        additionalSortFilter: "newest",
      });
      return;
    }

    const { filteredQuery, ...queryObj } = query;

    const validQueryKeys = [
      "genreId",
      "type",
      "search",
      "view",
      "relevance",
      "sort",
    ];

    // check if any invalid query keys are present
    for (const key of Object.keys(queryObj)) {
      if (!validQueryKeys.includes(key)) {
        if (asPath.includes("/artist/") && key === "username") continue;
        setServe404Page(true);
        return;
      }
    }

    // check if any invalid query values are present
    // default values are not valid since they will never be organically
    // present in the url unless someone types them in. Not 100% sure if this
    // is a good idea.
    for (const [key, value] of Object.entries(queryObj)) {
      switch (key) {
        case "genreId":
          if (
            typeof value === "string" &&
            (isNaN(parseInt(value)) ||
              parseInt(value) < 1 ||
              parseInt(value) > 8)
          ) {
            setServe404Page(true);
            return;
          }
          break;
        case "type":
          if (typeof value === "string" && value !== "artists") {
            setServe404Page(true);
            return;
          }
          break;
        case "search":
          if (typeof value === "string" && value.length > 30) {
            setServe404Page(true);
            return;
          }
          break;
        case "view":
          if (typeof value === "string" && value !== "table") {
            setServe404Page(true);
            return;
          }
          break;
        case "relevance":
          if (typeof value === "string" && value !== "false") {
            setServe404Page(true);
            return;
          }
          break;
        case "sort":
          if (
            typeof value === "string" &&
            value !== "oldest" &&
            value !== "leastLiked" &&
            value !== "mostLiked" &&
            value !== "none"
          ) {
            setServe404Page(true);
            return;
          }
          break;
      }
    }

    // setting the urlParamFilters state (w/ defaults if necessary)
    setUrlParamFilters({
      genreId: query.genreId ? parseInt(query.genreId as string) : 9,
      type: query.type ? (query.type as "tabs" | "artists") : "tabs",
      searchQuery: query.search ? (query.search as string) : "",
      view: query.view ? (query.view as "grid" | "table") : "grid",
      sortByRelevance: query.relevance
        ? (query.relevance as string) === "true"
        : true,
      additionalSortFilter: query.sort
        ? (query.sort as
            | "newest"
            | "oldest"
            | "leastLiked"
            | "mostLiked"
            | "none")
        : "newest",
    });

    setInitializedWithParams(true);
  }, [query, asPath]);

  return { initializedWithParams, serve404Page, ...urlParamFilters };
}

export default useGetUrlParamFilters;
