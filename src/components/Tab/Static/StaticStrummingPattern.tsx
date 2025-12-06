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
import ChordName from "~/components/ui/ChordName";

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

  // Compute the active chord color for each strum position (only when color mode is active)
  // Chords only appear at positions where they change, so we track the "current" chord
  const [strumChords, strumColors] = useMemo(() => {
    const strumChords: (string | null)[] = [];
    const colors: (string | null)[] = [];
    let currentChordColor: string | null = null;
    let lastChordName: string | null = null;

    for (let i = 0; i < data.strums.length; i++) {
      const chordName = chordSequenceData?.[i];
      if (chordName && chordName !== "") {
        // Find the chord and get its color
        const chord = chords.find((c) => c.name === chordName);
        currentChordColor = chord?.color ?? null;
      }
      strumChords.push(
        lastChordName !== chordName ? (chordName ?? null) : null,
      );
      colors.push(currentChordColor);
      if (chordName && chordName !== "" && lastChordName !== chordName) {
        lastChordName = chordName;
      }
    }

    return [strumChords, colors];
  }, [data.strums.length, chordSequenceData, chords, chordDisplayMode]);

  return (
    <div className="baseFlex w-full flex-wrap !justify-start gap-1">
      <div className="baseFlex relative mb-1 flex-wrap !justify-start">
        {data?.strums?.map((strum, strumIndex) => (
          <div key={strumIndex} className="baseVertFlex relative my-1 w-[40px]">
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
            {strumChords[strumIndex] !== "" ? (
              <Popover>
                <PopoverTrigger
                  asChild
                  className="baseFlex rounded-md transition-all hover:bg-primary/20 active:hover:bg-primary/10"
                >
                  <Button
                    variant={"ghost"}
                    className="baseFlex relative mb-1 h-7 px-1 py-0"
                  >
                    <ChordName
                      color={
                        strumColors[strumIndex] ?? "hsl(var(--foreground))"
                      }
                      name={strumChords[strumIndex]!}
                      truncate={true}
                      screenshotColor={color}
                      screenshotTheme={theme}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  sideOffset={0}
                  className="z-0 size-40 border bg-background p-0 py-3 shadow-lg"
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
              <div className="h-[32px]"></div>
            )}

            {/* strum icon */}
            <div className="baseFlex h-7">
              {/* spacer so that PM nodes can be connected seamlessly above */}
              <div className="w-1"></div>

              <div
                style={{
                  color:
                    chordDisplayMode === "color"
                      ? strumColors[strumIndex]
                        ? strumColors[strumIndex]
                        : `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`
                      : `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="baseVertFlex relative mb-2 h-[20px] text-lg transition-colors"
              >
                {strum.strum.includes("v") && (
                  <BsArrowDown
                    style={{
                      fill:
                        chordDisplayMode === "color"
                          ? (strumColors[strumIndex] ?? "currentColor")
                          : "currentColor",
                      width: strum.strum.includes(">") ? "18.5px" : "20px",
                      height: strum.strum.includes(">") ? "18.5px" : "20px",
                    }}
                    strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
                  />
                )}

                {strum.strum.includes("^") && (
                  <BsArrowUp
                    style={{
                      fill:
                        chordDisplayMode === "color"
                          ? (strumColors[strumIndex] ?? "currentColor")
                          : "currentColor",
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
                      color:
                        chordDisplayMode === "color"
                          ? (strumColors[strumIndex] ?? "currentColor")
                          : "currentColor",
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
                      color:
                        chordDisplayMode === "color"
                          ? (strumColors[strumIndex] ?? "currentColor")
                          : "currentColor",
                    }}
                    className="absolute bottom-[12px] right-[-2px]"
                  >
                    .
                  </div>
                )}

                {strum.strum === "r" && (
                  <PauseIcon
                    className="size-3"
                    style={{
                      color:
                        chordDisplayMode === "color"
                          ? (strumColors[strumIndex] ?? "currentColor")
                          : "currentColor",
                    }}
                  />
                )}

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
