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
  const { tuning, audioContext, pauseAudio } = useTabStore((state) => ({
    tuning: state.tuning,
    audioContext: state.audioContext,
    pauseAudio: state.pauseAudio,
  }));

  const [open, setOpen] = useState(false);

  const {
    isListening,
    signalDetected,
    permissionDenied,
    error,
    detectedNote,
    detectedFrequency,
    detectedCents,
    targetCentsOffset,
    clarity,
    currentTargetIndex,
    completed,
    targetNotes,
    setCurrentTargetIndex,
    startListening,
    stopListening,
    resetProgress,
  } = useTuner({
    targetTuning: tuning,
    toleranceCents: 5,
    stableHoldDurationMs: 1500,
    minimumClarity: 0.84,
    audioContext,
  });

  useScreenWakeLock(isListening);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          pauseAudio();
        } else {
          stopListening();
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
          <span className="hidden sm:block">Tuner</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="baseVertFlex h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-[1000px] !justify-start gap-4 overflow-y-auto p-0 pb-4 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Guitar Tuner</DialogTitle>
          <DialogDescription>
            Tune your guitar while staying in the playback modal.
          </DialogDescription>
        </DialogHeader>

        <div className="baseFlex w-full !justify-start px-4 pt-6">
          <div className="baseFlex gap-2">
            <TuningFork className="size-5" />
            <p className="text-lg font-semibold">Guitar Tuner</p>
          </div>
        </div>

        <div className="baseVertFlex w-full px-2 sm:px-4">
          <TunerPanel
            targetNotes={targetNotes}
            currentTargetIndex={currentTargetIndex}
            detectedNote={detectedNote}
            detectedFrequency={detectedFrequency}
            detectedCents={detectedCents}
            targetCentsOffset={targetCentsOffset}
            toleranceCents={5}
            isListening={isListening}
            signalDetected={signalDetected}
            completed={completed}
            error={error}
            permissionDenied={permissionDenied}
            clarity={clarity}
            onStartListening={startListening}
            onStopListening={stopListening}
            onResetProgress={resetProgress}
            onSetCurrentTargetIndex={setCurrentTargetIndex}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlaybackTunerDialog;
