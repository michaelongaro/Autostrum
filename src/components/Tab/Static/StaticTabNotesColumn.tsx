import { motion } from "framer-motion";
import { Fragment } from "react";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import StaticTabNote from "~/components/Tab/Static/StaticTabNote";

interface StaticTabNotesColumn {
  columnData: string[];
}

function StaticTabNotesColumn({ columnData }: StaticTabNotesColumn) {
  return (
    <motion.div
      key={columnData[9]}
      // id={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
      className="baseVertFlex h-[271px] cursor-default"
    >
      <div className="baseVertFlex mb-[3.2rem] mt-4">
        {columnData.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              <div className="baseFlex h-9 w-full">
                <StaticPalmMuteNode value={note} />
              </div>
            )}

            {index > 0 && index < 7 && (
              <div
                style={{
                  borderTop: `${
                    index === 1 ? "2px solid rgb(253 242 248)" : "none"
                  }`,
                  paddingTop: `${index === 1 ? "7px" : "0"}`,
                  borderBottom: `${
                    index === 6 ? "2px solid rgb(253 242 248)" : "none"
                  }`,
                  paddingBottom: `${index === 6 ? "7px" : "0"}`,
                  transition: "width 0.15s ease-in-out",
                  // maybe also need "flex-basis: content" here if editing?
                }}
                className="baseFlex relative w-[35px] basis-[content]"
              >
                <div className="h-[1px] flex-[1] bg-pink-100/50"></div>

                <StaticTabNote note={note} />

                <div className="h-[1px] flex-[1] bg-pink-100/50"></div>
              </div>
            )}

            {index === 7 && (
              <div className="relative h-0 w-full">
                <div className="baseVertFlex absolute left-1/2 right-1/2 top-1 w-[1.5rem] -translate-x-1/2">
                  {columnData[7]?.includes("^") && (
                    <div className="relative top-1 rotate-180">v</div>
                  )}
                  {columnData[7]?.includes("v") && <div>v</div>}
                  {columnData[7]?.includes("s") && <div>s</div>}
                  {columnData[7]?.includes(">") && <div>{">"}</div>}
                  {columnData[7]?.includes(".") && (
                    <div className="relative bottom-2">.</div>
                  )}
                </div>
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

export default StaticTabNotesColumn;
