import { motion } from "framer-motion";
import { IoWarningOutline } from "react-icons/io5";

function PageErrorFallback() {
  return (
    <motion.div
      key={"500"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[calc(100dvh-4rem-6rem)] w-full max-w-[1400px] !justify-start md:my-24 md:min-h-[calc(100dvh-4rem-12rem)] md:w-3/4"
    >
      <div className="baseVertFlex my-auto w-10/12 gap-4 rounded-md border bg-background p-4 shadow-lg md:w-[500px]">
        <div className="baseFlex gap-3 sm:gap-4">
          <div className="baseVertFlex gap-2">
            <IoWarningOutline className="size-6 sm:size-9" />
            <h1 className="text-xl font-bold sm:text-xl">An Error Occurred</h1>
          </div>
        </div>
        <p className="text-center text-base">
          We&apos;re experiencing a technical issue and are unable to complete
          your request right now. Please try again later. If the problem
          persists, feel free to contact our support team.
        </p>
        <p className="text-center text-base">Thank you for your patience!</p>
      </div>
    </motion.div>
  );
}

export default PageErrorFallback;
