import { Fragment } from "react";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";

interface PlaybackTabChord {
  columnData: string[];
  isFirstChordInSection: boolean;
  isLastChordInSection: boolean;
  isHighlighted: boolean;
}

function PlaybackTabChord({
  columnData,
  isFirstChordInSection,
  isLastChordInSection,
  isHighlighted,
}: PlaybackTabChord) {
  return (
    <>
      {/* not my favorite, but PM value of "-1" indicates a physical spacer between tab and strumming
        sections */}
      {columnData[0] === "-1" && (
        <div className="baseVertFlex ornamental playbackElem mb-[3.2rem] h-[250px] w-4"></div>
      )}

      {columnData[0] !== "-1" && (
        <div className="playbackElem baseVertFlex relative h-[250px] w-[35px]">
          <div className="baseVertFlex mb-[3.2rem] mt-4">
            {columnData.map((note, index) => (
              <Fragment key={index}>
                {index === 0 && (
                  <div style={{}} className="baseFlex h-9 w-full">
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
                            : isLastChordInSection && index === 1
                              ? "0 10px 0 0" // bottom right
                              : isLastChordInSection && index === 6
                                ? "0 0 10px 0" // top right
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
                      {(columnData[8] === "1/8th" ||
                        columnData[8] === "1/16th") &&
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
        </div>
      )}
    </>
  );
}

export default PlaybackTabChord;
