import { motion } from "framer-motion";
import Head from "next/head";
import Tab from "~/components/Tab/Tab";
import { GiMusicalScore } from "react-icons/gi";
import { EighthNote, QuarterNote } from "~/utils/noteLengthIcons";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { BsFillPlayFill } from "react-icons/bs";

function Create() {
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
              <EighthNote className="size-9 rotate-12 text-foreground" />
            </div>
          ) : (
            <div className="baseFlex">
              <div className="relative -right-6 top-0.5 z-30 -rotate-6 rounded-lg border bg-background p-2 shadow-sm">
                <BsFillPlayFill className="size-6 text-foreground" />
              </div>

              <div className="relative -right-4 z-20 -rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                <QuarterNote className="size-6 text-foreground" />
              </div>

              <div className="relative -right-2 z-10 rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                <GiMusicalScore className="size-6 text-foreground" />
              </div>

              <div className="relative top-0.5 rotate-6 rounded-lg border bg-background p-2 shadow-sm">
                <EighthNote className="size-6 text-foreground" />
              </div>
            </div>
          )}
        </div>

        <Tab />
      </div>
    </motion.div>
  );
}

export default Create;
