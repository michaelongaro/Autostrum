/**
 * Shared Framer Motion config for top-level section enter/exit/layout while editing.
 *
 * Opacity is omitted on purpose — see AnimatedListItem. Height clipping + optional
 * inner scale provide the visible motion without an end-of-tween pop.
 */

const enterExitDuration = 0.35;

export const heightInitial = { height: 0 };
export const heightAnimate = { height: "auto" as const };
export const heightExit = { height: 0 };

export const heightTransition = {
  height: { ease: "easeInOut" as const, duration: enterExitDuration },
  layout: {
    type: "spring" as const,
    bounce: 0.15,
    duration: 1,
  },
};

export const scaleInitial = { scale: 0.75 };
export const scaleAnimate = { scale: 1 };
export const scaleExit = { scale: 0.75 };

export const scaleTransition = {
  ease: "easeInOut" as const,
  duration: enterExitDuration,
};

export const sectionListOverflowStyle = {
  overflow: "hidden" as const,
};
