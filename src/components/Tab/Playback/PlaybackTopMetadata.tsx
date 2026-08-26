import { useRouter } from "next/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { type Dispatch, type SetStateAction } from "react";
import { FaBook } from "react-icons/fa";
import PlaybackSectionPicker from "~/components/Tab/Playback/PlaybackSectionPicker";
import PlaybackTunerDialog from "~/components/Tab/Playback/PlaybackTunerDialog";
import PlaybackTunerDrawer from "~/components/Tab/Playback/PlaybackTunerDrawer";
import AnimatedTabs from "~/components/ui/AnimatedTabs";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import PlaybackSpeedPopover from "~/components/ui/PlaybackSpeedPopover";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import { Separator } from "~/components/ui/separator";
import { useTabStore, type PlaybackMetadata } from "~/stores/TabStore";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import { tuningNotesToName } from "~/utils/tunings";
import { type PlaybackSpeed } from "../../../utils/playbackSpeedControls";

interface PlaybackTopMetadata {
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
}

function PlaybackTopMetadata({
  tabProgressValue,
  setTabProgressValue,
}: PlaybackTopMetadata) {
  const { asPath } = useRouter();

  const {
    title,
    tuning,
    capo,
    audioMetadata,
    playbackMetadata,
    viewportLabel,
    countInTimer,
    playbackSpeed,
    pauseAudio,
    setPlaybackSpeed,
    setShowGlossaryDialog,
  } = useTabStore((state) => ({
    title: state.title,
    tuning: state.tuning,
    capo: state.capo,
    audioMetadata: state.audioMetadata,
    playbackMetadata: state.playbackMetadata,
    viewportLabel: state.viewportLabel,
    countInTimer: state.countInTimer,
    playbackSpeed: state.playbackSpeed,
    pauseAudio: state.pauseAudio,
    setPlaybackSpeed: state.setPlaybackSpeed,
    setShowGlossaryDialog: state.setShowGlossaryDialog,
  }));

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

            <Separator className="h-5 w-[1px] bg-foreground/50" />

            <div className="baseFlex w-[79px] flex-nowrap !justify-start gap-1 text-nowrap">
              <CurrentTempoDisplay
                playbackMetadata={playbackMetadata}
                playbackSpeed={playbackSpeed}
              />
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

                {!viewportLabel.includes("mobile") && <PlaybackSectionPicker />}
              </div>

              <div className="baseFlex w-full !justify-between gap-4">
                <div className="baseVertFlex w-full !items-start gap-4 md:!flex-row md:!items-center md:!justify-start">
                  <div className="baseFlex gap-4">
                    <div className="baseVertFlex !items-start text-nowrap">
                      <span className="text-sm font-medium">Tempo</span>
                      <div className="baseFlex w-[79px] !justify-start gap-1">
                        <CurrentTempoDisplay
                          playbackMetadata={playbackMetadata}
                          playbackSpeed={playbackSpeed}
                        />
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

                    {viewportLabel.includes("mobile") ? (
                      <PlaybackTunerDrawer />
                    ) : (
                      <PlaybackTunerDialog />
                    )}

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
                        <PlaybackSpeedPopover
                          id="speed"
                          disabled={
                            countInTimer.showing ||
                            audioMetadata.editingLoopRange
                          }
                          playbackSpeed={playbackSpeed}
                          onPlaybackSpeedChange={(newPlaybackSpeed) => {
                            pauseAudio();

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
                          triggerClassName="h-8 w-[85px]"
                        />
                      </div>

                      <PlaybackSectionPicker />
                    </div>
                  )}
                </div>

                {!viewportLabel.includes("mobile") &&
                  !asPath.includes("/tools") && <Menu />}
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

function CurrentTempoDisplay({
  playbackMetadata,
  playbackSpeed,
}: {
  playbackMetadata: PlaybackMetadata[] | null;
  playbackSpeed: PlaybackSpeed;
}) {
  const currentChordIndex = useTabStore((state) => state.currentChordIndex);
  const scaledBPM = Math.round(
    (playbackMetadata?.[currentChordIndex]?.bpm ?? 120) * playbackSpeed,
  );

  return (
    <>
      {getDynamicNoteLengthIcon({
        noteLength:
          playbackMetadata?.[currentChordIndex]?.noteLength ?? "quarter",
      })}
      {scaledBPM} BPM
    </>
  );
}
