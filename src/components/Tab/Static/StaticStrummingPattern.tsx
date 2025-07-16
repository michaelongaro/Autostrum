import { useCallback, useMemo } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import ChordDiagram from "~/components/Tab/Playback/ChordDiagram";
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
import renderStaticStrummingGuide from "~/utils/renderStaticStrummingGuide";

interface StaticStrummingPattern {
  data: StrummingPatternType;
  chordSequenceData?: string[];
  color: string;
  theme: "light" | "dark";
}

function StaticStrummingPattern({
  data,
  chordSequenceData,
  color,
  theme,
}: StaticStrummingPattern) {
  const { chords } = useTabStore((state) => ({
    chords: state.chords,
  }));

  function getBeatIndicator(noteLength: string, beatIndex: number) {
    let beat: number | string = "";
    switch (noteLength) {
      case "1/4th":
        beat = beatIndex + 1;
        break;
      case "1/8th":
        beat = beatIndex % 2 === 0 ? beatIndex / 2 + 1 : "&";
        break;
      case "1/16th":
        beat =
          beatIndex % 4 === 0
            ? beatIndex / 4 + 1
            : beatIndex % 2 === 0
              ? "&"
              : "";
        break;
      case "1/4th triplet":
        beat = beatIndex % 3 === 0 ? (beatIndex / 3) * 2 + 1 : "";
        break;
      case "1/8th triplet":
        beat = beatIndex % 3 === 0 ? beatIndex / 3 + 1 : "";
        break;
      case "1/16th triplet":
        beat =
          beatIndex % 3 === 0
            ? (beatIndex / 3) % 2 === 0
              ? beatIndex / 3 / 2 + 1
              : "&"
            : "";
        break;
    }
    return beat.toString();
  }

  const patternHasPalmMuting = useCallback(() => {
    return data.strums.some((strum) => strum.palmMute !== "");
  }, [data]);

  const heightOfStrummingPatternFiller = useMemo(() => {
    return patternHasPalmMuting() ? "2.2rem" : "0rem";
  }, [patternHasPalmMuting]);

  return (
    <div className="baseFlex w-full flex-wrap !justify-start gap-1">
      <div className="baseFlex relative mb-1 flex-wrap !justify-start">
        {data?.strums?.map((strum, strumIndex) => (
          <div key={strumIndex} className="baseVertFlex relative mt-1">
            {strum.palmMute !== "" ? (
              <StaticPalmMuteNode
                value={strum.palmMute}
                color={color}
                theme={theme}
              />
            ) : (
              <div
                style={{
                  height: heightOfStrummingPatternFiller,
                }}
              ></div>
            )}

            {/* chord viewer */}
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

            <div className="baseFlex">
              <div className="gap-1"></div>
              {/* spacer so that PM nodes can be connected seamlessly above */}
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
                    className="absolute bottom-[-9px]"
                  >
                    .
                  </div>
                )}

                {strum.strum === "" && <div className="h-5 w-4"></div>}
              </div>

              <div className="w-1"></div>
              {/* spacer so that PM nodes can be connected seamlessly above */}
            </div>

            {/* beat indicator */}
            <span
              style={{
                height:
                  getBeatIndicator(data.noteLength, strumIndex) === ""
                    ? "1.25rem"
                    : "auto",
                color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className="text-sm"
            >
              {getBeatIndicator(data.noteLength, strumIndex)}
            </span>

            {/* strumming guide */}
            {renderStaticStrummingGuide(
              data.noteLength,
              strumIndex,
              color,
              theme,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StaticStrummingPattern;
