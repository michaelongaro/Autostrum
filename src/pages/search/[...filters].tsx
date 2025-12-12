import { motion } from "framer-motion";
import Head from "next/head";
import SearchResults from "~/components/Search/SearchResults";
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
      className="baseVertFlex my-12 min-h-[calc(100dvh-4rem-6rem)] w-full max-w-[1400px] !justify-start md:my-24 md:min-h-[calc(100dvh-4rem-12rem)] md:w-3/4"
    >
      <Head>
        <title>Search | Autostrum</title>
        <meta
          name="description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured artist section."
        />
        <meta property="og:title" content="Search | Autostrum"></meta>
        <meta property="og:url" content="https://www.autostrum.com/explore" />
        <meta
          property="og:description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured artist section."
        />
        <meta property="og:site_name" content="Autostrum" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-between gap-4 px-4 md:px-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Search
          </h1>

          {isAboveMediumViewport ? (
            <div className="baseFlex gap-4">
              <BiSearchAlt2 className="size-9 -rotate-12 text-foreground" />
              <Binoculars className="size-9 rotate-12 text-foreground" />
              <FaEye className="size-9 -rotate-12 text-foreground" />
              <LuFilter className="size-9 rotate-12 text-foreground" />
            </div>
          ) : (
            <div className="baseFlex">
              <div className="relative -right-6 top-0.5 z-30 -rotate-6 rounded-lg border bg-background p-2 shadow-sm">
                <BiSearchAlt2 className="size-6 text-foreground" />
              </div>

              <div className="relative -right-4 z-20 -rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                <Binoculars className="size-6 text-foreground" />
              </div>

              <div className="relative -right-2 z-10 rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                <FaEye className="size-6 text-foreground" />
              </div>

              <div className="relative top-0.5 rotate-6 rounded-lg border bg-background p-2 shadow-sm">
                <LuFilter className="size-6 text-foreground" />
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
