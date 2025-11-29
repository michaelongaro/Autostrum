import { useMemo } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  useTabStore,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME } from "~/stores/TabStore";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { generateBeatLabels } from "~/utils/getBeatIndicator";
import ColoredChordIndicator from "~/components/ui/ColoredChordIndicator";

interface StaticStrummingPattern {
  data: StrummingPatternType;
  chordSequenceData?: string[];
  color: COLORS;
  theme: THEME;
}

function StaticStrummingPattern({
  data,
  chordSequenceData,
  color,
  theme,
}: StaticStrummingPattern) {
  const { chords, chordDisplayMode } = useTabStore((state) => ({
    chords: state.chords,
    chordDisplayMode: state.chordDisplayMode,
  }));

  const heightOfStrummingPatternFiller = useMemo(() => {
    const patternHasPalmMuting = data.strums.some(
      (strum) => strum.palmMute !== "",
    );

    return patternHasPalmMuting ? "24px" : "0";
  }, [data]);

  const beatLabels = useMemo(() => {
    const strumsWithNoteLengths = data.strums.map((strum) => {
      return strum.noteLength;
    });

    return generateBeatLabels(strumsWithNoteLengths);
  }, [data]);

  return (
    <div className="baseFlex w-full flex-wrap !justify-start gap-1">
      <div className="baseFlex relative mb-1 flex-wrap !justify-start">
        {data?.strums?.map((strum, strumIndex) => (
          <div key={strumIndex} className="baseVertFlex relative">
            {/* palm mute icon */}
            <div
              style={{
                height: heightOfStrummingPatternFiller,
              }}
              className="baseFlex w-full"
            >
              {strum.palmMute !== "" && (
                <StaticPalmMuteNode
                  value={strum.palmMute}
                  color={color}
                  theme={theme}
                />
              )}
            </div>

            {/* chord viewer */}
            {strum.strum.includes("s") ||
            strum.strum === "r" ||
            strum.strum === "" ? (
              <div className="h-[28px]"></div>
            ) : chordDisplayMode === "color" ? (
              <Popover>
                <PopoverTrigger
                  asChild
                  disabled={chordSequenceData?.[strumIndex] === ""}
                  className="baseFlex rounded-md transition-all hover:bg-primary/20 active:hover:bg-primary/10"
                >
                  <Button
                    variant={"ghost"}
                    className="baseFlex mb-1 h-7 px-1 py-0"
                  >
                    {(() => {
                      const chordName = chordSequenceData?.[strumIndex] ?? "";
                      const chord = chords.find((c) => c.name === chordName);
                      return chord ? (
                        <ColoredChordIndicator
                          color={chord.color}
                          chordName={chord.name}
                          size="md"
                        />
                      ) : (
                        <div className="size-6" />
                      );
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  sideOffset={0}
                  className="z-0 size-40 border bg-secondary p-0 py-3"
                >
                  <ChordDiagram
                    originalFrets={
                      chords[
                        chords.findIndex(
                          (chord) =>
                            chord.name === chordSequenceData?.[strumIndex],
                        ) ?? 0
                      ]?.frets ?? []
                    }
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Popover>
                <PopoverTrigger
                  asChild
                  disabled={chordSequenceData?.[strumIndex] === ""}
                  className="baseFlex rounded-md transition-all hover:bg-primary/20 active:hover:bg-primary/10"
                >
                  <Button
                    variant={"ghost"}
                    style={{
                      color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                    }}
                    className="baseFlex mb-1 h-6 px-1 py-0"
                  >
                    <span className="mx-0.5 h-6 text-base font-semibold">
                      {chordSequenceData?.[strumIndex]}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  sideOffset={0}
                  className="z-0 size-40 border bg-secondary p-0 py-3"
                >
                  <ChordDiagram
                    originalFrets={
                      chords[
                        chords.findIndex(
                          (chord) =>
                            chord.name === chordSequenceData?.[strumIndex],
                        ) ?? 0
                      ]?.frets ?? []
                    }
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* strum icon */}
            <div className="baseFlex h-7">
              {/* spacer so that PM nodes can be connected seamlessly above */}
              <div className="w-1"></div>

              <div
                style={{
                  color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="baseVertFlex relative mb-2 h-[20px] text-lg"
              >
                {strum.strum.includes("v") && (
                  <BsArrowDown
                    style={{
                      width: strum.strum.includes(">") ? "18.5px" : "20px",
                      height: strum.strum.includes(">") ? "18.5px" : "20px",
                    }}
                    strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
                  />
                )}

                {strum.strum.includes("^") && (
                  <BsArrowUp
                    style={{
                      width: strum.strum.includes(">") ? "18.5px" : "20px",
                      height: strum.strum.includes(">") ? "18.5px" : "20px",
                    }}
                    strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
                  />
                )}

                {strum.strum.includes("s") && (
                  <div
                    style={{
                      fontSize: "20px",
                    }}
                    className={`baseFlex mb-1 h-5 leading-[0] ${
                      strum.strum.includes(">")
                        ? "font-semibold"
                        : "font-normal"
                    }`}
                  >
                    {strum.strum[0]}
                  </div>
                )}

                {strum.strum.includes(".") && (
                  <div
                    style={{
                      fontSize: "30px",
                    }}
                    className="absolute bottom-[12px] right-[-2px]"
                  >
                    .
                  </div>
                )}

                {strum.strum === "r" && <PauseIcon className="size-3" />}

                {strum.strum === "" && <div className="h-5 w-4"></div>}
              </div>

              {/* spacer so that PM nodes can be connected seamlessly above */}
              <div className="w-1"></div>
            </div>

            {/* beat indicator */}
            <span
              style={{
                color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className="text-sm"
            >
              {beatLabels[strumIndex]}
            </span>

            {/* strumming guide */}
            <div className="h-4 w-full">
              {renderStrummingGuide({
                previousNoteLength: data.strums[strumIndex - 1]?.noteLength,
                currentNoteLength: strum.noteLength,
                nextNoteLength: data.strums[strumIndex + 1]?.noteLength,
                previousIsRestStrum: data.strums[strumIndex - 1]?.strum === "r",
                currentIsRestStrum: strum.strum === "r",
                nextIsRestStrum: data.strums[strumIndex + 1]?.strum === "r",
                color,
                theme,
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StaticStrummingPattern;
