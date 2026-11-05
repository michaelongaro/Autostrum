"use client";

import { motion } from "framer-motion";
import Tab from "~/components/Tab/Tab";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import DraftEditor from "~/components/Tab/DraftEditor";

function Create() {
  const isAboveArbitrary2xlViewport = useViewportWidthBreakpoint(1600); // 2xl breakpoint was just barely too small

  return (
    <>
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
            </div>

            <Tab />
          </div>
        </motion.div>
      </DraftEditor>
    </>
  );
}

export default Create;
