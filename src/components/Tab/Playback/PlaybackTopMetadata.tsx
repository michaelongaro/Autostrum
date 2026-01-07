import { type Dispatch, type SetStateAction, useMemo } from "react";
import { FaBook } from "react-icons/fa";
import AnimatedTabs from "~/components/ui/AnimatedTabs";
import { Button } from "~/components/ui/button";
import TuningFork from "~/components/ui/icons/TuningFork";
import { Label } from "~/components/ui/label";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Separator } from "~/components/ui/separator";
import { useTabStore } from "~/stores/TabStore";
import { getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { tuningNotesToName } from "~/utils/tunings";

interface PlaybackTopMetadata {
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
}

function PlaybackTopMetadata({
  tabProgressValue,
  setTabProgressValue,
}: PlaybackTopMetadata) {
  const {
    title,
    tuning,
    capo,
    sectionProgression,
    audioMetadata,
    playbackMetadata,
    currentChordIndex,
    viewportLabel,
    countInTimer,
    playbackSpeed,
    pauseAudio,
    setPlaybackSpeed,
    setShowGlossaryDialog,
    setAudioMetadata,
    setCurrentChordIndex,
  } = useTabStore((state) => ({
    title: state.title,
    tuning: state.tuning,
    capo: state.capo,
    sectionProgression: state.sectionProgression,
    audioMetadata: state.audioMetadata,
    playbackMetadata: state.playbackMetadata,
    currentChordIndex: state.currentChordIndex,
    viewportLabel: state.viewportLabel,
    countInTimer: state.countInTimer,
    playbackSpeed: state.playbackSpeed,
    pauseAudio: state.pauseAudio,
    setPlaybackSpeed: state.setPlaybackSpeed,
    setShowGlossaryDialog: state.setShowGlossaryDialog,
    setAudioMetadata: state.setAudioMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
  }));

  const uniqueSections = useMemo(() => {
    const sections: Record<string, { sectionId: string; title: string }> = {};

    for (const section of sectionProgression) {
      if (!sections[section.sectionId]) {
        sections[section.sectionId] = {
          sectionId: section.sectionId,
          title: section.title,
        };
      }
    }

    return Object.values(sections);
  }, [sectionProgression]);

  if (playbackMetadata === null || viewportLabel === "mobileNarrowLandscape") {
    return null;
  }

  return (
    <>
      {viewportLabel === "mobileLandscape" ? (
        <div className="baseVertFlex w-full gap-2">
          <div className="baseFlex w-full !justify-start gap-4 px-4 pt-2">
            <div className="baseFlex !justify-start">
              <OverlayScrollbarsComponent
                options={{
                  scrollbars: { autoHide: "leave", autoHideDelay: 150 },
                  overflow: {
                    x: "scroll",
                    y: "hidden",
                  },
                }}
                defer
                className="size-full max-w-[60vw]"
              >
                <span className="whitespace-nowrap text-xl font-bold tablet:text-2xl">
                  {title}
                </span>
              </OverlayScrollbarsComponent>
            </div>

            <Separator className="h-4 w-[1px] bg-foreground/50" />

            <div className="baseFlex w-[79px] flex-nowrap !justify-start gap-1 text-nowrap">
              {getDynamicNoteLengthIcon({
                noteLength:
                  playbackMetadata[currentChordIndex]?.noteLength ?? "quarter",
              })}
              {playbackMetadata[currentChordIndex]?.bpm ?? "120"} BPM
            </div>
          </div>
        </div>
      ) : (
        <div className="baseFlex mt-4 w-full !items-end !justify-between gap-2 px-4">
          <div className="baseFlex w-full !items-end !justify-start gap-2">
            {/* title + auto tuner button */}
            <div className="baseVertFlex w-full !items-start gap-2">
              <div className="baseFlex !justify-start gap-4">
                <div className="baseFlex w-full !justify-start">
                  <OverlayScrollbarsComponent
                    options={{
                      scrollbars: { autoHide: "leave", autoHideDelay: 150 },
                      overflow: {
                        x: "scroll",
                        y: "hidden",
                      },
                    }}
                    defer
                    className="size-full max-w-[80vw] tablet:max-w-[600px]"
                  >
                    <span className="whitespace-nowrap text-xl font-bold tablet:text-2xl">
                      {title}
                    </span>
                  </OverlayScrollbarsComponent>
                </div>

                {!viewportLabel.includes("mobile") &&
                  sectionProgression.length > 1 && (
                    <>
                      <Separator className="h-6 w-[1px] bg-foreground/50" />

                      <div className="baseFlex gap-2">
                        <Label
                          htmlFor="sectionPicker"
                          className="text-sm font-medium"
                        >
                          Section
                        </Label>
                        <Select
                          value={
                            audioMetadata.location === null
                              ? "fullTab"
                              : sectionProgression[
                                  audioMetadata.location?.sectionIndex ?? 0
                                ]?.sectionId
                          }
                          onValueChange={(value) => {
                            setAudioMetadata({
                              ...audioMetadata,
                              location:
                                value === "fullTab"
                                  ? null
                                  : {
                                      sectionIndex: uniqueSections.findIndex(
                                        (elem) => {
                                          return elem.sectionId === value;
                                        },
                                      ),
                                    },
                              startLoopIndex: 0,
                              endLoopIndex: -1,
                            });
                            setCurrentChordIndex(0);
                          }}
                        >
                          <SelectTrigger
                            id="sectionPicker"
                            className="!h-8 max-w-28 text-nowrap sm:max-w-none"
                          >
                            <SelectValue placeholder="Select a section">
                              {audioMetadata.location === null
                                ? "Full tab"
                                : sectionProgression[
                                    uniqueSections.findIndex((elem) => {
                                      return (
                                        elem.sectionId ===
                                        sectionProgression[
                                          audioMetadata.location
                                            ?.sectionIndex ?? 0
                                        ]?.sectionId
                                      );
                                    })
                                  ]?.title}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <>
                              {uniqueSections.map((section) => {
                                return (
                                  <SelectItem
                                    key={section.sectionId}
                                    value={section.sectionId}
                                  >
                                    {section.title}
                                  </SelectItem>
                                );
                              })}

                              <div className="my-1 h-[1px] w-full bg-primary"></div>
                              <SelectItem key={"fullTab"} value={`fullTab`}>
                                Full tab
                              </SelectItem>
                            </>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
              </div>

              <div className="baseFlex w-full !justify-between gap-4">
                <div className="baseVertFlex w-full !items-start gap-4 md:!flex-row md:!items-center md:!justify-start">
                  <div className="baseFlex gap-4">
                    <div className="baseVertFlex !items-start text-nowrap">
                      <span className="text-sm font-medium">Tempo</span>
                      <div className="baseFlex w-[79px] !justify-start gap-1">
                        {getDynamicNoteLengthIcon({
                          noteLength:
                            playbackMetadata[currentChordIndex]?.noteLength ??
                            "quarter",
                        })}
                        {playbackMetadata[currentChordIndex]?.bpm ?? "120"} BPM
                      </div>
                    </div>
                    <div className="baseVertFlex !items-start">
                      <span className="text-sm font-medium">Tuning</span>
                      <div>
                        {tuningNotesToName[
                          tuning.toLowerCase() as keyof typeof tuningNotesToName
                        ] ?? <PrettyTuning tuning={tuning} displayWithFlex />}
                      </div>
                    </div>

                    <div className="baseVertFlex !items-start">
                      <span className="text-sm font-medium">Capo</span>
                      {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
                    </div>

                    <Button
                      variant={"outline"}
                      className="baseFlex h-9 gap-2 !px-2.5 !py-0 sm:!px-4"
                    >
                      <TuningFork className="size-4" />
                      <span className="hidden sm:block">Tuner</span>
                    </Button>

                    {!viewportLabel.includes("mobile") && (
                      <Button
                        variant={"outline"}
                        className="size-9 !p-0"
                        onClick={() => {
                          pauseAudio();
                          setShowGlossaryDialog(true);
                        }}
                      >
                        <FaBook className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {viewportLabel.includes("mobile") && (
                    <div className="baseFlex mt-1.5 w-full !justify-start gap-4">
                      <div className="baseFlex gap-2">
                        <Label htmlFor="speed">Speed</Label>
                        <Select
                          disabled={
                            countInTimer.showing ||
                            audioMetadata.editingLoopRange
                          }
                          value={`${playbackSpeed}x`}
                          onValueChange={(value) => {
                            pauseAudio();

                            const newPlaybackSpeed = Number(
                              value.slice(0, value.length - 1),
                            ) as 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

                            // Normalize the progress value to 1x speed
                            const normalizedProgress =
                              tabProgressValue * playbackSpeed;

                            // Adjust the progress value to the new playback speed
                            const adjustedProgress =
                              normalizedProgress / newPlaybackSpeed;

                            // Set the new progress value
                            setTabProgressValue(adjustedProgress);
                            setPlaybackSpeed(newPlaybackSpeed);
                          }}
                        >
                          <SelectTrigger id="speed" className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={"0.25x"}>0.25x</SelectItem>
                            <SelectItem value={"0.5x"}>0.5x</SelectItem>
                            <SelectItem value={"0.75x"}>0.75x</SelectItem>
                            <SelectItem value={"1x"}>1x</SelectItem>
                            <SelectItem value={"1.25x"}>1.25x</SelectItem>
                            <SelectItem value={"1.5x"}>1.5x</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {sectionProgression.length > 1 && (
                        <div className="baseFlex gap-2">
                          <Label
                            htmlFor="sectionPicker"
                            className="text-sm font-medium"
                          >
                            Section
                          </Label>
                          <Select
                            value={
                              audioMetadata.location === null
                                ? "fullTab"
                                : sectionProgression[
                                    audioMetadata.location?.sectionIndex ?? 0
                                  ]?.sectionId
                            }
                            onValueChange={(value) => {
                              setAudioMetadata({
                                ...audioMetadata,
                                location:
                                  value === "fullTab"
                                    ? null
                                    : {
                                        sectionIndex: uniqueSections.findIndex(
                                          (elem) => {
                                            return elem.sectionId === value;
                                          },
                                        ),
                                      },
                              });
                            }}
                          >
                            <SelectTrigger
                              id="sectionPicker"
                              className="!h-8 max-w-32 sm:max-w-none"
                            >
                              <SelectValue
                                placeholder="Select a section"
                                asChild
                              >
                                <p className="truncate">
                                  {audioMetadata.location === null
                                    ? "Full tab"
                                    : `${
                                        sectionProgression[
                                          uniqueSections.findIndex((elem) => {
                                            return (
                                              elem.sectionId ===
                                              sectionProgression[
                                                audioMetadata.location
                                                  ?.sectionIndex ?? 0
                                              ]?.sectionId
                                            );
                                          })
                                        ]?.title
                                      }`}
                                </p>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <>
                                {uniqueSections.map((section) => {
                                  return (
                                    <SelectItem
                                      key={section.sectionId}
                                      value={section.sectionId}
                                    >
                                      {section.title}
                                    </SelectItem>
                                  );
                                })}

                                <div className="my-1 h-[1px] w-full bg-primary"></div>
                                <SelectItem key={"fullTab"} value={`fullTab`}>
                                  Full tab
                                </SelectItem>
                              </>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!viewportLabel.includes("mobile") && <Menu />}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackTopMetadata;

function Menu() {
  const { playbackModalViewingState, setPlaybackModalViewingState } =
    useTabStore((state) => ({
      playbackModalViewingState: state.playbackModalViewingState,
      setPlaybackModalViewingState: state.setPlaybackModalViewingState,
    }));

  return (
    <div className="baseFlex w-full max-w-none">
      <AnimatedTabs
        activeTabName={playbackModalViewingState}
        setActiveTabName={
          setPlaybackModalViewingState as Dispatch<SetStateAction<string>>
        }
        tabNames={[
          "Practice",
          "Section progression",
          "Chords",
          "Strumming patterns",
        ]}
      />
    </div>
  );
}
