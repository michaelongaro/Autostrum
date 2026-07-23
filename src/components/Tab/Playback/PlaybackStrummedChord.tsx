import { memo } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import { getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";
import type { FullNoteLengths } from "~/stores/TabStore";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { useTabStore } from "~/stores/TabStore";
import ChordName from "~/components/ui/ChordName";

interface PlaybackStrummedChord {
  strum: string;
  palmMute?: string;
  chordName?: string;
  chordColor?: string;
  noteLength: FullNoteLengths;
  bpmToShow?: number;
  isFirstChord: boolean;
  isLastChord: boolean;
  isFirstChordInTab: boolean;
  isLastChordInTab: boolean;
  isHighlighted?: boolean;
  isDimmed: boolean;
  beatIndicator: string;
  prevChordNoteLength?: FullNoteLengths;
  currentChordNoteLength?: FullNoteLengths;
  nextChordNoteLength?: FullNoteLengths;
  prevChordIsRest: boolean;
  currentChordIsRest: boolean;
  nextChordIsRest: boolean;
}

function PlaybackStrummedChord({
  strum,
  palmMute,
  chordName = "",
  chordColor = "",
  noteLength,
  bpmToShow,
  isFirstChord,
  isLastChord,
  isFirstChordInTab,
  isLastChordInTab,
  isHighlighted = false,
  isDimmed,
  beatIndicator,
  prevChordNoteLength,
  currentChordNoteLength,
  nextChordNoteLength,
  prevChordIsRest,
  currentChordIsRest,
  nextChordIsRest,
}: PlaybackStrummedChord) {
  const { chordDisplayMode } = useTabStore((state) => ({
    chordDisplayMode: state.chordDisplayMode,
  }));

  return (
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
        borderLeft: isFirstChordInTab ? "2px solid" : "none",
        borderRight: isLastChordInTab ? "2px solid" : "none",
        borderRadius: isFirstChordInTab
          ? "10px 0 0 10px"
          : isLastChordInTab
            ? "0 10px 10px 0"
            : "none",
        borderTop: "2px solid",
        borderBottom: "2px solid",
        opacity: isDimmed ? 0.5 : 1,
        transition: "opacity 0.5s",
      }}
      className="baseVertFlex relative mb-[72px] h-[144px] w-[40px] pb-4 mobilePortrait:h-[168px]"
    >
      {bpmToShow && (
        <div className="baseFlex absolute left-[16px] top-[-1.5rem] gap-[6px] text-nowrap text-xs">
          {getDynamicNoteLengthIcon({
            noteLength,
          })}
          <span>{`${bpmToShow} BPM`}</span>
        </div>
      )}

      {/* palm mute icon */}
      <div className="baseFlex h-6 w-full">
        {palmMute && palmMute !== "" && (
          <PlaybackPalmMuteNode value={palmMute} />
        )}
      </div>

      <div className="baseFlex h-8">
        {chordName && (
          <ChordName
            color={chordColor}
            name={chordName}
            truncate={true}
            isHighlighted={isHighlighted}
          />
        )}
      </div>

      {/* strum icon */}
      <div className="baseFlex">
        {/* spacer so that PM nodes can be connected seamlessly above */}
        <div className="w-1"></div>

        <div
          style={{
            color:
              chordDisplayMode === "color" && chordColor
                ? chordColor
                : isHighlighted
                  ? "hsl(var(--primary))"
                  : "hsl(var(--foreground))",
          }}
          className="baseVertFlex relative mb-2 h-[20px] text-lg"
        >
          <div className="baseFlex">
            {strum.includes("v") && (
              <BsArrowDown
                style={{
                  fill:
                    chordDisplayMode === "color" && chordColor
                      ? chordColor
                      : "currentColor",
                  width: strum.includes(">") ? "18.5px" : "20px",
                  height: strum.includes(">") ? "18.5px" : "20px",
                }}
                strokeWidth={strum.includes(">") ? "1.25px" : "0px"}
              />
            )}
            {strum.includes("^") && (
              <BsArrowUp
                style={{
                  fill:
                    chordDisplayMode === "color" && chordColor
                      ? chordColor
                      : "currentColor",
                  width: strum.includes(">") ? "18.5px" : "20px",
                  height: strum.includes(">") ? "18.5px" : "20px",
                }}
                strokeWidth={strum.includes(">") ? "1.25px" : "0px"}
              />
            )}

            {strum.includes("s") && (
              <div
                style={{
                  fontSize: "20px",
                  color:
                    chordDisplayMode === "color" && chordColor
                      ? chordColor
                      : "currentColor",
                }}
                className={`baseFlex mb-1 h-5 leading-[0] ${strum.includes(">") ? "font-semibold" : "font-normal"}`}
              >
                {strum[0]}
              </div>
            )}

            {strum.includes(".") && (
              <div
                style={{
                  fontSize: "30px",
                  color:
                    chordDisplayMode === "color" && chordColor
                      ? chordColor
                      : "currentColor",
                }}
                // className="absolute bottom-[-9px]"
                className="relative bottom-0 right-1 w-0"
              >
                .
              </div>
            )}
          </div>

          {strum === "r" && (
            <PauseIcon
              className="size-3"
              style={{
                color:
                  chordDisplayMode === "color" && chordColor
                    ? chordColor
                    : "currentColor",
              }}
            />
          )}

          {strum === "" && <div className="h-5 w-4"></div>}
        </div>

        {/* spacer so that PM nodes can be connected seamlessly above */}
        <div className="w-1"></div>
      </div>

      {/* beat indicator */}
      <span className="text-sm">{beatIndicator}</span>

      <div className="h-4 w-full">
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
    </div>
  );
}

export default memo(PlaybackStrummedChord);
