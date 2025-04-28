import { BiErrorCircle } from "react-icons/bi";
import { motion } from "framer-motion";

function Render404Page() {
  return (
    <motion.div
      key={"render404Page"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="lightestGlassmorphic baseVertFlex mt-4 gap-2 rounded-md px-8 py-4"
    >
      <div className="baseFlex gap-4 text-2xl font-bold">
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-8 w-8" /> Search error
        </div>
      </div>
      <div className="text-lg">Unable to load search results.</div>
      <div className="mt-4">
        Please check your URL for any typos and try again.
      </div>
    </motion.div>
  );
}

export default Render404Page;
