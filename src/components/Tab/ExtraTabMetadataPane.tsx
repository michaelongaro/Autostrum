import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "~/utils/cn";
import type { MetadataPane } from "~/hooks/useExtraTabMetadataLayout";
import styles from "./ExtraTabMetadataPane.module.css";

function ExtraTabMetadataPane({
  name,
  active,
  desktop = false,
  children,
}: {
  name: MetadataPane;
  active: boolean;
  desktop?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      data-metadata-pane={name}
      aria-hidden={!active}
      inert={!active}
      initial={false}
      animate={{ opacity: desktop && !active ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      className={cn(
        "baseVertFlex w-full !justify-start",
        name !== "Section progression" && "[&:has([data-metadata-items])]:py-3",
        styles.pane,
        desktop && "absolute inset-x-0 top-0",
        !active && "pointer-events-none",
      )}
    >
      {children}
    </motion.div>
  );
}

export default ExtraTabMetadataPane;
