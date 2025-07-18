import { BiErrorCircle } from "react-icons/bi";
import { motion } from "framer-motion";

// FYI: idk if it's really necessary to have conditional min-h for this.
// revisit later
interface Render404Page {
  layoutType: "grid" | "table";
}

function Render404Page({ layoutType }: Render404Page) {
  return (
    <motion.div
      key={"render404Page"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`baseVertFlex size-full ${layoutType === "grid" ? "min-h-[calc(100dvh-4rem-6rem-56px-60px)] md:min-h-[calc(100dvh-4rem-12rem-56px-60px)]" : "min-h-[calc(100dvh-4rem-6rem-56px-60px-45px)] md:min-h-[calc(100dvh-4rem-12rem-56px-60px-45px)]"}`}
    >
      <div className="baseVertFlex gap-2 rounded-md border bg-muted px-8 py-4 shadow-lg">
        <div className="baseFlex gap-4 text-2xl font-bold">
          <div className="baseFlex gap-2">
            <BiErrorCircle className="h-8 w-8" /> Search error
          </div>
        </div>
        <div className="text-lg">Unable to load search results.</div>
        <div className="mt-4">
          Please check your URL for any typos and try again.
        </div>
      </div>
    </motion.div>
  );
}

export default Render404Page;
