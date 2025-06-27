import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { BsPlus } from "react-icons/bs";
import Binoculars from "~/components/ui/icons/Binoculars";

interface NoResultsFound {
  customKey: string;
  searchQueryExists: boolean;
}

function NoResultsFound({ customKey, searchQueryExists }: NoResultsFound) {
  return (
    <motion.div
      key={customKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex lightestGlassmorphic gap-4 rounded-md px-8 py-4 text-xl transition-all"
    >
      <div className="baseVertFlex gap-4">
        <Binoculars className="size-9" />
        No results found
      </div>

      {searchQueryExists && (
        <Button variant={"navigation"} asChild>
          <Link prefetch={false} href="/create" className="baseFlex gap-2">
            <BsPlus className="size-4" />
            Create the first tab for this song
          </Link>
        </Button>
      )}
    </motion.div>
  );
}

export default NoResultsFound;
