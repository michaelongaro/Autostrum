import { motion } from "framer-motion";
import Head from "next/head";
import PracticePlaybackPanel from "~/components/tools/PracticePlaybackPanel";
import { GiMusicalScore } from "react-icons/gi";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { scaleExercises } from "~/data/tools/practiceExercises";

function ScalesPage() {
  return (
    <motion.div
      key={"tools-scales"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1000px] !justify-start gap-6 px-3 pb-8 xs:px-4 sm:px-6 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)] md:px-8"
    >
      <Head>
        <title>Scales Practice | Autostrum</title>
      </Head>

      <ToolRouteHeader
        icon={<GiMusicalScore className="size-8" />}
        title="Scales Practice"
        description="Learn the fretboard and build muscle memory by playing through essential scale shapes."
      />

      <PracticePlaybackPanel
        exercises={scaleExercises}
        emptyStateLabel="No scale exercises are configured yet."
      />
    </motion.div>
  );
}

export default ScalesPage;
