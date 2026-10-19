import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Spinner from "~/components/ui/Spinner";

interface SearchResultsSpinnerProps {
  hasResults: boolean;
  hasNextPage?: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
}

function SearchResultsSpinner({
  hasResults,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
}: SearchResultsSpinnerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {isFetching && !hasResults ? (
        <motion.div
          key="initial-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="baseFlex w-full grow"
        >
          <Spinner className="size-8" />
        </motion.div>
      ) : hasResults && isFetchingNextPage ? (
        <motion.div
          key="next-page-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: reduceMotion ? 0 : 0.15, delay: 0 },
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.2,
            delay: reduceMotion ? 0 : 0.12,
            ease: "easeOut",
          }}
          className="baseFlex pointer-events-none h-20 w-full shrink-0"
        >
          <Spinner className="size-6" />
        </motion.div>
      ) : hasResults && hasNextPage ? (
        // Reserve the same space before a request so the entrance cannot move
        // the results. The positioned results root anchors the popped exit.
        <div
          key="next-page-space"
          aria-hidden="true"
          className="h-20 w-full shrink-0"
        />
      ) : null}
    </AnimatePresence>
  );
}

export default SearchResultsSpinner;
