import { motion } from "framer-motion";
import Binoculars from "~/components/ui/icons/Binoculars";

function PageNotFound() {
  return (
    <motion.div
      key={"404"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 w-full !justify-start sm:min-h-[655px] md:my-24 md:w-[85%] md:p-0 2xl:w-[70%]"
    >
      <div className="baseVertFlex my-auto w-10/12 gap-4 rounded-md border bg-background p-4 shadow-lg md:w-[500px]">
        <div className="baseFlex gap-3 sm:gap-4">
          <div className="baseVertFlex gap-2">
            <Binoculars className="size-6 sm:size-9" />
            <h1 className="text-xl font-bold sm:text-2xl">Page not found</h1>
          </div>
        </div>
        <p className="text-center text-base sm:text-lg">
          The page you are looking for does not exist. Please check the URL and
          try again.
        </p>
      </div>
    </motion.div>
  );
}

export default PageNotFound;
