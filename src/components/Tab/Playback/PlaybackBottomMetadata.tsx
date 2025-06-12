import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { CgArrowsShrinkH } from "react-icons/cg";
import { FaBook, FaListUl } from "react-icons/fa";
import {
  BsFillVolumeDownFill,
  BsFillVolumeMuteFill,
  BsFillVolumeUpFill,
} from "react-icons/bs";
import { IoSettingsOutline } from "react-icons/io5";
import { isMobileOnly } from "react-device-detect";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import ChordDiagram from "~/components/Tab/Playback/ChordDiagram";
import PlaybackGranularLoopRangeEditor from "~/components/Tab/Playback/PlaybackGranularLoopRangeEditor";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import type { LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import AnimatedTabs from "~/components/ui/AnimatedTabs";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import TuningFork from "~/components/ui/icons/TuningFork";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Toggle } from "~/components/ui/toggle";
import { VerticalSlider } from "~/components/ui/verticalSlider";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { tuningNotesToName } from "~/utils/tunings";
import { Slider } from "~/components/ui/slider";

interface PlaybackBottomMetadata {
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
  setShowBackgroundBlur: Dispatch<SetStateAction<boolean>>;
}

function PlaybackBottomMetadata({
  loopRange,
  setLoopRange,
  tabProgressValue,
  setTabProgressValue,
  setShowBackgroundBlur,
}: PlaybackBottomMetadata) {
  const {
    tabData,
    capo,
    tuning,
    sectionProgression,
    audioMetadata,
    playbackMetadata,
    viewportLabel,
    setShowEffectGlossaryDialog,
    setAudioMetadata,
    looping,
    countInTimer,
    setCurrentChordIndex,
    pauseAudio,
  } = useTabStore((state) => ({
    tabData: state.tabData,
    capo: state.capo,
    tuning: state.tuning,
    sectionProgression: state.sectionProgression,
    audioMetadata: state.audioMetadata,
    playbackMetadata: state.playbackMetadata,
    viewportLabel: state.viewportLabel,
    setShowEffectGlossaryDialog: state.setShowEffectGlossaryDialog,
    setAudioMetadata: state.setAudioMetadata,
    looping: state.looping,
    countInTimer: state.countInTimer,
    setCurrentChordIndex: state.setCurrentChordIndex,
    pauseAudio: state.pauseAudio,
  }));

  // idk if best approach, but need unique section titles, not the whole progression
  const sections = useMemo(() => {
    return tabData.map((section) => ({ id: section.id, title: section.title }));
  }, [tabData]);

  // const index = realChordsToFullChordsMap[currentChordIndex];

  if (playbackMetadata === null) return;

  // TODO: decide later how you want to conditionally render landscape mobile vs the rest
  return (
    <>
      {viewportLabel.includes("Landscape") ? (
        <>
          {audioMetadata.editingLoopRange ? (
            <PlaybackGranularLoopRangeEditor
              loopRange={loopRange}
              setLoopRange={setLoopRange}
            />
          ) : (
            <div className="baseFlex w-full !justify-between gap-4 px-4 pb-2">
              <div className="baseFlex gap-4">
                <div className="baseVertFlex !items-start">
                  <p className="text-sm font-medium">Tuning</p>
                  <div>
                    {tuningNotesToName[
                      tuning.toLowerCase() as keyof typeof tuningNotesToName
                    ] ?? <PrettyTuning tuning={tuning} displayWithFlex />}
                  </div>
                </div>

                <div className="baseVertFlex !items-start">
                  <p className="text-sm font-medium">Capo</p>
                  {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
                </div>

                <Button variant={"outline"} className="size-9 !p-0">
                  <TuningFork className="size-4 fill-white" />
                </Button>
              </div>

              <div className="baseFlex gap-4">
                {sectionProgression.length > 1 && (
                  <div className="baseFlex gap-2">
                    <p className="text-sm font-medium">Section</p>
                    <Select
                      value={
                        audioMetadata.location === null
                          ? "fullTab"
                          : tabData[audioMetadata.location?.sectionIndex ?? 0]
                              ?.id
                      }
                      onValueChange={(value) => {
                        setAudioMetadata({
                          ...audioMetadata,
                          location:
                            value === "fullTab"
                              ? null
                              : {
                                  sectionIndex: sections.findIndex((elem) => {
                                    return elem.id === value;
                                  }),
                                },
                        });
                      }}
                    >
                      <SelectTrigger className="!h-9 max-w-28 sm:max-w-none md:!h-10">
                        <SelectValue placeholder="Select a section">
                          {audioMetadata.location === null
                            ? "Full tab"
                            : tabData[
                                sections.findIndex((elem) => {
                                  return (
                                    elem.id ===
                                    tabData[
                                      audioMetadata.location?.sectionIndex ?? 0
                                    ]?.id
                                  );
                                })
                              ]?.title}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {sections.map((section) => {
                          return (
                            <SelectItem key={section.id} value={section.id}>
                              {section.title}
                            </SelectItem>
                          );
                        })}

                        <div className="my-1 h-[1px] w-full bg-pink-800"></div>
                        <SelectItem key={"fullTab"} value={`fullTab`}>
                          Full tab
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <MobileSettingsPopover
                  setShowBackgroundBlur={setShowBackgroundBlur}
                />

                <MobileMenuDialog />

                <Button
                  variant={"outline"}
                  className="size-9 !p-0"
                  onClick={() => {
                    pauseAudio();
                    setShowEffectGlossaryDialog(true);
                  }}
                >
                  <FaBook className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="baseFlex w-full px-4 py-4">
          {viewportLabel.includes("mobile") ? (
            <div className="baseFlex gap-4">
              <MobileSettingsPopover
                setShowBackgroundBlur={setShowBackgroundBlur}
              />

              <MobileMenuDialog />

              <Toggle
                variant={"outline"}
                aria-label="Edit loop range"
                disabled={
                  !looping || audioMetadata.playing || countInTimer.showing
                }
                pressed={audioMetadata.editingLoopRange}
                className="size-9 p-1"
                onPressedChange={(value) => {
                  // set to beginning of loop if moving to editing loop range, otherwise
                  // reset to beginning of tab
                  setCurrentChordIndex(
                    value ? audioMetadata.startLoopIndex : 0,
                  );

                  setAudioMetadata({
                    ...audioMetadata,
                    editingLoopRange: value,
                  });
                }}
              >
                <CgArrowsShrinkH className="h-6 w-6" />
              </Toggle>

              <Button
                variant={"outline"}
                className="size-9 !p-0"
                onClick={() => {
                  pauseAudio();
                  setShowEffectGlossaryDialog(true);
                }}
              >
                <FaBook className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="baseFlex w-full">
              <DesktopSettings
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default PlaybackBottomMetadata;

interface MobileSettingsPopover {
  setShowBackgroundBlur: Dispatch<SetStateAction<boolean>>;
}

function MobileSettingsPopover({
  setShowBackgroundBlur,
}: MobileSettingsPopover) {
  const {
    currentInstrumentName,
    setCurrentInstrumentName,
    audioMetadata,
    pauseAudio,
    countInTimer,
    loopDelay,
    setLoopDelay,
  } = useTabStore((state) => ({
    currentInstrumentName: state.currentInstrumentName,
    setCurrentInstrumentName: state.setCurrentInstrumentName,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
    countInTimer: state.countInTimer,
    loopDelay: state.loopDelay,
    setLoopDelay: state.setLoopDelay,
  }));

  const volume = useGetLocalStorageValues().volume;
  const localStorageVolume = useLocalStorageValue("autostrum-volume");

  return (
    <Popover
      onOpenChange={(open) => {
        setShowBackgroundBlur(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            if (audioMetadata.playing) pauseAudio();
          }}
          className="z-50"
        >
          <IoSettingsOutline className="h-5 w-5" />
          <span className="ml-0 hidden mobilePortrait:ml-3 mobilePortrait:block">
            Settings
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="baseVertFlex size-full w-[450px] gap-4 bg-black text-white mobilePortrait:w-[300px]">
        <div className="baseVertFlex w-full !items-start gap-2">
          <span className="font-medium">Instrument</span>

          <div className="grid w-full grid-cols-2 grid-rows-2 gap-2 mobilePortrait:grid-cols-1 mobilePortrait:grid-rows-4">
            <Button
              variant={
                currentInstrumentName === "acoustic_guitar_nylon"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("acoustic_guitar_nylon");
              }}
            >
              Acoustic guitar - Nylon
            </Button>

            <Button
              variant={
                currentInstrumentName === "acoustic_guitar_steel"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("acoustic_guitar_steel");
              }}
            >
              Acoustic guitar - Steel
            </Button>

            <Button
              variant={
                currentInstrumentName === "electric_guitar_clean"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("electric_guitar_clean");
              }}
            >
              Electric guitar - Clean
            </Button>

            <Button
              variant={
                currentInstrumentName === "electric_guitar_jazz"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("electric_guitar_jazz");
              }}
            >
              Electric guitar - Jazz
            </Button>
          </div>
        </div>

        <div className="baseVertFlex w-full !items-start gap-2">
          <span className="font-medium">Loop delay</span>

          <div className="baseFlex w-full !justify-start gap-2">
            <Button
              variant={loopDelay === 0 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(0);
              }}
              className="w-full"
            >
              0s
            </Button>

            <Button
              variant={loopDelay === 1 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(1);
              }}
              className="w-full"
            >
              1s
            </Button>

            <Button
              variant={loopDelay === 2 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(2);
              }}
              className="w-full"
            >
              2s
            </Button>

            <Button
              variant={loopDelay === 3 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(3);
              }}
              className="w-full"
            >
              3s
            </Button>
          </div>
        </div>

        {/* gives tablet users ability to still control volume */}
        {!isMobileOnly && (
          <div className="baseVertFlex w-full !items-start gap-2">
            <span className="font-medium">Volume</span>
            <div className="baseFlex w-full max-w-64 !flex-nowrap gap-2 md:justify-self-end">
              <AnimatePresence mode="popLayout">
                {volume === 0 && (
                  <motion.div
                    key="muteIcon"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="baseFlex"
                  >
                    <BsFillVolumeMuteFill
                      size={"1.5rem"}
                      className="shrink-0"
                    />
                  </motion.div>
                )}
                {volume > 0 && volume < 1 ? (
                  <motion.div
                    key="lowVolumeIcon"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="baseFlex"
                  >
                    <BsFillVolumeDownFill
                      size={"1.5rem"}
                      className="shrink-0"
                    />
                  </motion.div>
                ) : null}
                {volume >= 1 ? (
                  <motion.div
                    key="highVolumeIcon"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="baseFlex"
                  >
                    <BsFillVolumeUpFill size={"1.5rem"} className="shrink-0" />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Slider
                value={[volume * 50]} // 100 felt too quiet/narrow of a volume range
                min={0}
                max={100}
                step={1}
                onValueChange={(value) =>
                  localStorageVolume.set(`${value[0]! / 50}`)
                } // 100 felt too quiet/narrow of a volume range
              ></Slider>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MobileMenuDialog() {
  const {
    sectionProgression,
    id,
    currentInstrument,
    chords,
    strummingPatterns,
    audioMetadata,
    previewMetadata,
    playPreview,
    pauseAudio,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    id: state.id,
    currentInstrument: state.currentInstrument,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    audioMetadata: state.audioMetadata,
    previewMetadata: state.previewMetadata,
    playPreview: state.playPreview,
    pauseAudio: state.pauseAudio,
  }));

  const [activeTabName, setActiveTabName] = useState<
    "Section progression" | "Chords" | "Strumming patterns"
  >("Section progression");

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] = useState<
    boolean[]
  >([]);
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            if (audioMetadata.playing) pauseAudio();
          }}
        >
          <FaListUl className="h-5 w-5" />
          <span className="ml-0 hidden mobilePortrait:ml-3 mobilePortrait:block">
            Menu
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="baseVertFlex size-full max-h-dvh max-w-none !justify-start !rounded-none bg-black pb-0">
        <AnimatedTabs
          activeTabName={activeTabName}
          setActiveTabName={
            setActiveTabName as Dispatch<SetStateAction<string>>
          }
          tabNames={["Section progression", "Chords", "Strumming patterns"]}
        />

        <AnimatePresence mode="popLayout">
          {activeTabName === "Section progression" && (
            <motion.div
              key="Section progression"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="baseVertFlex h-full max-h-[calc(100dvh-6rem)] w-full gap-2 overflow-y-auto"
            >
              {sectionProgression.length === 0 ? (
                <p className="text-lg font-semibold text-white">
                  No section progression found.
                </p>
              ) : (
                <div className="baseVertFlex gap-2">
                  {sectionProgression.map((section) => (
                    <div
                      key={section.id}
                      className="baseFlex w-full !justify-start gap-2"
                    >
                      <div className="baseFlex w-24 gap-2">
                        <p className="text-stone-400">
                          {formatSecondsToMinutes(section.startSeconds)}
                        </p>
                        <span className="text-stone-400">-</span>
                        <p className="text-stone-400">
                          {formatSecondsToMinutes(section.endSeconds)}
                        </p>
                      </div>

                      <div className="baseFlex gap-2">
                        <p className="text-nowrap font-semibold">
                          {section.title}
                        </p>
                        {section.repetitions > 1 && (
                          <p>(x{section.repetitions})</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTabName === "Chords" && (
            <motion.div
              key="Chords"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="baseVertFlex size-full overflow-y-hidden py-0"
            >
              {chords.length > 0 ? (
                <div className="my-4 grid max-h-[calc(100dvh-6rem)] w-full grid-cols-1 !place-items-center gap-8 overflow-y-scroll px-8 xs:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                  <>
                    {chords.map((chord, index) => (
                      <div
                        key={chord.id}
                        className="baseFlex w-full max-w-[175px]"
                      >
                        <div className="baseVertFlex gap-3">
                          <div className="baseFlex w-full !justify-between border-b py-2">
                            <p
                              style={{
                                textShadow:
                                  previewMetadata.indexOfPattern === index &&
                                  previewMetadata.playing &&
                                  previewMetadata.type === "chord"
                                    ? "none"
                                    : "0 1px 2px hsla(336, 84%, 17%, 0.25)",
                                color:
                                  previewMetadata.indexOfPattern === index &&
                                  previewMetadata.playing &&
                                  previewMetadata.type === "chord"
                                    ? "hsl(335, 78%, 42%)"
                                    : "hsl(324, 77%, 95%)",
                              }}
                              className="px-3 font-semibold transition-colors"
                            >
                              {chord.name}
                            </p>

                            {/* preview chord button */}
                            <Button
                              variant={"playPause"}
                              disabled={
                                !currentInstrument ||
                                (previewMetadata.indexOfPattern === index &&
                                  previewMetadata.playing &&
                                  previewMetadata.type === "chord")
                              }
                              size={"sm"}
                              onClick={() => {
                                if (
                                  audioMetadata.playing ||
                                  previewMetadata.playing
                                ) {
                                  pauseAudio();
                                }

                                setTimeout(
                                  () => {
                                    void playPreview({
                                      data: chord.frets,
                                      index,
                                      type: "chord",
                                    });
                                  },
                                  audioMetadata.playing ||
                                    previewMetadata.playing
                                    ? 50
                                    : 0,
                                );
                              }}
                              className="baseFlex mr-3 h-6 w-10 rounded-sm"
                            >
                              <PlayButtonIcon
                                uniqueLocationKey={`chordPreview${index}`}
                                tabId={id}
                                currentInstrument={currentInstrument}
                                previewMetadata={previewMetadata}
                                indexOfPattern={index}
                                previewType="chord"
                              />
                            </Button>
                          </div>

                          <div className="h-48 mobileNarrowLandscape:h-36">
                            <ChordDiagram originalFrets={chord.frets} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                </div>
              ) : (
                <div className="text-center">
                  No chords were specified for this tab.
                </div>
              )}
            </motion.div>
          )}

          {activeTabName === "Strumming patterns" && (
            <motion.div
              key="Strumming patterns"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`baseVertFlex h-full max-h-[calc(100dvh-6rem)] gap-10 overflow-y-auto ${strummingPatterns.length > 0 ? "!justify-start pb-8 pt-4" : ""}`}
            >
              {strummingPatterns.length > 0 ? (
                <>
                  {strummingPatterns.map((pattern, index) => (
                    <div
                      key={pattern.id}
                      className="shrink-0 self-start overflow-hidden"
                    >
                      <div className="baseVertFlex !items-start">
                        <Button
                          variant={"playPause"}
                          size={"sm"}
                          disabled={
                            !currentInstrument ||
                            artificalPlayButtonTimeout[index]
                          }
                          onClick={() => {
                            if (
                              previewMetadata.playing &&
                              index === previewMetadata.indexOfPattern &&
                              previewMetadata.type === "strummingPattern"
                            ) {
                              pauseAudio();
                              setArtificalPlayButtonTimeout((prev) => {
                                const prevArtificalPlayButtonTimeout = [
                                  ...prev,
                                ];
                                prevArtificalPlayButtonTimeout[index] = true;
                                return prevArtificalPlayButtonTimeout;
                              });

                              setTimeout(() => {
                                setArtificalPlayButtonTimeout((prev) => {
                                  const prevArtificalPlayButtonTimeout = [
                                    ...prev,
                                  ];
                                  prevArtificalPlayButtonTimeout[index] = false;
                                  return prevArtificalPlayButtonTimeout;
                                });
                              }, 300);
                            } else {
                              if (
                                audioMetadata.playing ||
                                previewMetadata.playing
                              ) {
                                pauseAudio();
                              }

                              setTimeout(
                                () => {
                                  void playPreview({
                                    data: pattern,
                                    index,
                                    type: "strummingPattern",
                                  });
                                },
                                audioMetadata.playing || previewMetadata.playing
                                  ? 50
                                  : 0,
                              );
                            }
                          }}
                          className="baseFlex ml-2 h-6 w-20 gap-2 rounded-b-none"
                        >
                          <p>
                            {previewMetadata.playing &&
                            index === previewMetadata.indexOfPattern &&
                            previewMetadata.type === "strummingPattern"
                              ? "Stop"
                              : "Play"}
                          </p>
                          <PlayButtonIcon
                            uniqueLocationKey={`strummingPatternPreview${index}`}
                            tabId={id}
                            currentInstrument={currentInstrument}
                            previewMetadata={previewMetadata}
                            indexOfPattern={index}
                            previewType="strummingPattern"
                          />
                        </Button>
                        <div className="baseFlex border-b-none !flex-nowrap rounded-md border-2">
                          <StrummingPattern
                            data={pattern}
                            mode="viewing"
                            index={index}
                            lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                            setLastModifiedPalmMuteNode={
                              setLastModifiedPalmMuteNode
                            }
                            pmNodeOpacities={[]} //
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="w-48 text-center xs:w-auto">
                  No strumming patterns were specified for this tab.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

interface DesktopSettings {
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
}

function DesktopSettings({
  tabProgressValue,
  setTabProgressValue,
}: DesktopSettings) {
  const {
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    setCurrentChordIndex,
    audioMetadata,
    setAudioMetadata,
    pauseAudio,
    looping,
    countInTimer,
    loopDelay,
    setLoopDelay,
  } = useTabStore((state) => ({
    currentInstrumentName: state.currentInstrumentName,
    setCurrentInstrumentName: state.setCurrentInstrumentName,
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    pauseAudio: state.pauseAudio,
    looping: state.looping,
    countInTimer: state.countInTimer,
    loopDelay: state.loopDelay,
    setLoopDelay: state.setLoopDelay,
  }));

  const volume = useGetLocalStorageValues().volume;
  const localStorageVolume = useLocalStorageValue("autostrum-volume");

  return (
    <div className="baseFlex w-full !items-end gap-4">
      <div className="baseVertFlex !items-start gap-2">
        <Label>Instrument</Label>
        <Select
          disabled={countInTimer.showing || audioMetadata.editingLoopRange}
          value={currentInstrumentName}
          onValueChange={(value) => {
            pauseAudio();

            setCurrentInstrumentName(
              value as
                | "acoustic_guitar_nylon"
                | "acoustic_guitar_steel"
                | "electric_guitar_clean"
                | "electric_guitar_jazz",
            );
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"acoustic_guitar_nylon"}>
              Acoustic guitar - Nylon
            </SelectItem>

            <SelectItem value={"acoustic_guitar_steel"}>
              Acoustic guitar - Steel
            </SelectItem>

            <SelectItem value={"electric_guitar_clean"}>
              Electric guitar - Clean
            </SelectItem>

            <SelectItem value={"electric_guitar_jazz"}>
              Electric guitar - Jazz
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="baseVertFlex !items-start gap-2">
        <Label>Speed</Label>
        <Select
          disabled={countInTimer.showing || audioMetadata.editingLoopRange}
          value={`${playbackSpeed}x`}
          onValueChange={(value) => {
            pauseAudio();

            const newPlaybackSpeed = Number(
              value.slice(0, value.length - 1),
            ) as 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

            // Normalize the progress value to 1x speed
            const normalizedProgress = tabProgressValue * playbackSpeed;

            // Adjust the progress value to the new playback speed
            const adjustedProgress = normalizedProgress / newPlaybackSpeed;

            // Set the new progress value
            setTabProgressValue(adjustedProgress);
            setPlaybackSpeed(newPlaybackSpeed);
          }}
        >
          <SelectTrigger className="w-20">
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

      <div className="baseVertFlex !items-start gap-2">
        <Label>Loop delay</Label>
        <Select
          disabled={countInTimer.showing}
          value={`${loopDelay}s`}
          onValueChange={(value) => {
            pauseAudio();

            setLoopDelay(Number(value[0]));
          }}
        >
          <SelectTrigger className="w-16">
            <SelectValue>{`${loopDelay}s`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"0s"}>0 seconds</SelectItem>
            <SelectItem value={"1s"}>1 second</SelectItem>
            <SelectItem value={"2s"}>2 seconds</SelectItem>
            <SelectItem value={"3s"}>3 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Toggle
        variant={"outline"}
        aria-label="Edit loop range"
        disabled={!looping || audioMetadata.playing || countInTimer.showing}
        pressed={audioMetadata.editingLoopRange}
        className="baseFlex gap-2"
        onPressedChange={(value) => {
          // set to beginning of loop if moving to editing loop range, otherwise
          // reset to beginning of tab
          setCurrentChordIndex(value ? audioMetadata.startLoopIndex : 0);

          setAudioMetadata({
            ...audioMetadata,
            editingLoopRange: value,
          });
        }}
      >
        <CgArrowsShrinkH className="h-6 w-6" />
        Edit loop range
      </Toggle>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="size-9 !p-0">
            <AnimatePresence mode="popLayout">
              {volume === 0 && (
                <motion.div
                  key="muteIcon"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="baseFlex"
                >
                  <BsFillVolumeMuteFill size={"1.5rem"} className="shrink-0" />
                </motion.div>
              )}
              {volume > 0 && volume < 1 ? (
                <motion.div
                  key="lowVolumeIcon"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="baseFlex"
                >
                  <BsFillVolumeDownFill size={"1.5rem"} className="shrink-0" />
                </motion.div>
              ) : null}
              {volume >= 1 ? (
                <motion.div
                  key="highVolumeIcon"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="baseFlex"
                >
                  <BsFillVolumeUpFill size={"1.5rem"} className="shrink-0" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="baseVertFlex h-36 w-12 gap-2 p-2" side="top">
          <VerticalSlider
            value={[volume * 50]} // 100 felt too quiet/narrow of a volume range
            min={0}
            max={100}
            step={1}
            onValueChange={(value) =>
              localStorageVolume.set(`${value[0]! / 50}`)
            } // 100 felt too quiet/narrow of a volume range
          ></VerticalSlider>
          <p>{Math.floor(volume * 50)}%</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
