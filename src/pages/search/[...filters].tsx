import { motion } from "framer-motion";
import SEO from "~/components/SEO";
import SearchResults from "~/components/Search/SearchResults";
import styles from "~/components/Search/SearchResults.module.css";

function FilteredQueryExplore() {
  return (
    <motion.div
      key={"search"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={`${styles.pageShell} baseVertFlex my-12 min-h-[calc(100dvh-4rem-6rem)] !justify-start md:my-24 md:min-h-[calc(100dvh-4rem-12rem)]`}
    >
      <SEO
        title="Search | Autostrum"
        description="Search guitar tabs by song or artist. Filter by genre, tuning, capo, and difficulty to find your next song to learn on Autostrum."
        path="/search/filters"
      />

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-between gap-4 px-4 md:px-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Search
          </h1>
        </div>

        <SearchResults />
      </div>
    </motion.div>
  );
}

export default FilteredQueryExplore;
