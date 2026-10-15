import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "~/utils/cn";
import styles from "./ExtraTabMetadataPane.module.css";

function ExtraTabMetadataPane({
  expanded,
  collapsedHeight = 96,
  desktop = false,
  onOverflowChange,
  className,
  children,
}: {
  expanded: boolean;
  collapsedHeight?: number;
  desktop?: boolean;
  onOverflowChange?: (hasOverflow: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const updateOverflow = () => {
      const overflows =
        content.getBoundingClientRect().height > collapsedHeight + 1;
      setHasOverflow(overflows);
      onOverflowChange?.(overflows);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(content);
    return () => observer.disconnect();
  }, [collapsedHeight, onOverflowChange]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 96 }}
      animate={{ opacity: 1, height: expanded ? "auto" : collapsedHeight }}
      exit={{ opacity: 0, height: 96 }}
      transition={{ duration: 0.3, opacity: { duration: 0.15 } }}
      className={cn(
        "baseVertFlex w-full !justify-start overflow-hidden",
        !expanded &&
          hasOverflow &&
          (desktop ? styles.desktopCollapsed : styles.mobileCollapsed),
        className,
      )}
    >
      <div
        ref={contentRef}
        className="baseVertFlex w-full shrink-0 !justify-start"
      >
        {children}
      </div>
    </motion.div>
  );
}

export default ExtraTabMetadataPane;
