import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import ExploreLayout from "~/components/Layouts/ExploreLayout";
import SearchResults from "~/components/Explore/SearchResults";

function FilteredQueryExplore() {
  const { pathname, asPath, query } = useRouter();

  const [serve404Page, setServe404Page] = useState(false);
  const [genreId, setGenreId] = useState<number | undefined>();
  const [type, setType] = useState<"tabs" | "artists" | undefined>();
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [sortByRelevance, setSortByRelevance] = useState<boolean>(true);
  const [additionalSortFilter, setAdditionalSortFilter] = useState<
    "newest" | "oldest" | "leastLiked" | "mostLiked" | undefined
  >();
  const [viewType, setViewType] = useState<"grid" | "table">("grid");

  // view type needs to be on user metadata and will be updated whenever user changes it to the other setting
  // obv means that you will need to query user but that's totally fine

  useEffect(() => {
    if (Object.keys(query).length === 0) return;

    const { filteredQuery, ...queryObj } = query;

    const validQueryKeys = [
      "genreId",
      "type",
      "search",
      "relevance",
      "sort",
      "view",
    ];

    for (const key of Object.keys(queryObj)) {
      if (!validQueryKeys.includes(key)) {
        // TODO: most likely move this logic one step up to the ExploreLayout
        // component so that we can just redirect to 404 page from there rather
        // than still rendering the input and everything, just conditionally render
        // a rough 404 blurb and then don't render children if that's the case
        setServe404Page(true);
        return;
      }
    }

    for (const [key, value] of Object.entries(queryObj)) {
      switch (key) {
        case "genreId":
          if (typeof value === "string" && isNaN(parseInt(value))) {
            setServe404Page(true);
            return;
          }
          setGenreId(parseInt(value as string));
          break;
        case "type":
          if (
            typeof value === "string" &&
            value !== "tabs" &&
            value !== "artists"
          ) {
            setServe404Page(true);
            return;
          }
          setType(value as "tabs" | "artists");
          break;
        case "search":
          if (typeof value === "string") {
            setSearchQuery(value);
          }
          break;
        case "relevance":
          if (
            typeof value === "string" &&
            value !== "true" &&
            value !== "false"
          ) {
            setServe404Page(true);
            return;
          }
          setSortByRelevance(value === "true" ? true : false);
          break;
        case "sort":
          if (
            typeof value === "string" &&
            value !== "newest" &&
            value !== "oldest" &&
            value !== "leastLiked" &&
            value !== "mostLiked"
          ) {
            setServe404Page(true);
            return;
          }
          setAdditionalSortFilter(
            value as "newest" | "oldest" | "leastLiked" | "mostLiked"
          );
          break;
        case "view":
          if (
            typeof value === "string" &&
            value !== "grid" &&
            value !== "table"
          ) {
            setServe404Page(true);
            return;
          }
          setViewType(value as "grid" | "table");
          break;
      }
    }

    // reminder that for /artist/username/[...slug] index.tsx page it will basically
    // be the same, just adding <ArtistProfile /> above and then the only restriction
    // is that instead of genreId and type being mutually exclusive, type is simply
    // just not allowed since it is just for tabs!

    // another reminder: we control all of the url structure internally, so anything
    // that doesn't match is most definitely a 404 page!
  }, [query]); // or query if suits needs better

  // longest example url
  // http://localhost:3000/explore/filters?genreId=1&search=sun%20shine&relevance=true&sort=newest&view=grid

  // def create util function to create url from query params (use encodeURIComponent('sun shine'))

  // how to properly format urls (query params + slashes etc)

  // could be proper way to change browser url w/o reloading page
  // router.push('/?counter=10', undefined, { shallow: true })

  console.log("genreId", genreId);
  console.log("type", type);
  console.log("searchQuery", searchQuery);
  console.log("sortByRelevance", sortByRelevance);
  console.log("additionalSortFilter", additionalSortFilter);
  console.log("viewType", viewType);

  return (
    <motion.div
      key={"filteredQueryExplore"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full p-2 md:p-8"
    >
      {/* search Results component */}
      {serve404Page ? (
        // placeholder div for now
        <div className="baseVertFlex h-full w-full"></div>
      ) : (
        // <SearchResults
        //   genreId={genreId}
        //   type={type}
        //   searchQuery={searchQuery}
        //   sortByRelevance={sortByRelevance}
        //   additionalSortFilter={additionalSortFilter}
        //   viewType={viewType}

        // />
        <div>test</div>
      )}
    </motion.div>
  );
}

FilteredQueryExplore.PageLayout = ExploreLayout;

export default FilteredQueryExplore;

// SHOULD be able to switch genre from select even if you are in specific genre page
// will just push you onto new page. if going to "All" then pushes to generic query page!
