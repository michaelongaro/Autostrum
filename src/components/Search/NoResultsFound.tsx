import { motion } from "framer-motion";
import { IoTelescopeOutline } from "react-icons/io5";
import GenrePreviewBubbles from "../Tab/GenrePreviewBubbles";

interface NoResultsFound {
  customKey: string;
}

function NoResultsFound({ customKey }: NoResultsFound) {
  return (
    <motion.div
      key={customKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex h-[366px] pb-12"
    >
      <div className="baseVertFlex lightestGlassmorphic gap-2 rounded-md px-8 py-4 text-xl transition-all">
        <div className="baseFlex gap-4">
          <GenrePreviewBubbles color={"#ec4899"} enlargedBubbles />

          <IoTelescopeOutline className="h-9 w-9" />

          <GenrePreviewBubbles
            color={"#ec4899"}
            reverseBubblePositions
            enlargedBubbles
          />
        </div>
        No results found
      </div>
    </motion.div>
  );
}

export default NoResultsFound;