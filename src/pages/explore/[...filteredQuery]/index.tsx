import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import ExploreLayout from "~/components/Layouts/ExploreLayout";
import SearchResults from "~/components/Search/SearchResults";

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
  // reminder that for /artist/username/[...slug] index.tsx page it will basically
  // be the same, just adding <ArtistProfile /> above and then the only restriction
  // is that instead of genreId and type being mutually exclusive, type is simply
  // just not allowed since it is just for tabs!

  // maybe useLayoutEffect if this is causing a flicker
  useEffect(() => {
    if (Object.keys(query).length === 0) return;

    setGenreId(parseInt(query.genreId as string) || undefined);
    setType((query.type as "tabs" | "artists") || undefined);
    setSearchQuery((query.search as string) || undefined);
    setSortByRelevance(query.relevance === "true" ? true : false);
    setAdditionalSortFilter(
      (query.sort as "newest" | "oldest" | "leastLiked" | "mostLiked") ||
        undefined
    );
    setViewType(query.view as "grid" | "table");
  }, [query]);

  // longest example url
  // http://localhost:3000/explore/filters?genreId=1&search=sun%20shine&relevance=true&sort=newest&view=grid

  // def create util function to create url from query params (use encodeURIComponent('sun shine'))

  // could be proper way to change browser url w/o reloading page
  // router.push('/?counter=10', undefined, { shallow: true })

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
        <SearchResults
          genreId={genreId}
          type={type}
          searchQuery={searchQuery}
          sortByRelevance={sortByRelevance}
          additionalSortFilter={additionalSortFilter}
          viewType={viewType}
        />
      )}
    </motion.div>
  );
}

FilteredQueryExplore.PageLayout = ExploreLayout;

export default FilteredQueryExplore;

// SHOULD be able to switch genre from select even if you are in specific genre page
// will just push you onto new page. if going to "All" then pushes to generic query page!
