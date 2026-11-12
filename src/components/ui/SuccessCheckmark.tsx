"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "~/utils/cn";

/** Mount only when an action succeeds, so feedback plays once per result. */
function SuccessCheckmark({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      initial={reduceMotion ? false : { scale: 0.7, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 22 }
      }
      className={cn("inline-flex size-4 shrink-0", className)}
    >
      <Check className="size-full" />
    </motion.span>
  );
}

export default SuccessCheckmark;
