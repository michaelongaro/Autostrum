import { Fragment } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import {
  getDynamicNoteLengthIcon,
  QuarterNote,
} from "~/utils/bpmIconRenderingHelpers";

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
      {/* is a spacer chord, potentially with a new bpm to specify*/}
      {columnData[0] === "-1" && (
        <div
          style={{
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="baseVertFlex relative mb-[24px] h-[144px] w-4 border-y-2 border-white mobilePortrait:h-[168px]"
        >
          {/* show new current bpm */}
          {columnData[8] !== "" && (
            <div
              className={`baseFlex absolute -top-7 gap-[0.125rem] text-pink-100`}
            >
              <QuarterNote />
              <p className="text-center text-xs">{columnData[8]}</p>
            </div>
          )}

          {/* spacer to ease transition from tab -> strum */}
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-pink-100/50 mobilePortrait:my-3"></div>
        </div>
      )}

      {/* is a regular chord, don't really like this jsx though */}
      {columnData[0] !== "-1" && (
        <div
          style={{
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="baseVertFlex relative w-[35px]"
        >
          <div className="baseVertFlex mb-[3.2rem]">
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
                            : isLastChordInSection && index === 1
                              ? "0 10px 0 0" // top right
                              : isLastChordInSection && index === 6
                                ? "0 0 10px 0" // bottom right
                                : "none",
                      borderBottom: `${
                        index === 6 ? "2px solid rgb(253 242 248)" : "none"
                      }`,
                      paddingBottom: `${index === 6 ? "7px" : "0"}`,
                    }}
                    className="baseFlex relative w-[35px] basis-[content]"
                  >
                    <div className="h-[1px] flex-[1] bg-pink-100/50"></div>

                    <PlaybackTabNote
                      note={
                        note.includes(">")
                          ? note.slice(0, note.length - 1)
                          : note.includes(".")
                            ? note.slice(0, note.length - 1)
                            : note
                      }
                      isHighlighted={isHighlighted}
                      isAccented={
                        note.includes(">") || columnData[7]?.includes(">")
                      }
                      isStaccato={
                        note.includes(".") && !columnData[7]?.includes(".") // felt distracting to see the staccato on every note w/in the chord
                      }
                    />

                    <div className="h-[1px] flex-[1] bg-pink-100/50"></div>
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
                      <div className="baseFlex">
                        {chordHasAtLeastOneNote(columnData) &&
                          columnData[7]?.includes("v") && (
                            <BsArrowDown
                              style={{
                                width: "19px",
                                height: "19px",
                              }}
                              strokeWidth={
                                columnData[7]?.includes(">") ? "1.25px" : "0px"
                              }
                            />
                          )}
                        {chordHasAtLeastOneNote(columnData) &&
                          columnData[7]?.includes("^") && (
                            <BsArrowUp
                              style={{
                                width: "19px",
                                height: "19px",
                              }}
                              strokeWidth={
                                columnData[7]?.includes(">") ? "1.25px" : "0px"
                              }
                            />
                          )}

                        {columnData[7]?.includes("s") && (
                          <div
                            style={{ fontSize: "18px" }}
                            className={`baseFlex leading-[19px] ${columnData[7]?.includes(">") ? "font-semibold" : "font-normal"}`}
                          >
                            s
                          </div>
                        )}

                        {chordHasAtLeastOneNote(columnData) &&
                          columnData[7]?.includes(".") && (
                            <div
                              style={{
                                fontSize: "30px",
                                position: "absolute",
                                top: "-13px",
                                right: "7px",
                                width: columnData[7] === "." ? "10px" : "0px",
                              }}
                            >
                              .
                            </div>
                          )}
                      </div>

                      {columnData[9] !== "1" && (
                        // slaps are treated as regular chords in regards to note length icons
                        <div
                          style={{
                            marginTop:
                              (columnData[7]?.includes("s") ||
                                chordHasAtLeastOneNote(columnData)) &&
                              columnData[7] !== ""
                                ? "5px"
                                : "0",
                          }}
                        >
                          {getDynamicNoteLengthIcon({
                            noteLength:
                              columnData[9] === "0.5" ? "1/8th" : "1/16th",
                            isARestNote:
                              !columnData[7]?.includes("s") &&
                              columnData
                                .slice(1, 7)
                                .every((note) => note === ""),
                          })}
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

function chordHasAtLeastOneNote(chordData: string[]): boolean {
  return chordData.slice(1, 7).some((note) => note !== "");
}

export default PlaybackTabChord;

interface PlaybackTabNote {
  note: string;
  isHighlighted: boolean;
  isAccented?: boolean;
  isStaccato?: boolean;
}

function PlaybackTabNote({
  note,
  isHighlighted,
  isAccented,
  isStaccato,
}: PlaybackTabNote) {
  return (
    <div className="baseFlex w-[35px]">
      <div className="my-[10px] h-[1px] flex-[1] bg-pink-100/50 mobilePortrait:my-3"></div>
      <div
        style={{
          color: isHighlighted ? "hsl(335, 78%, 55%)" : "hsl(324, 77%, 95%)",

          // "x" wasn't as centered as regular numbers were, manual adjustment below
          marginTop: note === "x" ? "-2px" : "0",
          marginBottom: note === "x" ? "2px" : "0",
          transitionDuration: "75ms",
        }}
        className={`baseFlex relative h-[20px] transition-colors ${isAccented ? "font-bold" : ""}`}
      >
        {note}
        {isStaccato && <div className="relative -top-2">.</div>}
      </div>
      <div className="my-[10px] h-[1px] flex-[1] bg-pink-100/50 mobilePortrait:my-3"></div>
    </div>
  );
}
