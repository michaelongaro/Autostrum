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
    initializedWithParams,
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
      className="lightGlassmorphic baseVertFlex z-50 mt-12 min-h-[650px] w-full !justify-start rounded-md p-2 md:p-8"
    >
      <Head>
        <title>Likes | Autostrum</title>
        <meta
          name="description"
          content="Filter through and explore the tabs you have liked."
        />
        <meta property="og:title" content="Likes | Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com/profile/likes" />
        <meta
          property="og:description"
          content="Filter through and explore the tabs you have liked."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/profile.png"
        ></meta>
      </Head>

      <TabsContent value="likes">
        {/* search Results component */}
        <div className="baseVertFlex mt-4 w-full gap-8 md:mt-0">
          <SearchInput initialSearchQueryFromUrl={searchQuery} />
          {serve404Page ? (
            <Render404Page />
          ) : (
            <>
              {initializedWithParams && (
                <SearchResults
                  genreId={genreId}
                  type={type}
                  searchQuery={searchQuery}
                  sortByRelevance={sortByRelevance}
                  additionalSortFilter={additionalSortFilter}
                  viewType={view}
                />
              )}
            </>
          )}
        </div>
      </TabsContent>
    </motion.div>
  );
}

ArtistLikes.PageLayout = TopProfileNavigationLayout;

export default ArtistLikes;
