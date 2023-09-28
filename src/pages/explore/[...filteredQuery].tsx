import { motion } from "framer-motion";
import Head from "next/head";
import { BiErrorCircle } from "react-icons/bi";
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
      // className="baseVertFlex w-full p-2 md:p-8"
      className="lightGlassmorphic baseVertFlex my-12 min-h-[100dvh] w-11/12 !justify-start gap-8 rounded-md p-2 md:my-24 md:w-3/4 md:p-8"
    >
      <Head>
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
      {serve404Page ? (
        <div className="baseVertFlex gap-2 px-8 py-4 md:gap-4">
          <div className="baseFlex gap-4 text-2xl font-bold">
            Search error <BiErrorCircle className="h-8 w-8" />
          </div>
          <div className="text-lg">Unable to load search results.</div>
          <div className="mt-8">
            Please check your URL for any typos and try again.
          </div>
        </div>
      ) : (
        <>
          <SearchInput initialSearchQueryFromUrl={searchQuery} />

          <SearchResults
            genreId={genreId}
            type={type}
            searchQuery={searchQuery}
            sortByRelevance={sortByRelevance}
            additionalSortFilter={additionalSortFilter}
            viewType={view}
          />
        </>
      )}
    </motion.div>
  );
}

export default FilteredQueryExplore;
