import { motion } from "framer-motion";
import SEO from "~/components/SEO";
import SearchResults from "~/components/Search/SearchResults";
import styles from "~/components/Search/SearchResults.module.css";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { BiSearchAlt2 } from "react-icons/bi";
import Binoculars from "~/components/ui/icons/Binoculars";
import { FaEye } from "react-icons/fa";
import { LuFilter } from "react-icons/lu";

function FilteredQueryExplore() {
  const isAboveMediumViewport = useViewportWidthBreakpoint(768);

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

          {isAboveMediumViewport ? (
            <div className="baseFlex gap-4">
              <BiSearchAlt2 className="size-9 rotate-12 text-foreground" />
              <Binoculars className="size-9 -rotate-12 text-foreground" />
              <LuFilter className="size-9 rotate-12 text-foreground" />
              <FaEye className="size-9 -rotate-12 text-foreground" />
            </div>
          ) : (
            <div className="baseFlex">
              <div className="relative right-[-18px] top-[3px] z-30 rotate-[-6deg] rounded-lg border bg-background p-2 shadow-sm">
                <BiSearchAlt2 className="size-6 text-foreground" />
              </div>

              <div className="relative right-[-12px] z-20 -rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                <Binoculars className="size-6 text-foreground" />
              </div>

              <div className="relative right-[-6px] z-10 rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                <LuFilter className="size-6 text-foreground" />
              </div>

              <div className="relative top-[3px] rotate-[6deg] rounded-lg border bg-background p-2 shadow-sm">
                <FaEye className="size-6 text-foreground" />
              </div>
            </div>
          )}
        </div>

        <SearchResults />
      </div>
    </motion.div>
  );
}

export default FilteredQueryExplore;
