import { motion } from "framer-motion";
import Head from "next/head";
import AudioControls from "~/components/AudioControls/AudioControls";
import Tab from "~/components/Tab/Tab";
import { useTabStore } from "~/stores/TabStore";
import { GiMusicalScore } from "react-icons/gi";
import { EigthNote, QuarterNote } from "~/utils/bpmIconRenderingHelpers";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { BsFillPlayFill } from "react-icons/bs";

function Create() {
  const { editing, showingAudioControls } = useTabStore((state) => ({
    editing: state.editing,
    showingAudioControls: state.showingAudioControls,
  }));

  const isAboveMediumViewport = useViewportWidthBreakpoint(768);

  return (
    <motion.div
      key={"create"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0 2xl:w-[70%]"
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

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-between gap-4 px-4 md:px-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Create
          </h1>

          {isAboveMediumViewport ? (
            <div className="baseFlex gap-4">
              <BsFillPlayFill className="size-9 -rotate-12 text-foreground" />
              <QuarterNote className="size-9 rotate-12 text-foreground" />
              <GiMusicalScore className="size-9 -rotate-12 text-foreground" />
              <EigthNote className="size-9 rotate-12 text-foreground" />
            </div>
          ) : (
            <div className="baseFlex">
              <div className="lightGlassmorphic relative -right-6 top-0.5 z-30 -rotate-6 rounded-lg p-2 outline outline-1">
                <BsFillPlayFill className="size-6 text-pink-800" />
              </div>

              <div className="lightGlassmorphic relative -right-4 z-20 -rotate-3 rounded-lg p-2 outline outline-1">
                <QuarterNote className="size-6 text-pink-800" />
              </div>

              <div className="lightGlassmorphic relative -right-2 z-10 rotate-3 rounded-lg p-2 outline outline-1">
                <GiMusicalScore className="size-6 text-pink-800" />
              </div>

              <div className="lightGlassmorphic relative top-0.5 rotate-6 rounded-lg p-2 outline outline-1">
                <EigthNote className="size-6 text-pink-800" />
              </div>
            </div>
          )}
        </div>

        <Tab />

        {editing && showingAudioControls && <AudioControls />}
      </div>
    </motion.div>
  );
}

export default Create;
