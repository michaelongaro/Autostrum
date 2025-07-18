import { type Dispatch, type SetStateAction } from "react";
import { motion } from "framer-motion";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";

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
  const { playing, pauseAudio } = useTabStore((state) => ({
    playing: state.audioMetadata.playing,
    pauseAudio: state.pauseAudio,
  }));

  return (
    <div className="baseFlex gap-8">
      {tabNames.map((tabName) => (
        <Button
          key={tabName}
          variant={"text"}
          onClick={() => {
            setActiveTabName(tabName);

            if (playing && tabName !== "Practice") pauseAudio();
          }}
          className="relative !p-0 font-medium transition focus-visible:outline-2 sm:whitespace-nowrap sm:text-nowrap"
        >
          {activeTabName === tabName && (
            <motion.span
              layoutId="activeTabPlaybackUnderline"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className="absolute bottom-[-4px] left-0 z-0 h-[2px] w-full rounded-full bg-primary mobilePortrait:bottom-[-8px] tablet:bottom-[4px]"
            />
          )}
          {tabName}
        </Button>
      ))}
    </div>
  );
}

export default AnimatedTabs;
