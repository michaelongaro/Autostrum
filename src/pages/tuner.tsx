import { motion } from "framer-motion";
import Head from "next/head";
import TuningFork from "~/components/ui/icons/TuningFork";

function Tuner() {
  return (
    <motion.div
      key={"tuner"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // !justify-start
      className="baseVertFlex my-12 min-h-[calc(100dvh-4rem-6rem)] w-full max-w-[1400px] md:my-24 md:min-h-[calc(100dvh-4rem-12rem)] md:w-3/4 md:p-0"
    >
      <Head>
        <title>Tuner | Autostrum</title>
        <meta
          name="description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Practice any tab alongside our realistic generated audio and convenient audio controls."
        />
        <meta property="og:title" content="Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com" />
        <meta
          property="og:description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Practice any tab alongside our realistic generated audio and convenient audio controls."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>

      <div className="baseVertFlex mx-8 gap-4 rounded-lg border bg-secondary p-4 shadow-md">
        <TuningFork className="size-8 md:size-10" />

        <p className="w-80 text-center">
          The tuner tool is currently under construction! Please check back soon
          for further updates.
        </p>
      </div>
    </motion.div>
  );
}

export default Tuner;
