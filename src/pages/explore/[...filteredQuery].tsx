import { motion } from "framer-motion";
import Head from "next/head";
import SearchResults from "~/components/Search/SearchResults";

function FilteredQueryExplore() {
  return (
    <motion.div
      key={"filteredQueryExplore"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-11/12 !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>Explore | Autostrum</title>
        <meta
          name="description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured artist section."
        />
        <meta property="og:title" content="Explore | Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com/explore" />
        <meta
          property="og:description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured artist section."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/explore.png"
        ></meta>
      </Head>

      {/* search Results component */}
      <div className="baseVertFlex mt-4 w-full gap-8 md:mt-0">
        <SearchResults />
      </div>
    </motion.div>
  );
}

export default FilteredQueryExplore;
