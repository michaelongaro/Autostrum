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
  });
  const [renderSearch404, setRenderSearch404] = useState(false);
  const [searchParamsParsed, setSearchParamsParsed] = useState(false);

  useLayoutEffect(() => {
    if (Object.keys(query).length === 0) return;

    const { filters, ...queryObj } = query;

    const validQueryKeys = [
      "username", // just for /user
      "name", // just for /artist
      "id", // just for /artist
      "search",
      "genreId",
      "tuning",
      "capo",
      "difficulty",
      "sortBy",
    ];

    // check if any invalid query keys are present
    for (const key of Object.keys(queryObj)) {
      if (!validQueryKeys.includes(key)) {
        console.log("1", validQueryKeys, key);
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
            console.log("2");
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
            console.log("3");
            setRenderSearch404(true);
            return;
          }
          break;
        case "tuning":
          if (
            typeof value === "string" &&
            value !== "custom" &&
            !tuningNotes.includes(value)
          ) {
            console.log("4");
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
            console.log("5");
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
            console.log("6");
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
            console.log("7");
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
    renderSearch404,
    searchParamsParsed,
  };
}

export default useGetUrlParamFilters;
