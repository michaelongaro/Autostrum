import { motion } from "framer-motion";
import Head from "next/head";
import { IoGitNetwork } from "react-icons/io5";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";

const starterScales = [
  "Minor Pentatonic Position 1",
  "Major Scale 3 Notes per String",
  "Natural Minor (Aeolian) Shape",
  "Blues Scale Extension Pattern",
];

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
        <title>Scales Practice | Autostrum Tools</title>
      </Head>

      <ToolRouteHeader
        icon={<IoGitNetwork className="size-5" />}
        title="Scales Practice"
        description="Scale sessions are prepared to reuse the current playback architecture. The next implementation step connects each pattern to compiled metadata and loop-aware controls."
      />

      <div className="baseVertFlex w-full items-start gap-3 rounded-lg border bg-secondary p-4 shadow-md">
        <p className="text-sm font-medium">Starter scale set (MVP)</p>

        <ul className="grid w-full gap-2 sm:grid-cols-2">
          {starterScales.map((scale) => (
            <li
              key={scale}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {scale}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default ScalesPage;
