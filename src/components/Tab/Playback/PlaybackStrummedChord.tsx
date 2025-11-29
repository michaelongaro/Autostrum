import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import { getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import type { BaseNoteLengths, FullNoteLengths } from "~/stores/TabStore";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { useTabStore } from "~/stores/TabStore";
import ColoredChordIndicator from "~/components/ui/ColoredChordIndicator";

interface PlaybackStrummedChord {
  strumIndex: number;
  strum: string;
  palmMute?: string;
  chordName?: string;
  chordColor?: string;
  noteLength: FullNoteLengths;
  bpmToShow?: number;
  isFirstChordInSection: boolean;
  isLastChordInSection: boolean;
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
  strumIndex,
  strum,
  palmMute,
  chordName = "",
  chordColor = "",
  noteLength,
  bpmToShow,
  isFirstChordInSection,
  isLastChordInSection,
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
    <>
      {/* not my favorite, but strumIndex of -1 indicates a physical spacer between strumming
        patterns and/or tab sections */}
      {strumIndex === -1 && (
        <div
          style={{
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="baseVertFlex mb-[72px] h-[144px] w-4 shrink-0 border-y-2 border-foreground mobilePortrait:h-[168px]"
        >
          {/* spacer to ease transition from strum -> tab */}
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-foreground/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-foreground/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-foreground/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-foreground/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-foreground/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-foreground/50 to-transparent mobilePortrait:my-3"></div>
        </div>
      )}

      {strumIndex !== -1 && (
        <div
          style={{
            borderLeft: isFirstChordInSection ? "2px solid" : "none",
            borderRight: isLastChordInSection ? "2px solid" : "none",
            borderRadius: isFirstChordInSection
              ? "10px 0 0 10px"
              : isLastChordInSection
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

          <div
            style={{
              color: isHighlighted
                ? "hsl(var(--primary))"
                : "hsl(var(--foreground))",
              transitionDuration: "75ms",
            }}
            className="relative mb-2 h-6 w-6 text-sm font-semibold transition-colors"
          >
            {chordDisplayMode === "color" && chordColor && chordName ? (
              <div className="absolute left-1/2 top-0 -translate-x-1/2 transform">
                <ColoredChordIndicator
                  color={chordColor}
                  chordName={chordName}
                  size="sm"
                  isHighlighted={isHighlighted}
                />
              </div>
            ) : (
              <div
                // TODO: not sure if this will ever be possible given how it interacts with
                // palm mutes... but the idea is not bad I think.
                // ${isRaised ? "top-[-1rem]" : ""}
                className={`absolute left-1/2 top-0 -translate-x-1/2 transform text-nowrap`}
              >
                {chordName}
              </div>
            )}
          </div>

          {/* strum icon */}
          <div className="baseFlex">
            {/* spacer so that PM nodes can be connected seamlessly above */}
            <div className="w-1"></div>

            <div
              style={{
                color: isHighlighted
                  ? "hsl(var(--primary))"
                  : "hsl(var(--foreground))",
              }}
              className="baseVertFlex relative mb-2 h-[20px] text-lg transition-colors"
            >
              <div className="baseFlex">
                {strum.includes("v") && (
                  <BsArrowDown
                    style={{
                      width: strum.includes(">") ? "18.5px" : "20px",
                      height: strum.includes(">") ? "18.5px" : "20px",
                    }}
                    strokeWidth={strum.includes(">") ? "1.25px" : "0px"}
                  />
                )}
                {strum.includes("^") && (
                  <BsArrowUp
                    style={{
                      width: strum.includes(">") ? "18.5px" : "20px",
                      height: strum.includes(">") ? "18.5px" : "20px",
                    }}
                    strokeWidth={strum.includes(">") ? "1.25px" : "0px"}
                  />
                )}

                {strum.includes("s") && (
                  <div
                    style={{ fontSize: "20px" }}
                    className={`baseFlex mb-1 h-5 leading-[0] ${strum.includes(">") ? "font-semibold" : "font-normal"}`}
                  >
                    {strum[0]}
                  </div>
                )}

                {strum.includes(".") && (
                  <div
                    style={{ fontSize: "30px" }}
                    // className="absolute bottom-[-9px]"
                    className="relative bottom-0 right-1 w-0"
                  >
                    .
                  </div>
                )}
              </div>

              {strum === "r" && <PauseIcon className="size-3" />}

              {strum === "" && <div className="h-5 w-4"></div>}
            </div>

            {/* spacer so that PM nodes can be connected seamlessly above */}
            <div className="w-1"></div>
          </div>

          {/* beat indicator */}
          <span className="text-sm">{beatIndicator}</span>

          <div className="h-4 w-full">
            {renderStrummingGuide({
              previousNoteLength: prevChordNoteLength,
              currentNoteLength: currentChordNoteLength,
              nextNoteLength: nextChordNoteLength,
              previousIsRestStrum: prevChordIsRest,
              currentIsRestStrum: currentChordIsRest,
              nextIsRestStrum: nextChordIsRest,
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackStrummedChord;
