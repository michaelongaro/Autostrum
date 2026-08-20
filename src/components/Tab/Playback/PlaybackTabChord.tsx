import { Fragment } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import PlaybackLoopRangeNode from "~/components/Tab/Playback/PlaybackLoopRangeNode";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { type FullNoteLengths, useTabStore } from "~/stores/TabStore";
import { getLoopRangeNodePresentation } from "~/utils/loopRangeHelpers";
import { QuarterNote } from "~/utils/noteLengthIcons";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";
import { PLAYBACK_TAB_STRINGS_HEIGHT_PX } from "~/utils/playbackTabGeometry";

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
  isLastChordInTab: _isLastChordInTab,
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
      <div className={`baseVertFlex w-full ${isDimmed ? "opacity-50" : ""}`}>
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

              {index === 1 && (
                <div
                  key={isFirstChordInTab ? "firstRounded" : "regular"}
                  className="baseVertFlex relative w-[34px]"
                >
                  {isFirstChordInTab && (
                    <div
                      className="absolute left-0 top-3 w-[1px] bg-foreground/50"
                      style={{ height: PLAYBACK_TAB_STRINGS_HEIGHT_PX }}
                    ></div>
                  )}

                  {columnData.slice(1, 7).map((stringNote, stringOffset) => {
                    const stringIndex = stringOffset + 1;
                    return (
                      <div
                        key={stringIndex}
                        className="baseFlex relative w-[34px] basis-[content]"
                      >
                        <div className="h-[1px] flex-[1] bg-foreground/50"></div>

                        <PlaybackTabNote
                          note={
                            stringNote.includes(">")
                              ? stringNote.slice(0, stringNote.length - 1)
                              : stringNote.includes(".")
                                ? stringNote.slice(0, stringNote.length - 1)
                                : stringNote
                          }
                          isHighlighted={isHighlighted}
                          isAccented={
                            stringNote.includes(">") ||
                            columnData[7]?.includes(">")
                          }
                          isStaccato={
                            stringNote.includes(".") &&
                            !columnData[7]?.includes(".")
                          }
                          isRest={stringIndex === 4 && columnData[7] === "r"}
                        />

                        <div className="h-[1px] flex-[1] bg-foreground/50"></div>
                      </div>
                    );
                  })}
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
                          width: chordEffect === "." ? "8px" : "0px",
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
        <div className="baseFlex mt-6 h-7 w-full">
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
      <div className="my-3 h-[1px] flex-[1] bg-foreground/50"></div>
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
      <div className="my-3 h-[1px] flex-[1] bg-foreground/50"></div>
    </div>
  );
}
