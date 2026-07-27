/**
 * Shared Framer Motion config for section / subsection / chord-sequence
 * enter, exit, and reorder (layout) animations while editing.
 *
 * Height stays in-flow (AnimatePresence default/"sync", not popLayout) so the
 * page height eases instead of jumping. layout="position" slides items on
 * reorder without animating size (which would fight height enter/exit).
 */

export const heightVariants = {
  expanded: {
    height: "auto" as const,
    transition: {
      ease: "easeInOut" as const,
      duration: 0.35,
    },
  },
  closed: {
    height: 0,
    transition: {
      ease: "easeInOut" as const,
      duration: 0.35,
    },
  },
};

export const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: "easeInOut" as const,
      duration: 0.35,
    },
  },
  closed: {
    opacity: 0,
    scale: 0.75,
    transition: {
      ease: "easeInOut" as const,
      duration: 0.35,
    },
  },
};

/** Single-element variant when a height wrapper + inner split is unnecessary. */
export const heightOpacityScaleVariants = {
  expanded: {
    height: "auto" as const,
    opacity: 1,
    scale: 1,
    transition: {
      height: { ease: "easeInOut" as const, duration: 0.35 },
      opacity: { ease: "easeInOut" as const, duration: 0.35 },
      scale: { ease: "easeInOut" as const, duration: 0.35 },
    },
  },
  closed: {
    height: 0,
    opacity: 0,
    scale: 0.75,
    transition: {
      height: { ease: "easeInOut" as const, duration: 0.35 },
      opacity: { ease: "easeInOut" as const, duration: 0.35 },
      scale: { ease: "easeInOut" as const, duration: 0.35 },
    },
  },
};

export const sectionListLayoutTransition = {
  layout: {
    type: "spring" as const,
    bounce: 0.15,
    duration: 1,
  },
};

export const sectionListOverflowStyle = {
  overflow: "hidden" as const,
  transformOrigin: "center top",
};
