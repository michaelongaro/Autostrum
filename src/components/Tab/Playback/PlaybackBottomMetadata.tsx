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
import { HiOutlineInformationCircle } from "react-icons/hi";
import { IoSettingsOutline } from "react-icons/io5";
import { TiArrowLoop } from "react-icons/ti";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import Chord from "~/components/Tab/Chord";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Toggle } from "~/components/ui/toggle";
import { VerticalSlider } from "~/components/ui/verticalSlider";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore } from "~/stores/TabStore";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { parse, toString } from "~/utils/tunings";

function PlaybackBottomMetadata() {
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
        <div className="baseFlex w-full !justify-between gap-4 px-4 pb-2">
          <div className="baseFlex gap-4">
            <div className="baseVertFlex !items-start">
              <p className="text-sm font-medium">Tuning</p>
              <p>{toString(parse(tuning), { pad: 0 })}</p>
            </div>

            <div className="baseVertFlex !items-start">
              <p className="text-sm font-medium">Capo</p>
              {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
            </div>

            <Button variant={"outline"} className="size-9 !p-0">
              <TuningFork className="size-4 fill-white" />
            </Button>
            <Button
              variant={"outline"}
              className="size-9 !p-0"
              onClick={() => setShowEffectGlossaryModal(true)}
            >
              <FaBook className="h-4 w-4" />
            </Button>
          </div>

          <div className="baseFlex gap-4">
            <div className="baseFlex gap-2">
              <p className="text-sm font-medium">Section</p>
              <Select
                // this is jank, need to fix logic
                value={title === "" ? undefined : title}
                onValueChange={(value) => {
                  setAudioMetadata({
                    ...audioMetadata,
                    location:
                      value === "fullSong"
                        ? null
                        : {
                            sectionIndex: parseInt(value),
                          },
                  });
                }}
              >
                <SelectTrigger className="!h-8 max-w-28 sm:max-w-none">
                  <SelectValue placeholder="Select a section">
                    {audioMetadata.location === null
                      ? "Full song"
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
                      <SelectItem key={"fullSong"} value={`fullSong`}>
                        Full song
                      </SelectItem>
                      {sections.map((section, idx) => {
                        return (
                          <SelectItem key={`${section.id}`} value={`${idx}`}>
                            {section.title}
                          </SelectItem>
                        );
                      })}
                    </>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <MobileSettingsDialog />
            <MobileMenuDialog />
          </div>
        </div>
      ) : (
        <div className="baseFlex w-full px-4 py-4">
          {viewportLabel.includes("mobile") ? (
            <div className="baseFlex gap-4">
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
          ) : (
            <div className="baseFlex w-full">
              <Settings />
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
        <Button variant="outline">
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
            <SelectTrigger className="max-w-[10rem] border-ring">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Audio source</SelectLabel>

                <SelectItem value={"Generated"}>Generated</SelectItem>

                <SelectItem
                  value={"Artist recording"}
                  // disabled={!hasRecordedAudio}
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
            <SelectTrigger className="max-w-[15rem] border-ring">
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
            <SelectTrigger className="max-w-[10rem] border-ring">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Loop delay</SelectLabel>

                <SelectItem value={"0 seconds"}>0 seconds</SelectItem>

                <SelectItem value={"1 second"}>1 second</SelectItem>

                <SelectItem value={"2 seconds"}>2 seconds</SelectItem>

                <SelectItem value={"3 seconds"}>3 seconds</SelectItem>

                <SelectItem value={"4 seconds"}>4 seconds</SelectItem>

                <SelectItem value={"5 seconds"}>5 seconds</SelectItem>
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
        <Button variant="outline">
          <FaListUl className="h-5 w-5" />
          <span className="ml-3 mobileLandscape:ml-0 mobileLandscape:hidden">
            Menu
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="baseVertFlex size-full max-h-dvh max-w-none !justify-start !rounded-none bg-black">
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
              className="baseVertFlex max-h-[calc(100dvh-rem)] w-full gap-2 overflow-y-auto"
            >
              {sectionProgression.length === 0 ? (
                <p className="text-lg font-semibold text-white">
                  No section progression found.
                </p>
              ) : (
                <div className="baseVertFlex !justify-start gap-2">
                  {sectionProgression.map((section) => (
                    <div key={section.id} className="baseFlex gap-2">
                      <p className="text-stone-400">
                        {formatSecondsToMinutes(section.elapsedSecondsIntoTab)}
                      </p>
                      <p className="font-semibold">{section.title}</p>
                      {section.repetitions > 1 && <p>x{section.repetitions}</p>}
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
              className="baseVertFlex w-full"
            >
              <div className="baseVertFlex max-h-[calc(100dvh-6rem)] !justify-start gap-4 overflow-y-auto">
                {chords.length > 0 ? (
                  <>
                    {chords.map((chord, index) => (
                      <div
                        key={chord.id}
                        className="baseFlex border-r-none h-10 shrink-0 overflow-hidden rounded-md border-2"
                      >
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

                        {/* TODO: replace this with better dynamic visual representation of chord on
                      fretboard */}
                        <div className="baseFlex h-full w-full !justify-evenly">
                          {/* preview button */}
                          <Popover>
                            <PopoverTrigger className="baseFlex mr-1 h-8 w-8 rounded-md transition-all hover:bg-white/20 active:hover:bg-white/10">
                              <HiOutlineInformationCircle className="h-5 w-5" />
                            </PopoverTrigger>
                            <PopoverContent className="chordPreviewGlassmorphic w-40 border-2 p-0 text-pink-100">
                              <Chord
                                chordBeingEdited={{
                                  index,
                                  value: chord,
                                }}
                                editing={false}
                                highlightChord={
                                  previewMetadata.indexOfPattern === index &&
                                  previewMetadata.playing &&
                                  previewMetadata.type === "chord"
                                }
                              />
                            </PopoverContent>
                          </Popover>
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
                                audioMetadata.playing || previewMetadata.playing
                                  ? 50
                                  : 0,
                              );
                            }}
                            className="baseFlex h-full w-10 rounded-l-none border-l-2"
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
                      </div>
                    ))}
                  </>
                ) : (
                  <div>No chords were specified for this tab.</div>
                )}
              </div>
            </motion.div>
          )}

          {activeTabName === "Strumming patterns" && (
            <motion.div
              key="Strumming patterns"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`baseVertFlex max-h-[calc(100dvh-6rem)] w-full gap-10 overflow-y-auto ${strummingPatterns.length > 0 ? "!items-start !justify-start" : ""}`}
            >
              {strummingPatterns.length > 0 ? (
                <>
                  {strummingPatterns.map((pattern, index) => (
                    <div key={pattern.id} className="shrink-0 overflow-hidden">
                      <div className="baseFlex !items-start">
                        <div className="baseFlex border-b-none rounded-md rounded-tr-none border-2">
                          <StrummingPattern
                            data={pattern}
                            mode="viewing"
                            index={index}
                            lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                            setLastModifiedPalmMuteNode={
                              setLastModifiedPalmMuteNode
                            }
                            pmNodeOpacities={[]}
                          />
                        </div>

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
                          className="w-10 rounded-l-none rounded-r-sm border-2 border-l-0 p-3"
                        >
                          <PlayButtonIcon
                            uniqueLocationKey={`strummingPatternPreview${index}`}
                            tabId={id}
                            currentInstrument={currentInstrument}
                            previewMetadata={previewMetadata}
                            indexOfPattern={index}
                            previewType="strummingPattern"
                          />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div>No strumming patterns were specified for this tab.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function Settings() {
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
  }));

  // TODO: do we need to make this a zustand state or shared in some way?
  const [tabProgressValue, setTabProgressValue] = useState(0);

  const volume = useGetLocalStorageValues().volume;
  const localStorageVolume = useLocalStorageValue("autostrumVolume");
  const localStorageLooping = useLocalStorageValue("autostrumLooping");

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
          <SelectTrigger>
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
          <SelectTrigger>
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
          <SelectTrigger className="max-w-[10rem] border-ring">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Loop delay</SelectLabel>

              <SelectItem value={"0 seconds"}>0 seconds</SelectItem>

              <SelectItem value={"1 second"}>1 second</SelectItem>

              <SelectItem value={"2 seconds"}>2 seconds</SelectItem>

              <SelectItem value={"3 seconds"}>3 seconds</SelectItem>

              <SelectItem value={"4 seconds"}>4 seconds</SelectItem>

              <SelectItem value={"5 seconds"}>5 seconds</SelectItem>
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
