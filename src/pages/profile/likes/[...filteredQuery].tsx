import { motion } from "framer-motion";
import SearchInput from "~/components/Search/SearchInput";
import SearchResults from "~/components/Search/SearchResults";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";
import TopProfileNavigationLayout from "~/components/Layouts/TopProfileNavigationLayout";
import { TabsContent } from "~/components/ui/tabs";
import Head from "next/head";
import Render404Page from "~/components/Search/Render404Page";

function ArtistLikes() {
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
      key={"ArtistLikes"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // remove z-50 if possible, I think <Bubbles /> is messing it up
      className="lightGlassmorphic baseVertFlex z-50 mt-12 min-h-[100dvh] w-full !justify-start rounded-md p-2 md:p-8"
    >
      <Head>
        <meta property="og:title" content="Likes | Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com/profile/likes" />
        <meta
          property="og:description"
          content="Filter through and explore the tabs you have liked."
        />
        <meta property="og:type" content="website" />
        {/* should be just homepage ss of homepage? */}
        <meta property="og:image" content=""></meta>
      </Head>

      <TabsContent value="likes">
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
      </TabsContent>
    </motion.div>
  );
}

ArtistLikes.PageLayout = TopProfileNavigationLayout;

export default ArtistLikes;
