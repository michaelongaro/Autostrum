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
      className="lightGlassmorphic baseVertFlex my-24 min-h-[100dvh] w-10/12 !justify-start rounded-md p-2 md:w-3/4 md:p-8"
    >
      <SearchInput />

      <div>{/* <WeeklyFeaturedArtist /> */}</div>

      <GenreBubbles />
    </motion.div>
  );
}

export default Explore;
