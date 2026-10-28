import { motion } from "framer-motion";
import SEO from "~/components/SEO";
import Tab from "~/components/Tab/Tab";
import { GiMusicalScore } from "react-icons/gi";
import { EighthNote, QuarterNote } from "~/utils/noteLengthIcons";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import DraftEditor from "~/components/Tab/DraftEditor";
import { BsFillPlayFill } from "react-icons/bs";
import Spinner from "~/components/ui/Spinner";

function Create() {
  const isAboveMediumViewport = useViewportWidthBreakpoint(768);

  const isAboveArbitrary2xlViewport = useViewportWidthBreakpoint(1600); // 2xl breakpoint was just barely too small

  return (
    <>
      <SEO
        title="Create | Autostrum"
        description="Write guitar tabs with chords and reusable strumming patterns. Hear your arrangement as you edit, save drafts, and share your music on Autostrum."
        path="/create"
      />

      <DraftEditor>
        <motion.div
          key={"create"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            width: isAboveArbitrary2xlViewport ? "70%" : "",
          }}
          className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0"
        >
          <div className="baseVertFlex w-full gap-4">
            <div className="baseFlex w-full !justify-between gap-4 px-4 md:px-0">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Create
              </h1>

              {isAboveMediumViewport ? (
                <div className="baseFlex gap-4">
                  <BsFillPlayFill className="size-9 -rotate-12" />
                  <QuarterNote className="size-9 rotate-12" />
                  <GiMusicalScore className="size-9 -rotate-12" />
                  <EighthNote
                    className="size-9 rotate-12"
                    viewBox="20 170 110 210"
                  />
                </div>
              ) : (
                <div className="baseFlex mr-1">
                  <div className="relative right-[-18px] top-[3px] z-30 rotate-[-6deg] rounded-lg border bg-background p-2 shadow-sm">
                    <BsFillPlayFill className="size-6" />
                  </div>

                  <div className="relative right-[-12px] z-20 -rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                    <QuarterNote className="size-6" />
                  </div>

                  <div className="relative right-[-6px] z-10 rotate-3 rounded-lg border bg-background p-2 shadow-sm">
                    <GiMusicalScore className="size-6" />
                  </div>

                  <div className="relative top-[3px] rotate-[6deg] rounded-lg border bg-background p-2 shadow-sm">
                    <EighthNote className="size-6" viewBox="20 170 110 210" />
                  </div>
                </div>
              )}
            </div>

            <Tab />
          </div>
        </motion.div>
      </DraftEditor>
    </>
  );
}

export default Create;
