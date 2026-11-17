import { motion } from "framer-motion";
import { type Dispatch, type SetStateAction } from "react";
import { Button } from "~/components/ui/button";
import { useTabStoreShallow } from "~/stores/TabStore";

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
  const { playing, playingPreview, pauseAudio } = useTabStoreShallow(
    (state) => ({
      playing: state.audioMetadata.playing,
      playingPreview: state.previewMetadata.playing,
      pauseAudio: state.pauseAudio,
    }),
  );

  return (
    <div className="baseFlex gap-8">
      {tabNames.map((tabName) => (
        <Button
          key={tabName}
          variant={"text"}
          onClick={() => {
            setActiveTabName(tabName);

            if ((playing && tabName !== "Practice") || playingPreview) {
              pauseAudio();
            }
          }}
          className="relative !p-0 font-medium transition focus-visible:outline-2 sm:whitespace-nowrap sm:text-nowrap"
        >
          {activeTabName === tabName && (
            <motion.span
              layoutId="activeTabPlaybackUnderline"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className="max-lg:mobilePortrait:bottom-[-8px] absolute bottom-[-4px] left-0 z-0 h-[2px] w-full rounded-full bg-primary lg:bottom-[4px]"
            />
          )}
          {tabName}
        </Button>
      ))}
    </div>
  );
}

export default AnimatedTabs;
