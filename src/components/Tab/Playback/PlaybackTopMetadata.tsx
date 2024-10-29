import { FaBook, FaListUl } from "react-icons/fa";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import { parse, toString } from "~/utils/tunings";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";
import { Separator } from "~/components/ui/separator";
import TuningFork from "~/components/ui/icons/TuningFork";
import { AnimatePresence, motion } from "framer-motion";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { type LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { HiOutlineInformationCircle } from "react-icons/hi";
import Chord from "~/components/Tab/Chord";
import AnimatedTabs from "~/components/ui/AnimatedTabs";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";

interface PlaybackTopMetadata {
  selectedTab:
    | "Practice"
    | "Section progression"
    | "Chords"
    | "Strumming patterns";
  setSelectedTab: Dispatch<
    SetStateAction<
      "Practice" | "Section progression" | "Chords" | "Strumming patterns"
    >
  >;
}

function PlaybackTopMetadata({
  selectedTab,
  setSelectedTab,
}: PlaybackTopMetadata) {
  const {
    tabData,
    title,
    tuning,
    capo,
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
    tuning: state.tuning,
    capo: state.capo,
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

  // const index = realChordsToFullChordsMap[currentChordIndex];

  if (playbackMetadata === null) return;

  // TODO: decide later how you want to conditionally render landscape mobile vs the rest
  return (
    <>
      {viewportLabel === "mobileLandscape" ? (
        <div className="baseVertFlex w-full gap-2">
          <div className="baseFlex w-full !justify-start gap-4 px-4 pt-2">
            <p className="text-lg font-semibold text-white tablet:text-2xl">
              {title}
            </p>

            <Separator className="h-4 w-[1px]" />

            <div className="baseFlex gap-1 text-nowrap">
              {getDynamicNoteLengthIcon(
                playbackMetadata[currentChordIndex]?.noteLength ?? "1/4th",
              )}
              {playbackMetadata[currentChordIndex]?.bpm ?? "120"} BPM
            </div>
          </div>
        </div>
      ) : (
        <div className="baseFlex mt-4 w-full !items-end !justify-between gap-2 px-4">
          <div className="baseVertFlex w-full !items-start gap-2">
            {/* title + auto tuner button */}
            <div className="baseVertFlex !items-start gap-2">
              <div className="baseFlex gap-4">
                <p className="text-xl font-bold text-white tablet:text-2xl">
                  {title}
                </p>
              </div>

              <div className="baseFlex gap-4">
                <div className="baseVertFlex !items-start">
                  <p className="text-sm font-medium">Tempo</p>
                  {getDynamicNoteLengthIcon(
                    playbackMetadata[currentChordIndex]?.noteLength ?? "1/4th",
                  )}
                  {playbackMetadata[currentChordIndex]?.bpm ?? "120"} BPM
                </div>
                <div className="baseVertFlex !items-start">
                  <p className="text-sm font-medium">Tuning</p>
                  <p>{toString(parse(tuning), { pad: 0 })}</p>
                </div>

                <div className="baseVertFlex !items-start">
                  <p className="text-sm font-medium">Capo</p>
                  {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
                </div>

                <Button
                  variant={"outline"}
                  className="baseFlex h-9 gap-2 !py-0"
                >
                  <TuningFork className="size-4 fill-white" />
                  Tuner
                </Button>
                {/* <Button
                variant={"outline"}
                className="size-9 !p-0"
                onClick={() => setShowEffectGlossaryModal(true)}
              >
                <FaBook className="h-4 w-4" />
              </Button> */}
              </div>
            </div>

            {/* <div className="baseFlex gap-2">
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
            </div> */}
          </div>

          {!viewportLabel.includes("mobile") && (
            <Menu selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
          )}
        </div>
      )}
    </>
  );
}

export default PlaybackTopMetadata;

interface Menu {
  selectedTab:
    | "Practice"
    | "Section progression"
    | "Chords"
    | "Strumming patterns";
  setSelectedTab: Dispatch<
    SetStateAction<
      "Practice" | "Section progression" | "Chords" | "Strumming patterns"
    >
  >;
}

function Menu({ selectedTab, setSelectedTab }: Menu) {
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

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] = useState<
    boolean[]
  >([]);
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  return (
    <div className="baseVertFlex max-h-dvh w-full max-w-none !justify-start rounded-full border-[1px] border-stone-400 bg-black py-1">
      <AnimatedTabs
        activeTabName={selectedTab}
        setActiveTabName={setSelectedTab as Dispatch<SetStateAction<string>>}
        tabNames={[
          "Practice",
          "Section progression",
          "Chords",
          "Strumming patterns",
        ]}
      />

      <AnimatePresence mode="popLayout">
        {selectedTab === "Section progression" && (
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

        {selectedTab === "Chords" && (
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

        {selectedTab === "Strumming patterns" && (
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
                              const prevArtificalPlayButtonTimeout = [...prev];
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
    </div>
  );
}
