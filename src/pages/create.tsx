import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import AudioControls from "~/components/AudioControls/AudioControls";
import Tab from "~/components/Tab/Tab";
import { useTabStore } from "~/stores/TabStore";

function Create() {
  const { showingAudioControls } = useTabStore((state) => ({
    showingAudioControls: state.showingAudioControls,
  }));

  return (
    <motion.div
      key={"create"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <Head>
        <title>Create | Autostrum</title>
        <meta
          name="description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music."
        />
        <meta property="og:title" content="Create | Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com/create" />
        <meta
          property="og:description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/editingTab.png"
        ></meta>
      </Head>

      <Tab tab={undefined} />

      {/* can probably drop the <AnimatePresence> since it can't ever be triggered, right?*/}
      <AnimatePresence mode="wait">
        {showingAudioControls && <AudioControls />}
      </AnimatePresence>
    </motion.div>
  );
}

export default Create;
