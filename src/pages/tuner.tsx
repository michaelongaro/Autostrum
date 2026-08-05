import { motion } from "framer-motion";
import Head from "next/head";
import TuningFork from "~/components/ui/icons/TuningFork";
import TunerPanel from "~/components/tuner/TunerPanel";
import { useTabStore } from "~/stores/TabStore";
import CustomTuningDialog from "~/components/Dialogs/CustomTuningDialog";
import { useTuner } from "~/hooks/useTuner";
import useScreenWakeLock from "~/hooks/useScreenWakeLock";

function Tuner() {
  const { tuning, capo } = useTabStore((state) => ({
    tuning: state.tuning,
    capo: state.capo,
  }));

  const tuner = useTuner({
    targetTuning: tuning,
    capo,
  });

  useScreenWakeLock(tuner.isListening);

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

      <div className="baseVertFlex w-full gap-4 pb-4 xs:px-3 sm:px-6 md:px-8">
        <div className="baseFlex w-full !justify-start px-3 xs:px-0">
          <div className="baseFlex gap-2">
            <TuningFork className="size-5" />
            <p className="text-lg font-semibold">Guitar Tuner</p>
          </div>
        </div>

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
        />
      </div>

      <CustomTuningDialog />
    </motion.div>
  );
}

export default Tuner;
