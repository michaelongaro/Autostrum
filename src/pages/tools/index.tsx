import { motion } from "framer-motion";
import Head from "next/head";
import ToolCardGrid from "~/components/tools/ToolCardGrid";
import { toolDefinitions } from "~/data/tools/toolDefinitions";

function ToolsHub() {
  return (
    <motion.div
      key={"tools"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1100px] gap-6 px-3 pb-8 xs:px-4 sm:px-6 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)] md:px-8"
    >
      <Head>
        <title>Tools | Autostrum</title>
        <meta
          name="description"
          content="Explore guitar tools on Autostrum: warm-up exercises, scales practice, metronome, audible note trainer, and tuner workflows."
        />
      </Head>

      <div className="baseVertFlex w-full !items-start gap-2">
        <h1 className="text-2xl font-semibold md:text-3xl">Guitar Tools</h1>
        <p className="max-w-3xl text-sm text-foreground/85 md:text-base">
          Practice timing, build fretboard fluency, and keep your instrument in
          tune with focused tools built for daily guitar sessions.
        </p>
      </div>

      <ToolCardGrid tools={toolDefinitions} />
    </motion.div>
  );
}

export default ToolsHub;
