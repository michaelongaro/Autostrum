import { motion } from "framer-motion";
import Head from "next/head";
import { IoMusicalNotes } from "react-icons/io5";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";

const starterWarmups = [
  "1-2-3-4 Chromatic Ladder",
  "Spider Walk (String Skips)",
  "Alternate Picking Endurance",
  "Legato Finger Independence",
];

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
        <title>Warm-up Exercises | Autostrum Tools</title>
      </Head>

      <ToolRouteHeader
        icon={<IoMusicalNotes className="size-5" />}
        title="Warm-up Exercises"
        description="Warm-up playback integration is now scaffolded for the existing practice engine. This page will next be connected to generated practice metadata and transport controls."
      />

      <div className="baseVertFlex w-full items-start gap-3 rounded-lg border bg-secondary p-4 shadow-md">
        <p className="text-sm font-medium">Starter library (MVP set)</p>

        <ul className="grid w-full gap-2 sm:grid-cols-2">
          {starterWarmups.map((exercise) => (
            <li
              key={exercise}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {exercise}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default WarmupsPage;
