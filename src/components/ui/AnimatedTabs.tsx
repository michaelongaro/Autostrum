import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";

interface AnimatedTabs {
  activeTabName: string;
  setActiveTabName: Dispatch<SetStateAction<string>>;
  tabNames: string[];
}

function AnimatedTabs({
  activeTabName,
  setActiveTabName,
  tabNames,
}: AnimatedTabs) {
  return (
    <div className="flex space-x-1">
      {tabNames.map((tabName) => (
        <button
          key={tabName}
          onClick={() => setActiveTabName(tabName)}
          className={`${
            activeTabName === tabName ? "" : "hover:text-white/60"
          } relative rounded-full px-3 py-1.5 text-sm font-medium text-white outline-sky-400 transition focus-visible:outline-2`}
          style={{
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {activeTabName === tabName && (
            <motion.span
              layoutId="bubble"
              className="absolute inset-0 z-10 bg-white mix-blend-difference"
              style={{ borderRadius: 9999 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {tabName}
        </button>
      ))}
    </div>
  );
}

export default AnimatedTabs;
