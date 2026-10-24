import { motion } from "framer-motion";
import SEO from "~/components/SEO";
import TuningFork from "~/components/ui/icons/TuningFork";
import TunerPanel from "~/components/tuner/TunerPanel";
import { useTabStore } from "~/stores/TabStore";
import CustomTuningDialog from "~/components/Dialogs/CustomTuningDialog";
import { useTuner } from "~/hooks/useTuner";
import useScreenWakeLock from "~/hooks/useScreenWakeLock";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";

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
      <SEO
        title="Tuner | Autostrum"
        description="Tune your guitar online using your microphone. Check string pitch with the free Autostrum guitar tuner, with support for alternate and custom tunings."
        path="/tuner"
      />

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-start pb-2">
          <ToolRouteHeader
            icon={<TuningFork className="mr-1 w-[12px]" />}
            title="Guitar Tuner"
            description="Get in tune quickly and accurately using your microphone."
          />
        </div>

        <div className="baseVertFlex w-full md:px-8">
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
      </div>

      <CustomTuningDialog />
    </motion.div>
  );
}

export default Tuner;
