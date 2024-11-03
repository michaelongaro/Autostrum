import { Fragment } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";

interface PlaybackTabChord {
  columnData: string[];
  isFirstChordInSection: boolean;
  isLastChordInSection: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
}

function PlaybackTabChord({
  columnData,
  isFirstChordInSection,
  isLastChordInSection,
  isHighlighted,
  isDimmed,
}: PlaybackTabChord) {
  return (
    <>
      {/* not my favorite, but PM value of "-1" indicates a physical spacer between tab and strumming
        sections */}
      {columnData[0] === "-1" && (
        <div
          style={{
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="baseVertFlex ornamental playbackElem mb-[9px] h-[168px] w-4 border-y-2 border-white"
        >
          {/* spacer to ease transition from tab -> strum */}
          <div className="my-3 h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50"></div>
          <div className="my-3 h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50"></div>
          <div className="my-3 h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50"></div>
          <div className="my-3 h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50"></div>
          <div className="my-3 h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50"></div>
          <div className="my-3 h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50"></div>
        </div>
      )}

      {columnData[0] !== "-1" && (
        <div
          style={{
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="playbackElem baseVertFlex relative h-[240px] w-[35px]"
        >
          <div className="baseVertFlex mb-[3.2rem] mt-4">
            {columnData.map((note, index) => (
              <Fragment key={index}>
                {index === 0 && (
                  <div className="baseFlex h-7 w-full">
                    <PlaybackPalmMuteNode value={note} />
                  </div>
                )}

                {index > 0 && index < 7 && (
                  <div
                    style={{
                      borderTop: `${
                        index === 1 ? "2px solid rgb(253 242 248)" : "none"
                      }`,
                      paddingTop: `${index === 1 ? "7px" : "0"}`,
                      borderLeft: isFirstChordInSection
                        ? "2px solid white"
                        : "none",
                      borderRight: isLastChordInSection
                        ? "2px solid white"
                        : "none",
                      borderRadius:
                        isFirstChordInSection && index === 1
                          ? "10px 0 0 0" // top left
                          : isFirstChordInSection && index === 6
                            ? "0 0 0 10px" // bottom left
                            : "none",
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
                      <div
                        style={{
                          color: isHighlighted
                            ? "hsl(335, 78%, 55%)"
                            : "hsl(324, 77%, 95%)",
                        }}
                        className="transition-colors"
                      >
                        {note}
                      </div>
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
                      {/* TODO: probably keep columnData[8] to be "1/4th", "1/8th", "1/16th" like regular
                          tab data during compilation process instead of 1, 0.5, 0.25 for consistency */}

                      {/* {columnData[7]?.includes("^") && (
                        <div className="relative top-1 rotate-180">v</div>
                      )}
                      {columnData[7]?.includes("v") && <div>v</div>}
                      {columnData[7]?.includes("s") && <div>s</div>}
                      {columnData[7]?.includes(">") && <div>{">"}</div>}
                      {columnData[7]?.includes(".") && (
                        <div className="relative bottom-2">.</div>
                      )} */}

                      <div className="baseFlex">
                        {columnData[7]?.includes("v") && (
                          <BsArrowDown
                            style={{
                              width: "15px",
                              height: "15px",
                            }}
                            strokeWidth={
                              columnData[7]?.includes(">") ? "1.25px" : "0px"
                            }
                          />
                        )}
                        {columnData[7]?.includes("^") && (
                          <BsArrowUp
                            style={{
                              width: "15px",
                              height: "15px",
                            }}
                            strokeWidth={
                              columnData[7]?.includes(">") ? "1.25px" : "0px"
                            }
                          />
                        )}

                        {columnData[7]?.includes("s") && (
                          <div
                            style={{ fontSize: "20px" }}
                            className={`baseFlex mb-1 h-5 leading-[0] ${columnData[7]?.includes(">") ? "font-semibold" : "font-normal"}`}
                          >
                            {columnData[7]?.[0]}
                          </div>
                        )}

                        {columnData[7]?.includes(".") && (
                          <div
                            style={{
                              fontSize: "30px",
                              position: "relative",
                              bottom: "15px",
                              width: columnData[7] === "." ? "10px" : "0px",
                            }}
                          >
                            .
                          </div>
                        )}
                      </div>

                      {columnData[9] !== "1" && (
                        <div>
                          {getDynamicNoteLengthIcon(
                            columnData[9] === "0.5" ? "1/8th" : "1/16th",
                          )}
                        </div>
                      )}

                      {columnData[7] === "" && <div className="h-5 w-4"></div>}
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackTabChord;
