import { useRouter } from "next/router";
import { useState, useLayoutEffect } from "react";
import { tuningNotes } from "~/utils/tunings";

interface UrlParamFilters {
  searchQuery?: string;
  genreId?: number;
  tuning?: string;
  capo?: boolean;
  difficulty?: number;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  layoutType: "grid" | "table";
}

function useGetUrlParamFilters() {
  const { query, asPath } = useRouter();

  const [searchParams, setSearchParams] = useState<UrlParamFilters>({
    searchQuery: undefined,
    genreId: undefined,
    tuning: undefined,
    capo: undefined,
    difficulty: undefined,
    sortBy: "newest",
    layoutType: "grid",
  });
  const [renderSearch404, setRenderSearch404] = useState(false);
  const [searchParamsParsed, setSearchParamsParsed] = useState(false);

  useLayoutEffect(() => {
    const { filteredQuery, ...queryObj } = query;

    const validQueryKeys = [
      "search",
      "genreId",
      "tuning",
      "capo",
      "difficulty",
      "sortBy",
      "layout",
    ];

    // check if any invalid query keys are present
    for (const key of Object.keys(queryObj)) {
      if (!validQueryKeys.includes(key)) {
        setRenderSearch404(true);
        return;
      }
    }

    // check if any invalid query values are present
    // default values are not valid since they will never be organically
    // present in the url unless someone types them in.
    // * Not 100% sure if this is a good idea.
    for (const [key, value] of Object.entries(queryObj)) {
      switch (key) {
        case "search":
          if (typeof value === "string" && value.length > 50) {
            setRenderSearch404(true);
            return;
          }
          break;
        case "genreId":
          if (
            typeof value === "string" &&
            (isNaN(parseInt(value)) ||
              parseInt(value) < 1 ||
              parseInt(value) > 8)
          ) {
            setRenderSearch404(true);
            return;
          }
          break;
        case "tuning":
          if (typeof value === "string" && !tuningNotes.includes(value)) {
            setRenderSearch404(true);
            return;
          }
          break;
        case "capo":
          if (
            typeof value === "string" &&
            value !== "true" &&
            value !== "false"
          ) {
            setRenderSearch404(true);
            return;
          }
          break;
        case "difficulty":
          if (
            typeof value === "string" &&
            (isNaN(parseInt(value)) ||
              parseInt(value) < 1 ||
              parseInt(value) > 5)
          ) {
            setRenderSearch404(true);
            return;
          }
          break;
        case "sortBy":
          if (
            typeof value === "string" &&
            value !== "relevance" &&
            value !== "newest" &&
            value !== "oldest" &&
            value !== "mostPopular" &&
            value !== "leastPopular"
          ) {
            setRenderSearch404(true);
            return;
          }
          break;
        case "layout":
          if (typeof value === "string" && value !== "table") {
            setRenderSearch404(true);
            return;
          }
          break;
      }
    }

    // setting the state (w/ defaults if necessary)
    setSearchParams({
      searchQuery: query.search ? (query.search as string) : undefined,
      genreId: query.genreId ? parseInt(query.genreId as string) : undefined,
      tuning: query.tuning ? (query.tuning as string) : undefined,
      capo: query.capo ? (query.capo as string) === "true" : undefined,
      difficulty: query.difficulty
        ? parseInt(query.difficulty as string)
        : undefined,
      sortBy: query.sortBy
        ? (query.sortBy as
            | "relevance"
            | "newest"
            | "oldest"
            | "mostPopular"
            | "leastPopular")
        : query.search
          ? "relevance"
          : "newest",
      layoutType: query.layout ? (query.layout as "grid" | "table") : "grid",
    });
    setSearchParamsParsed(true);

    // TODO: I just added these recently because I thought they would be useful,
    // but double check whether they are wanted.
    return () => {
      setSearchParamsParsed(false);
      setRenderSearch404(false);
    };
  }, [query, asPath, setSearchParams, setRenderSearch404]);

  return {
    searchQuery: searchParams.searchQuery,
    genreId: searchParams.genreId,
    tuning: searchParams.tuning,
    capo: searchParams.capo,
    sortBy: searchParams.sortBy,
    difficulty: searchParams.difficulty,
    layoutType: searchParams.layoutType,
    renderSearch404,
    searchParamsParsed,
  };
}

export default useGetUrlParamFilters;
