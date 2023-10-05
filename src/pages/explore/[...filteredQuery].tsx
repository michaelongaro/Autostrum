import { motion } from "framer-motion";
import Head from "next/head";
import Render404Page from "~/components/Search/Render404Page";
import SearchInput from "~/components/Search/SearchInput";
import SearchResults from "~/components/Search/SearchResults";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";

function FilteredQueryExplore() {
  const {
    serve404Page,
    genreId,
    type,
    view,
    searchQuery,
    sortByRelevance,
    additionalSortFilter,
  } = useGetUrlParamFilters();

  return (
    <motion.div
      key={"filteredQueryExplore"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="lightGlassmorphic baseVertFlex my-12 min-h-[100dvh] w-11/12 !justify-start gap-8 rounded-md p-2 md:my-24 md:w-3/4 md:p-8"
    >
      <Head>
        <title>Explore | Autostrum</title>
        <meta property="og:title" content="Explore | Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com/explore" />
        <meta
          property="og:description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured artist section."
        />
        <meta property="og:type" content="website" />
        {/* should be just homepage ss of main explore page */}
        <meta property="og:image" content=""></meta>
      </Head>

      {/* search Results component */}
      <div className="baseVertFlex mt-8 w-full gap-8">
        <SearchInput initialSearchQueryFromUrl={searchQuery} />
        {serve404Page ? (
          <Render404Page />
        ) : (
          <SearchResults
            genreId={genreId}
            type={type}
            searchQuery={searchQuery}
            sortByRelevance={sortByRelevance}
            additionalSortFilter={additionalSortFilter}
            viewType={view}
          />
        )}
      </div>
    </motion.div>
  );
}

export default FilteredQueryExplore;
