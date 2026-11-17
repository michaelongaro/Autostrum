import { useState } from "react";
import TunerPanel from "~/components/tuner/TunerPanel";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import TuningFork from "~/components/ui/icons/TuningFork";
import { useTuner } from "~/hooks/useTuner";
import { useTabStoreShallow } from "~/stores/TabStore";

function PlaybackTunerDrawer() {
  const { tuning, capo, pauseAudio } = useTabStoreShallow((state) => ({
    tuning: state.tuning,
    capo: state.capo,
    pauseAudio: state.pauseAudio,
  }));

  const [open, setOpen] = useState(false);
  const [selectedCapo, setSelectedCapo] = useState(capo);

  const tuner = useTuner({
    targetTuning: tuning,
    capo: selectedCapo,
  });

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          pauseAudio();
          setSelectedCapo(capo);
        } else {
          tuner.stopListening();
        }

        setOpen(nextOpen);
      }}
    >
      <DrawerTrigger
        render={
          <Button
            variant={"outline"}
            className="baseFlex h-9 gap-2 !px-2.5 !py-0 sm:!px-4"
          >
            <TuningFork className="size-4" />
            <span className="hidden xs:block">Tuner</span>
          </Button>
        }
      />
      <DrawerContent
        forPlaybackModalTuner={true}
        className="baseVertFlex z-50 !items-start p-0"
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>Guitar Tuner</DrawerTitle>
          <DrawerDescription>
            Tune your guitar to this tab&apos;s required tuning.
          </DrawerDescription>
        </DrawerHeader>

        <TunerPanel
          targetNotes={tuner.targetNotes}
          currentTargetIndex={tuner.currentTargetIndex}
          reading={tuner.reading}
          isListening={tuner.isListening}
          completed={tuner.completed}
          error={tuner.error}
          permissionDenied={tuner.permissionDenied}
          onStartListening={tuner.startListening}
          onStopListening={tuner.stopListening}
          onResetProgress={tuner.resetProgress}
          onSetCurrentTargetIndex={tuner.setCurrentTargetIndex}
          forPlaybackModal={true}
          playbackCapoToggle={
            capo > 0
              ? {
                  requiredCapo: capo,
                  selectedCapo,
                  onSelectCapo: setSelectedCapo,
                }
              : undefined
          }
        />
      </DrawerContent>
    </Drawer>
  );
}

export default PlaybackTunerDrawer;
