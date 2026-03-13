import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import TuningFork from "~/components/ui/icons/TuningFork";
import TuningSelect from "~/components/ui/TuningSelect";
import ChromaticTunerPanel from "~/components/tuner/ChromaticTunerPanel";
import { useTabStore } from "~/stores/TabStore";
import CustomTuningModal from "~/components/modals/CustomTuningModal";
import { useChromaticTuner } from "~/hooks/useChromaticTuner";

function Tuner() {
  const { tuning, showCustomTuningModal, audioContext } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      showCustomTuningModal: state.showCustomTuningModal,
      audioContext: state.audioContext,
    }),
  );

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
  } = useChromaticTuner({
    targetTuning: tuning,
    toleranceCents: 5,
    stableHoldDurationMs: 1500,
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
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1000px] md:my-16 md:min-h-[calc(100dvh-4rem-8rem)]"
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

      <div className="baseVertFlex w-full gap-4 px-3 pb-4 sm:px-6 md:px-8">
        <div className="baseFlex w-full !justify-start">
          <div className="baseFlex gap-2">
            <TuningFork className="size-5" />
            <p className="text-lg font-semibold">Guitar Tuner</p>
          </div>
        </div>

        <ChromaticTunerPanel
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

      <AnimatePresence>
        {showCustomTuningModal && <CustomTuningModal />}
      </AnimatePresence>
    </motion.div>
  );
}

export default Tuner;
