import { motion } from "framer-motion";
import Head from "next/head";
import { IoMusicalNotes } from "react-icons/io5";
import PracticePlaybackPanel from "~/components/tools/PracticePlaybackPanel";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { warmupExercises } from "~/data/tools/practiceExercises";

function WarmupsPage() {
  return (
    <motion.div
      key={"tools-warmups"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1000px] !justify-start gap-6 px-3 pb-8 xs:px-4 sm:px-6 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)] md:px-8"
    >
      <Head>
        <title>Warm-up Exercises | Autostrum</title>
      </Head>

      <ToolRouteHeader
        icon={<IoMusicalNotes className="size-5" />}
        title="Warm-up Exercises"
        description="Build finger strength and dexterity before jumping into your next practice session."
      />

      <PracticePlaybackPanel
        exercises={warmupExercises}
        emptyStateLabel="No warm-up exercises are configured yet."
      />
    </motion.div>
  );
}

export default WarmupsPage;
