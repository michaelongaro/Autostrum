import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { debounce } from "lodash";
import ExploreLayout from "~/components/Layouts/ExploreLayout";

function Explore() {
  return (
    <motion.div
      key={"queryExplore"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full p-2 md:p-8"
    >
      {/* search Results component */}
    </motion.div>
  );
}

Explore.PageLayout = ExploreLayout;

export default Explore;

// SHOULD be able to switch genre from select even if you are in specific genre page
// will just push you onto new page. if going to "All" then pushes to generic query page!
