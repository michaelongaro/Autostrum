import { Fragment } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import PlaybackLoopRangeNode from "~/components/Tab/Playback/PlaybackLoopRangeNode";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { type FullNoteLengths, useTabStore } from "~/stores/TabStore";
import { getLoopRangeNodePresentation } from "~/utils/loopRangeHelpers";
import { QuarterNote } from "~/utils/noteLengthIcons";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";

interface PlaybackTabChord {
  columnData: string[];
  chordIndex?: number;
  isFirstChord: boolean;
  isLastChord: boolean;
  isFirstChordInTab: boolean;
  isLastChordInTab: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  prevChordNoteLength?: FullNoteLengths;
  currentChordNoteLength?: FullNoteLengths;
  nextChordNoteLength?: FullNoteLengths;
  prevChordIsRest: boolean;
  currentChordIsRest: boolean;
  nextChordIsRest: boolean;
  showBpm: boolean;
}

function PlaybackTabChord({
  columnData,
  chordIndex,
  isFirstChord,
  isLastChord,
  isFirstChordInTab,
  isLastChordInTab,
  isHighlighted,
  isDimmed,
  prevChordNoteLength,
  currentChordNoteLength,
  nextChordNoteLength,
  prevChordIsRest,
  currentChordIsRest,
  nextChordIsRest,
  showBpm,
}: PlaybackTabChord) {
  const chordEffect = columnData[7] || "";
  const {
    audioMetadata,
    draftLoopStartIndex,
    draftLoopEndIndex,
    selectPlaybackLoopRangeChord,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
    selectPlaybackLoopRangeChord: state.selectPlaybackLoopRangeChord,
  }));
  const showLoopNode =
    audioMetadata.editingLoopRange && typeof chordIndex === "number";
  const loopNodePresentation = showLoopNode
    ? getLoopRangeNodePresentation({
        index: chordIndex,
        isSelectableChord: true,
        draftStartIndex: draftLoopStartIndex,
        draftEndIndex: draftLoopEndIndex,
        fullTabMetadataLength: audioMetadata.fullTabMetadataLength,
      })
    : null;

  return (
    // Keep loop-range nodes outside the dimmed wrapper so chord dimming
    // cannot make an enabled + look disabled (or vice versa).
    <div className="baseVertFlex relative w-[34px]">
      <div
        style={{
          opacity: isDimmed ? 0.5 : 1,
          transition: "opacity 0.5s",
        }}
        className="baseVertFlex w-full"
      >
        <div className="baseVertFlex mb-[-18px]">
        {/* show new current bpm */}
        {showBpm && (
          <div
            className={`baseFlex absolute left-[4px] gap-[2px] text-xs text-foreground ${columnData[0] === "start" ? "top-[-20px]" : "top-[4px]"}`}
          >
            <QuarterNote />
            <span>{columnData[9]}</span>
          </div>
        )}

        {columnData.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              <div className="baseFlex h-7 w-full">
                <PlaybackPalmMuteNode value={note} />
              </div>
            )}

            {index > 0 && index < 7 && (
              <div
                // key is just used here to force a re-render, borderRadius was glitchy
                key={
                  isFirstChordInTab
                    ? "firstRounded"
                    : isLastChordInTab
                      ? "lastRounded"
                      : "regular"
                }
                style={{
                  borderTop: `${index === 1 ? "2px solid" : "none"}`,
                  paddingTop: `${index === 1 ? "7px" : "0"}`,
                  borderLeft: isFirstChordInTab ? "2px solid" : "none",
                  borderRight: isLastChordInTab ? "2px solid" : "none",
                  borderRadius:
                    isFirstChordInTab && index === 1
                      ? "10px 0 0 0" // top left
                      : isFirstChordInTab && index === 6
                        ? "0 0 0 10px" // bottom left
                        : isLastChordInTab && index === 1
                          ? "0 10px 0 0" // top right
                          : isLastChordInTab && index === 6
                            ? "0 0 10px 0" // bottom right
                            : "none",
                  borderBottom: `${index === 6 ? "2px solid" : "none"}`,
                  paddingBottom: `${index === 6 ? "7px" : "0"}`,
                }}
                className="baseFlex headerModalGradient relative w-[34px] basis-[content]"
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
                {renderNoteLengthGuide({
                  previousNoteLength: prevChordNoteLength,
                  currentNoteLength: currentChordNoteLength,
                  nextNoteLength: nextChordNoteLength,
                  previousIsRestStrum: prevChordIsRest,
                  currentIsRestStrum: currentChordIsRest,
                  nextIsRestStrum: nextChordIsRest,
                  isFirstInGroup: isFirstChord,
                  isLastInGroup: isLastChord,
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

      {loopNodePresentation && typeof chordIndex === "number" && (
        <div className="baseFlex mt-1 h-7 w-full">
          <PlaybackLoopRangeNode
            role={loopNodePresentation.role}
            opacity={loopNodePresentation.opacity}
            disabled={loopNodePresentation.disabled}
            onSelect={() => selectPlaybackLoopRangeChord(chordIndex)}
          />
        </div>
      )}
    </div>
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

          // "x" wasn't as centered as regular numbers were, manual adjustment below
          marginTop: note === "x" ? "-2px" : "0",
          marginBottom: note === "x" ? "2px" : "0",
        }}
        className={`baseFlex relative h-[20px] ${isAccented ? "font-bold" : ""}`}
      >
        {isRest ? (
          <PauseIcon className="absolute bottom-[15px] size-3" />
        ) : (
          <div>{note}</div>
        )}

        {isStaccato && <div className="relative -top-2">.</div>}
      </div>
      <div className="my-[10px] h-[1px] flex-[1] bg-foreground/50 mobilePortrait:my-3"></div>
    </div>
  );
}
