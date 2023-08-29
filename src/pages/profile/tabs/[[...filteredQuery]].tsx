import { motion } from "framer-motion";
import { BiErrorCircle } from "react-icons/bi";
import SearchInput from "~/components/Search/SearchInput";
import SearchResults from "~/components/Search/SearchResults";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";

import TopProfileNavigationLayout from "~/components/Layouts/TopProfileNavigationLayout";
import { TabsContent } from "~/components/ui/tabs";

function ArtistTabs() {
  const {
    serve404Page,
    genreId,
    type,
    searchQuery,
    sortByRelevance,
    additionalSortFilter,
  } = useGetUrlParamFilters();

  const viewType = useGetLocalStorageValues().viewType;

  return (
    <motion.div
      key={"ArtistTabs"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // remove z-50 if possible, I think <Bubbles /> is messing it up
      className="lightGlassmorphic baseVertFlex z-50 mt-12 min-h-[100dvh] w-full !justify-start rounded-md p-2 md:p-8"
    >
      <TabsContent value="tabs">
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
          <div className="baseVertFlex w-full gap-8">
            <SearchInput initialSearchQueryFromUrl={searchQuery} />

            <SearchResults
              genreId={genreId}
              type={type}
              searchQuery={searchQuery}
              sortByRelevance={sortByRelevance}
              additionalSortFilter={additionalSortFilter}
              viewType={viewType}
            />
          </div>
        )}
      </TabsContent>
    </motion.div>
  );
}

ArtistTabs.PageLayout = TopProfileNavigationLayout;

export default ArtistTabs;
