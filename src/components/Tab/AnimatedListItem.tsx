import { motion } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

const enterExitDuration = 0.35;

// Height-only on the outer node (overflow hidden clips content during grow/shrink).
// Opacity on the inner node via variant propagation.
const heightVariants = {
  visible: {
    height: "auto" as const,
    transition: {
      ease: "easeInOut" as const,
      duration: enterExitDuration,
    },
  },
  hidden: {
    height: 0,
    transition: {
      ease: "easeInOut" as const,
      duration: enterExitDuration,
    },
  },
};

const opacityVariants = {
  visible: {
    opacity: 1,
    transition: {
      ease: "easeInOut" as const,
      duration: enterExitDuration,
    },
  },
  hidden: {
    opacity: 0.75,
    transition: {
      ease: "easeInOut" as const,
      duration: enterExitDuration,
    },
  },
};

const layoutTransition = {
  layout: {
    type: "spring" as const,
    bounce: 0.15,
    duration: 1,
  },
};

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  /** Extra class on the inner scaled content wrapper (e.g. margin for list gaps). */
  contentClassName?: string;
  /** Enable layout="position" for reorder sliding. Default true. */
  layout?: boolean;
}

const AnimatedListItem = forwardRef<HTMLDivElement, AnimatedListItemProps>(
  function AnimatedListItem(
    {
      children,
      className = "w-full",
      contentClassName = "w-full",
      layout = true,
    },
    ref,
  ) {
    return (
      <motion.div
        ref={ref}
        layout={layout ? "position" : undefined}
        variants={heightVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={layoutTransition}
        style={{ overflow: "hidden" }}
        className={className}
      >
        <motion.div
          variants={opacityVariants}
          style={{ transformOrigin: "center top" }}
          className={contentClassName}
        >
          {children}
        </motion.div>
      </motion.div>
    );
  },
);

export default AnimatedListItem;
