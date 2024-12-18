import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { CgArrowsShrinkH } from "react-icons/cg";
import {
  FaBook,
  FaListUl,
  FaVolumeDown,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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

interface PlaybackBottomMetadata {
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
}

function PlaybackBottomMetadata({
  loopRange,
  setLoopRange,
  tabProgressValue,
  setTabProgressValue,
}: PlaybackBottomMetadata) {
  const {
    tabData,
    title,
    capo,
    tuning,
    sectionProgression,
    audioMetadata,
    playbackMetadata,
    currentChordIndex,
    viewportLabel,
    setShowEffectGlossaryModal,
    setAudioMetadata,
    looping,
    countInTimer,
    setCurrentChordIndex,
  } = useTabStore((state) => ({
    tabData: state.tabData,
    title: state.title,
    capo: state.capo,
    tuning: state.tuning,
    sectionProgression: state.sectionProgression,
    audioMetadata: state.audioMetadata,
    playbackMetadata: state.playbackMetadata,
    currentChordIndex: state.currentChordIndex,
    viewportLabel: state.viewportLabel,
    setShowEffectGlossaryModal: state.setShowEffectGlossaryModal,
    setAudioMetadata: state.setAudioMetadata,
    looping: state.looping,
    countInTimer: state.countInTimer,
    setCurrentChordIndex: state.setCurrentChordIndex,
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
                  <p>
                    {tuningNotesToName[
                      tuning as keyof typeof tuningNotesToName
                    ] ?? <PrettyTuning tuning={tuning} displayWithFlex />}
                  </p>
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
                      // this is jank, need to fix logic
                      value={title === "" ? undefined : title}
                      onValueChange={(value) => {
                        setAudioMetadata({
                          ...audioMetadata,
                          location:
                            value === "fullTab"
                              ? null
                              : {
                                  sectionIndex: parseInt(value),
                                },
                        });
                      }}
                    >
                      <SelectTrigger className="!h-9 max-w-28 sm:max-w-none md:!h-10">
                        <SelectValue placeholder="Select a section">
                          {audioMetadata.location === null
                            ? "Full tab"
                            : (sectionProgression[
                                playbackMetadata[currentChordIndex]?.location
                                  .sectionIndex ?? 0
                              ]?.title ?? "")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup className="max-h-60 overflow-y-auto">
                          <SelectLabel>Sections</SelectLabel>

                          <>
                            <SelectItem key={"fullTab"} value={`fullTab`}>
                              Full tab
                            </SelectItem>
                            {sections.map((section, idx) => {
                              return (
                                <SelectItem
                                  key={`${section.id}`}
                                  value={`${idx}`}
                                >
                                  {section.title}
                                </SelectItem>
                              );
                            })}
                          </>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <MobileSettingsDialog />
                <MobileMenuDialog />
                <Button
                  variant={"outline"}
                  className="size-9 !p-0"
                  onClick={() => setShowEffectGlossaryModal(true)}
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
              <MobileSettingsDialog />

              <MobileMenuDialog />

              <Toggle
                variant={"outline"}
                aria-label="Edit looping range"
                disabled={
                  !looping ||
                  audioMetadata.type === "Artist recording" ||
                  audioMetadata.playing ||
                  countInTimer.showing
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
                onClick={() => setShowEffectGlossaryModal(true)}
              >
                <FaBook className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="baseFlex w-full">
              <Settings
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

function MobileSettingsDialog() {
  const {
    id,
    bpm,
    hasRecordedAudio,
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    masterVolumeGainNode,
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    setAudioMetadata,
    previewMetadata,
    currentInstrument,
    tabData,
    recordedAudioFile,
    recordedAudioBuffer,
    setRecordedAudioBuffer,
    playTab,
    playRecordedAudio,
    pauseAudio,
    fetchingFullTabData,
    audioContext,
    countInTimer,
    setCountInTimer,
    mobileHeaderModal,
    setMobileHeaderModal,
    loopDelay,
    setLoopDelay,
  } = useTabStore((state) => ({
    id: state.id,
    bpm: state.bpm,
    hasRecordedAudio: state.hasRecordedAudio,
    currentInstrumentName: state.currentInstrumentName,
    setCurrentInstrumentName: state.setCurrentInstrumentName,
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    masterVolumeGainNode: state.masterVolumeGainNode,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    tabData: state.tabData,
    recordedAudioFile: state.recordedAudioFile,
    recordedAudioBuffer: state.recordedAudioBuffer,
    setRecordedAudioBuffer: state.setRecordedAudioBuffer,
    playTab: state.playTab,
    playRecordedAudio: state.playRecordedAudio,
    pauseAudio: state.pauseAudio,
    fetchingFullTabData: state.fetchingFullTabData,
    audioContext: state.audioContext,
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
    mobileHeaderModal: state.mobileHeaderModal,
    setMobileHeaderModal: state.setMobileHeaderModal,
    loopDelay: state.loopDelay,
    setLoopDelay: state.setLoopDelay,
  }));

  // function resetAudioStateOnSourceChange(
  //   audioTypeBeingChangedTo: "Generated" | "Artist recording",
  // ) {
  //   if (oneSecondIntervalRef.current) {
  //     clearInterval(oneSecondIntervalRef.current);
  //     oneSecondIntervalRef.current = null;
  //   }

  //   pauseAudio(true);

  //   setAudioMetadata({
  //     tabId: id,
  //     type: audioTypeBeingChangedTo,
  //     playing: false,
  //     location: null,
  //     startLoopIndex: 0,
  //     endLoopIndex: -1,
  //     editingLoopRange: false,
  //     fullCurrentlyPlayingMetadataLength: -1,
  //   });

  //   setTabProgressValue(0);
  //   setCurrentChordIndex(0);
  // }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            if (audioMetadata.playing) pauseAudio();
          }}
        >
          <IoSettingsOutline className="h-5 w-5" />
          <span className="ml-3 mobileLandscape:ml-0 mobileLandscape:hidden">
            Settings
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="baseVertFlex size-full bg-black">
        <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
          <Label>Source</Label>
          <Select
            disabled={countInTimer.showing}
            value={audioMetadata.type}
            onValueChange={(value) => {
              if (value !== audioMetadata.type) {
                // resetAudioStateOnSourceChange(
                //   value as "Generated" | "Artist recording",
                // );
              }
            }}
          >
            <SelectTrigger className="max-w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Audio source</SelectLabel>

                <SelectItem value={"Generated"}>Generated</SelectItem>

                <SelectItem
                  value={"Artist recording"}
                  disabled={!hasRecordedAudio}
                >
                  Artist recording
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
          <Label>Instrument</Label>
          <Select
            disabled={
              audioMetadata.type === "Artist recording" || countInTimer.showing
            }
            // onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
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
            <SelectTrigger className="max-w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Instruments</SelectLabel>

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

                <SelectItem value={"acoustic_grand_piano"}>
                  Acoustic grand piano
                </SelectItem>

                <SelectItem value={"electric_grand_piano"}>
                  Electric grand piano
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* unsure of this setup, might be better as a <Range> like in squeak
          or as [-] val [+] system */}

        <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
          <Label>Loop delay</Label>
          <Select
            disabled={
              audioMetadata.type === "Artist recording" || countInTimer.showing
            }
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
              <SelectGroup>
                <SelectLabel>Loop delay</SelectLabel>
                <SelectItem value={"0s"}>0 seconds</SelectItem>
                <SelectItem value={"1s"}>1 second</SelectItem>
                <SelectItem value={"2s"}>2 seconds</SelectItem>
                <SelectItem value={"3s"}>3 seconds</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
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
          <span className="ml-3 mobileLandscape:ml-0 mobileLandscape:hidden">
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
                          <p>x{section.repetitions}</p>
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
                <div className="my-4 grid max-h-[calc(100dvh-6rem)] w-full grid-cols-1 !justify-start gap-8 overflow-y-scroll px-8 xs:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                  <>
                    {chords.map((chord, index) => (
                      <div key={chord.id} className="baseFlex w-full">
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

                          <div className="h-48 narrowMobileLandscape:h-36">
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
              className={`baseVertFlex h-full max-h-[calc(100dvh-6rem)] w-full gap-10 overflow-y-auto ${strummingPatterns.length > 0 ? "!justify-start pb-8 pt-4" : ""}`}
            >
              {strummingPatterns.length > 0 ? (
                <>
                  {strummingPatterns.map((pattern, index) => (
                    <div key={pattern.id} className="shrink-0 overflow-hidden">
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
                <div className="text-center">
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

interface Settings {
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
}

function Settings({ tabProgressValue, setTabProgressValue }: Settings) {
  const {
    id,
    bpm,
    hasRecordedAudio,
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    masterVolumeGainNode,
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    setAudioMetadata,
    previewMetadata,
    currentInstrument,
    tabData,
    recordedAudioFile,
    recordedAudioBuffer,
    setRecordedAudioBuffer,
    playTab,
    playRecordedAudio,
    pauseAudio,
    looping,
    fetchingFullTabData,
    audioContext,
    countInTimer,
    setCountInTimer,
    mobileHeaderModal,
    setMobileHeaderModal,
    loopDelay,
    setLoopDelay,
  } = useTabStore((state) => ({
    id: state.id,
    bpm: state.bpm,
    hasRecordedAudio: state.hasRecordedAudio,
    currentInstrumentName: state.currentInstrumentName,
    setCurrentInstrumentName: state.setCurrentInstrumentName,
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    masterVolumeGainNode: state.masterVolumeGainNode,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    tabData: state.tabData,
    recordedAudioFile: state.recordedAudioFile,
    recordedAudioBuffer: state.recordedAudioBuffer,
    setRecordedAudioBuffer: state.setRecordedAudioBuffer,
    playTab: state.playTab,
    playRecordedAudio: state.playRecordedAudio,
    pauseAudio: state.pauseAudio,
    looping: state.looping,
    fetchingFullTabData: state.fetchingFullTabData,
    audioContext: state.audioContext,
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
    mobileHeaderModal: state.mobileHeaderModal,
    setMobileHeaderModal: state.setMobileHeaderModal,
    loopDelay: state.loopDelay,
    setLoopDelay: state.setLoopDelay,
  }));

  const volume = useGetLocalStorageValues().volume;
  const localStorageVolume = useLocalStorageValue("autostrumVolume");

  return (
    <div className="baseFlex w-full !items-end gap-4">
      <div className="baseVertFlex !items-start gap-2">
        <Label>Source</Label>
        <Select
          value={audioMetadata.type}
          disabled={countInTimer.showing || audioMetadata.editingLoopRange}
          onValueChange={(value) => {
            if (value !== audioMetadata.type) {
              //  resetAudioStateOnSourceChange(
              //    value as "Generated" | "Artist recording",
              //  );
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Audio source</SelectLabel>

              <SelectItem value={"Generated"}>Generated</SelectItem>

              <SelectItem
                value={"Artist recording"}
                disabled={!hasRecordedAudio}
              >
                Artist recording
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="baseVertFlex !items-start gap-2">
        <Label>Instrument</Label>
        <Select
          disabled={
            audioMetadata.type === "Artist recording" ||
            countInTimer.showing ||
            audioMetadata.editingLoopRange
          }
          value={currentInstrumentName}
          onValueChange={(value) => {
            pauseAudio();

            setCurrentInstrumentName(
              value as
                | "acoustic_guitar_nylon"
                | "acoustic_guitar_steel"
                | "electric_guitar_clean"
                | "electric_guitar_jazz"
                | "acoustic_grand_piano"
                | "electric_grand_piano",
            );
          }}
        >
          <SelectTrigger className="w-[12rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Instruments</SelectLabel>

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

              <SelectItem value={"acoustic_grand_piano"}>
                Acoustic grand piano
              </SelectItem>

              <SelectItem value={"electric_grand_piano"}>
                Electric grand piano
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="baseVertFlex !items-start gap-2">
        <Label>Speed</Label>
        <Select
          disabled={
            audioMetadata.type === "Artist recording" ||
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
            <SelectGroup>
              <SelectLabel>Speed</SelectLabel>
              <SelectItem value={"0.25x"}>0.25x</SelectItem>
              <SelectItem value={"0.5x"}>0.5x</SelectItem>
              <SelectItem value={"0.75x"}>0.75x</SelectItem>
              <SelectItem value={"1x"}>1x</SelectItem>
              <SelectItem value={"1.25x"}>1.25x</SelectItem>
              <SelectItem value={"1.5x"}>1.5x</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="baseVertFlex !items-start gap-2">
        <Label>Loop delay</Label>
        <Select
          disabled={
            audioMetadata.type === "Artist recording" || countInTimer.showing
          }
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
            <SelectGroup>
              <SelectLabel>Loop delay</SelectLabel>
              <SelectItem value={"0s"}>0 seconds</SelectItem>
              <SelectItem value={"1s"}>1 second</SelectItem>
              <SelectItem value={"2s"}>2 seconds</SelectItem>
              <SelectItem value={"3s"}>3 seconds</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Toggle
        variant={"outline"}
        aria-label="Edit looping range"
        disabled={
          !looping ||
          audioMetadata.type === "Artist recording" ||
          audioMetadata.playing ||
          countInTimer.showing
        }
        pressed={audioMetadata.editingLoopRange}
        className="size-9 p-1"
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
      </Toggle>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="size-9 !p-0">
            {volume === 0 ? (
              <FaVolumeMute className="h-5 w-5" />
            ) : volume < 1 ? (
              <FaVolumeDown className="h-5 w-5" />
            ) : (
              <FaVolumeUp className="h-5 w-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="baseVertFlex h-36 w-12 !flex-nowrap gap-2 p-2"
          side="top"
        >
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
