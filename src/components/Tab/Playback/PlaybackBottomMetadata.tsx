import { AnimatePresence, motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { FaBook, FaListUl } from "react-icons/fa";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { IoSettingsOutline } from "react-icons/io5";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import Chord from "~/components/Tab/Chord";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import type { LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
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
import { useTabStore } from "~/stores/TabStore";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { parse, toString } from "~/utils/tunings";

interface PlaybackBottomMetadata {
  realChordsToFullChordsMap: {
    [key: number]: number;
  };
}

function PlaybackBottomMetadata({
  realChordsToFullChordsMap,
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
  }));

  // idk if best approach, but need unique section titles, not the whole progression
  const sections = useMemo(() => {
    return tabData.map((section) => ({ id: section.id, title: section.title }));
  }, [tabData]);

  const index = realChordsToFullChordsMap[currentChordIndex];

  if (playbackMetadata === null || index === undefined) return;

  // TODO: decide later how you want to conditionally render landscape mobile vs the rest
  return (
    <>
      {viewportLabel === "mobileLandscape" ? (
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
                          playbackMetadata[index]?.location.sectionIndex ?? 0
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

            <MobileLandscapeSettingsDialog />
            <MobileLandscapeMenuDialog />
          </div>
        </div>
      ) : (
        <div className="baseFlex h-24 w-full !justify-between px-4">
          {/* title + auto tuner button */}
          <div className="baseVertFlex !items-start gap-2">
            <p className="text-xl font-bold text-white tablet:text-2xl">
              {title}
            </p>
            <div className="baseFlex gap-2">
              <Button variant={"secondary"}>
                Y Tune to {toString(parse(tuning), { pad: 0 })}
              </Button>
              <Button
                variant={"secondary"}
                onClick={() => setShowEffectGlossaryModal(true)}
              >
                <FaBook className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* section <Select> + current bpm (+ repeats?) */}
          <div className="baseFlex !justify-end gap-4">
            <Select
              // this is jank, need to fix logic
              value={title === "" ? undefined : title}
              onValueChange={(value) => {
                setAudioMetadata({
                  ...audioMetadata,
                  location: {
                    sectionIndex: parseInt(value),
                    // subSectionIndex: 0,
                    // chordSequenceIndex: 0,
                  },
                });
              }}
            >
              <SelectTrigger className="max-w-28 sm:max-w-none">
                <SelectValue placeholder="Select a section">
                  {sectionProgression[
                    playbackMetadata[index]?.location.sectionIndex ?? 0
                  ]?.title ?? ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup className="max-h-60 overflow-y-auto">
                  <SelectLabel>Sections</SelectLabel>

                  {sections.map((section, idx) => {
                    return (
                      <SelectItem key={`${section.id}`} value={`${idx}`}>
                        {section.title}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="baseFlex gap-1 text-nowrap">
              {getDynamicNoteLengthIcon(
                playbackMetadata[index]?.noteLength ?? "1/4th",
              )}
              {playbackMetadata[index]?.bpm ?? "120"} BPM
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackBottomMetadata;

function MobileLandscapeSettingsDialog() {
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

function MobileLandscapeMenuDialog() {
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
        </Button>
      </DialogTrigger>
      <DialogContent className="baseVertFlex size-full max-h-dvh max-w-none !justify-start !rounded-none bg-black">
        <AnimatedTabs
          activeTabName={activeTabName}
          setActiveTabName={setActiveTabName}
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
              className="baseVertFlex max-h-[calc(100dvh-6rem)] w-full !items-start !justify-start gap-10 overflow-y-auto"
            >
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
                        !currentInstrument || artificalPlayButtonTimeout[index]
                      }
                      onClick={() => {
                        if (
                          previewMetadata.playing &&
                          index === previewMetadata.indexOfPattern &&
                          previewMetadata.type === "strummingPattern"
                        ) {
                          pauseAudio();
                          setArtificalPlayButtonTimeout((prev) => {
                            const prevArtificalPlayButtonTimeout = [...prev];
                            prevArtificalPlayButtonTimeout[index] = true;
                            return prevArtificalPlayButtonTimeout;
                          });

                          setTimeout(() => {
                            setArtificalPlayButtonTimeout((prev) => {
                              const prevArtificalPlayButtonTimeout = [...prev];
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
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

const tabNames = ["Section progression", "Chords", "Strumming patterns"];

interface AnimatedTabs {
  activeTabName: "Section progression" | "Chords" | "Strumming patterns";
  setActiveTabName: Dispatch<
    SetStateAction<"Section progression" | "Chords" | "Strumming patterns">
  >;
}

function AnimatedTabs({ activeTabName, setActiveTabName }: AnimatedTabs) {
  return (
    <div className="flex space-x-1">
      {tabNames.map((tabName) => (
        <button
          key={tabName}
          onClick={() =>
            setActiveTabName(
              tabName as
                | "Section progression"
                | "Chords"
                | "Strumming patterns",
            )
          }
          className={`${
            activeTabName === tabName ? "" : "hover:text-white/60"
          } relative rounded-full px-3 py-1.5 text-sm font-medium text-white outline-sky-400 transition focus-visible:outline-2`}
          style={{
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {activeTabName === tabName && (
            <motion.span
              layoutId="bubble"
              className="absolute inset-0 z-10 bg-white mix-blend-difference"
              style={{ borderRadius: 9999 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {tabName}
        </button>
      ))}
    </div>
  );
}
