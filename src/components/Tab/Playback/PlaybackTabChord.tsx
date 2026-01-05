import { Fragment } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import type { FullNoteLengths } from "~/stores/TabStore";
import { getDynamicNoteLengthIcon, QuarterNote } from "~/utils/noteLengthIcons";
import renderStrummingGuide from "~/utils/renderStrummingGuide";

interface PlaybackTabChord {
  columnData: string[];
  isFirstChordInSection: boolean;
  isLastChordInSection: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  prevChordNoteLength?: FullNoteLengths;
  currentChordNoteLength?: FullNoteLengths;
  nextChordNoteLength?: FullNoteLengths;
  prevChordIsRest: boolean;
  currentChordIsRest: boolean;
  nextChordIsRest: boolean;
}

function PlaybackTabChord({
  columnData,
  isFirstChordInSection,
  isLastChordInSection,
  isHighlighted,
  isDimmed,
  prevChordNoteLength,
  currentChordNoteLength,
  nextChordNoteLength,
  prevChordIsRest,
  currentChordIsRest,
  nextChordIsRest,
}: PlaybackTabChord) {
  const chordEffect = columnData[7] || "";

  return (
    <>
      {/* is a spacer chord, potentially with a new bpm to specify*/}
      {columnData[0] === "-1" && (
        <div
          style={{
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="baseVertFlex headerModalGradient relative mb-[72px] h-[144px] w-4 border-y-2 border-foreground mobilePortrait:h-[168px]"
        >
          {/* show new current bpm */}
          {columnData[8] !== "" && (
            <div
              className={`baseFlex absolute left-[28px] top-[-1.5rem] gap-[6px] text-xs text-foreground`}
            >
              <QuarterNote />
              <span>{columnData[8]}</span>
            </div>
          )}

          {/* spacer to ease transition from tab -> strum */}
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-foreground/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-foreground/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-foreground/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-foreground/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-foreground/50 mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-end bg-gradient-to-r from-transparent to-foreground/50 mobilePortrait:my-3"></div>
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
                      borderTop: `${index === 1 ? "2px solid" : "none"}`,
                      paddingTop: `${index === 1 ? "7px" : "0"}`,
                      borderLeft: isFirstChordInSection ? "2px solid" : "none",
                      borderRight: isLastChordInSection ? "2px solid" : "none",
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
                      borderBottom: `${index === 6 ? "2px solid" : "none"}`,
                      paddingBottom: `${index === 6 ? "7px" : "0"}`,
                    }}
                    className="baseFlex headerModalGradient relative w-[35px] basis-[content]"
                  >
                    <div className="h-[1px] flex-[1] bg-foreground/50"></div>

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
                      isRest={index === 4 && columnData[7] === "r"}
                    />

                    <div className="h-[1px] flex-[1] bg-foreground/50"></div>
                  </div>
                )}

                {index === 7 && (
                  <div className="baseFlex mt-1 h-4 w-full">
                    {renderStrummingGuide({
                      previousNoteLength: prevChordNoteLength,
                      currentNoteLength: currentChordNoteLength,
                      nextNoteLength: nextChordNoteLength,
                      previousIsRestStrum: prevChordIsRest,
                      currentIsRestStrum: currentChordIsRest,
                      nextIsRestStrum: nextChordIsRest,
                      isFirstInGroup: isFirstChordInSection,
                      isLastInGroup: isLastChordInSection,
                    })}
                  </div>
                )}

                {index === 8 && (
                  <div className="baseFlex relative mt-2 size-5">
                    {chordHasAtLeastOneNote(columnData) &&
                      chordEffect?.includes("v") && (
                        <BsArrowDown
                          style={{
                            width: "19px",
                            height: "19px",
                          }}
                          strokeWidth={
                            chordEffect?.includes(">") ? "1.25px" : "0px"
                          }
                        />
                      )}
                    {chordHasAtLeastOneNote(columnData) &&
                      chordEffect?.includes("^") && (
                        <BsArrowUp
                          style={{
                            width: "19px",
                            height: "19px",
                          }}
                          strokeWidth={
                            chordEffect?.includes(">") ? "1.25px" : "0px"
                          }
                        />
                      )}

                    {chordEffect?.includes("s") && (
                      <div
                        style={{ fontSize: "18px" }}
                        className={`baseFlex leading-[19px] ${chordEffect?.includes(">") ? "font-semibold" : "font-normal"}`}
                      >
                        s
                      </div>
                    )}

                    {chordHasAtLeastOneNote(columnData) &&
                      chordEffect?.includes(".") && (
                        <div
                          style={{
                            fontSize: "30px",
                            position: "absolute",
                            top: "-28px",
                            right: "6px",
                            width: chordEffect === "." ? "10px" : "0px",
                          }}
                        >
                          .
                        </div>
                      )}

                    {chordEffect === "" && <div className="size-full"></div>}
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
  isRest?: boolean;
}

function PlaybackTabNote({
  note,
  isHighlighted,
  isAccented,
  isStaccato,
  isRest,
}: PlaybackTabNote) {
  return (
    <div className="baseFlex w-[34px]">
      <div className="my-[10px] h-[1px] flex-[1] bg-foreground/50 mobilePortrait:my-3"></div>
      <div
        style={{
          color: isHighlighted
            ? "hsl(var(--primary))"
            : "hsl(var(--foreground))",
          transitionDuration: "75ms",

          // "x" wasn't as centered as regular numbers were, manual adjustment below
          marginTop: note === "x" ? "-2px" : "0",
          marginBottom: note === "x" ? "2px" : "0",
        }}
        className={`baseFlex relative h-[20px] transition-colors ${isAccented ? "font-bold" : ""}`}
      >
        {isRest ? (
          <PauseIcon className="absolute bottom-[17px] size-3" />
        ) : (
          <div>{note}</div>
        )}

        {isStaccato && <div className="relative -top-2">.</div>}
      </div>
      <div className="my-[10px] h-[1px] flex-[1] bg-foreground/50 mobilePortrait:my-3"></div>
    </div>
  );
}
