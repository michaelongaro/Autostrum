import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import TuningFork from "~/components/ui/icons/TuningFork";
import TuningSelect from "~/components/ui/TuningSelect";
import ChromaticTunerPanel from "~/components/tuner/ChromaticTunerPanel";
import { useTabStore } from "~/stores/TabStore";
import CustomTuningModal from "~/components/modals/CustomTuningModal";
import { Button } from "~/components/ui/button";
import { useChromaticTuner } from "~/hooks/useChromaticTuner";

function Tuner() {
  const {
    tuning,
    showCustomTuningModal,
    previewMetadata,
    audioContext,
    playPreview,
  } = useTabStore((state) => ({
    tuning: state.tuning,
    showCustomTuningModal: state.showCustomTuningModal,
    previewMetadata: state.previewMetadata,
    audioContext: state.audioContext,
    playPreview: state.playPreview,
  }));

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
    playCurrentReferenceTone,
  } = useChromaticTuner({
    targetTuning: tuning,
    toleranceCents: 8,
    stableFrameCount: 16,
    minimumClarity: 0.84,
    audioContext,
  });

  return (
    <motion.div
      key={"tuner"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[calc(100dvh-4rem-6rem)] w-full max-w-[1400px] md:my-24 md:min-h-[calc(100dvh-4rem-12rem)] md:w-3/4 md:p-0"
    >
      <Head>
        <title>Tuner | Autostrum</title>
        <meta
          name="description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Practice any tab alongside our realistic generated audio and convenient audio controls."
        />
        <meta property="og:title" content="Autostrum"></meta>
        <meta property="og:url" content="https://www.autostrum.com" />
        <meta
          property="og:description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Practice any tab alongside our realistic generated audio and convenient audio controls."
        />
        <meta property="og:site_name" content="Autostrum" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>

      <div className="baseVertFlex mx-4 w-full gap-4 md:mx-8">
        <div className="baseFlex w-full max-w-[1100px] !justify-between rounded-lg border bg-secondary p-4 shadow-sm">
          <div className="baseFlex gap-2">
            <TuningFork className="size-6 md:size-7" />
            <p className="text-lg font-semibold">Guitar tuner</p>
          </div>

          <TuningSelect />
        </div>

        <ChromaticTunerPanel
          targetNotes={targetNotes}
          currentTargetIndex={currentTargetIndex}
          detectedNote={detectedNote}
          detectedFrequency={detectedFrequency}
          detectedCents={detectedCents}
          targetCentsOffset={targetCentsOffset}
          toleranceCents={8}
          isListening={isListening}
          signalDetected={signalDetected}
          completed={completed}
          error={error}
          permissionDenied={permissionDenied}
          clarity={clarity}
          onStartListening={startListening}
          onStopListening={stopListening}
          onResetProgress={resetProgress}
          onPlayReferenceTone={playCurrentReferenceTone}
          onSetCurrentTargetIndex={setCurrentTargetIndex}
        />

        <Button
          disabled={previewMetadata.playing}
          variant="audio"
          className="w-full max-w-[1100px]"
          onClick={() => {
            void playPreview({
              data: ["0", "0", "0", "0", "0", "0"],
              index: -1,
              type: "chord",
              customTuning: tuning,
              customBpm: "40",
            });
          }}
        >
          Preview open-string tuning
        </Button>
      </div>

      <AnimatePresence>
        {showCustomTuningModal && <CustomTuningModal />}
      </AnimatePresence>
    </motion.div>
  );
}

export default Tuner;
