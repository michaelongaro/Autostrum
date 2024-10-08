import { motion } from "framer-motion";
import {
  Fragment,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Element } from "react-scroll";
import PalmMuteNode from "~/components/Tab/PalmMuteNode";
import type { LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import { CarouselItem } from "~/components/ui/carousel";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";

const noteLengthDurations = ["1/4th", "1/8th", "1/16th"];
interface TabNotesColumn {
  columnData: string[];
}

function PlaybackTabChord({ columnData }: TabNotesColumn) {
  return (
    <div className="baseVertFlex playbackElem mb-[3.2rem] mt-4 h-[271px] w-[35px]">
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <div className="baseFlex h-9 w-full">
              {/* <PalmMuteNode
                    value={note}
                    columnIndex={0}
                    sectionIndex={0}
                    subSectionIndex={0}
                    opacity={"1"}
                    editingPalmMuteNodes={editingPalmMuteNodes}
                    setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                    lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                    setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                  /> */}
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
              }}
              className="baseFlex relative w-[35px] basis-[content]"
            >
              <div
                // style={{
                //   opacity: lineBeforeNoteOpacity(index) ? 1 : 0,
                // }}
                className="h-[1px] flex-[1] bg-pink-100/50"
              ></div>

              <div className="baseFlex w-[35px]">
                <div className="my-3 h-[1px] flex-[1] bg-pink-100/50"></div>
                <div>{note}</div>
                <div className="my-3 h-[1px] flex-[1] bg-pink-100/50"></div>
              </div>

              <div
                // style={{
                //   opacity: lineAfterNoteOpacity(index) ? 1 : 0,
                // }}
                className="h-[1px] flex-[1] bg-pink-100/50"
              ></div>
            </div>
          )}

          {index === 7 && (
            <div className="relative h-0 w-full">
              <div
                style={{
                  top: "0.25rem",
                  lineHeight: "16px",
                }}
                className="baseVertFlex absolute left-1/2 right-1/2 top-2 w-[1.5rem] -translate-x-1/2"
              >
                {(columnData[8] === "1/8th" || columnData[8] === "1/16th") &&
                  getDynamicNoteLengthIcon(columnData[8], true)}
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
  );
}

export default PlaybackTabChord;
