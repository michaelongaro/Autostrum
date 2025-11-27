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
      className="baseVertFlex gap-4 rounded-md border bg-secondary-active/50 px-8 py-4 text-xl shadow-lg transition-all"
    >
      <div className="baseVertFlex gap-2 sm:gap-3">
        <Binoculars className="size-7 sm:size-9" />
        <span className="text-lg sm:text-xl">No results found</span>
      </div>

      {searchQueryExists && (
        <Button variant={"outline"} asChild>
          <Link prefetch={false} href="/create" className="baseFlex gap-1.5">
            <BsPlus className="size-5" />
            Create the first tab for this song
          </Link>
        </Button>
      )}
    </motion.div>
  );
}

export default NoResultsFound;
