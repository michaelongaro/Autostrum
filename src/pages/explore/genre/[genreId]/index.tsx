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
      key={"queryGenreExplore"}
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

// can you have two [] route folders or do you need to do logic to determine which one it is
