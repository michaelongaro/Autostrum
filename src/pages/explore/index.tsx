import { motion } from "framer-motion";
import GenreBubbles from "~/components/Explore/GenreBubbles";
import SearchInput from "~/components/Search/SearchInput";

function Explore() {
  return (
    <motion.div
      key={"explore"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="lightGlassmorphic baseVertFlex my-12 min-h-[100dvh] w-11/12 !justify-start gap-8 rounded-md px-2 py-4 md:my-24 md:w-3/4 md:p-8 xl:w-8/12"
    >
      <SearchInput />

      <div>{/* <WeeklyFeaturedArtist /> */}</div>

      <GenreBubbles />
    </motion.div>
  );
}

export default Explore;
