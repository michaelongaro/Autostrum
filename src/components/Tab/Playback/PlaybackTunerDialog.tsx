import { useState } from "react";
import TunerPanel from "~/components/tuner/TunerPanel";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import TuningFork from "~/components/ui/icons/TuningFork";
import useScreenWakeLock from "~/hooks/useScreenWakeLock";
import { useTuner } from "~/hooks/useTuner";
import { useTabStore } from "~/stores/TabStore";

function PlaybackTunerDialog() {
  const { tuning, capo, pauseAudio } = useTabStore((state) => ({
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

  useScreenWakeLock(tuner.isListening);

  return (
    <Dialog
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
      <DialogTrigger asChild>
        <Button
          variant={"outline"}
          className="baseFlex h-9 gap-2 !px-2.5 !py-0 sm:!px-4"
        >
          <TuningFork className="size-4" />
          <span className="hidden xs:block">Tuner</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        closeButtonColor="hsl(var(--primary-foreground))"
        className="baseVertFlex h-[85dvh] max-h-[616px] w-screen max-w-[800px] !justify-start gap-0 overflow-y-auto border-0 p-0 sm:h-auto sm:w-[calc(100vw-4rem)]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Guitar Tuner</DialogTitle>
          <DialogDescription>
            Tune your guitar to this tab&apos;s required tuning.
          </DialogDescription>
        </DialogHeader>

        <div className="baseVertFlex size-full">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlaybackTunerDialog;
