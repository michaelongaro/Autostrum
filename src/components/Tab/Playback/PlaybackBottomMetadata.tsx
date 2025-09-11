import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import ChordDiagram from "~/components/Tab/ChordDiagram";
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
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore, type Section } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { tuningNotesToName } from "~/utils/tunings";
import { Direction, getTrackBackground, Range } from "react-range";

interface PlaybackBottomMetadata {
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
  showBackgroundBlur: boolean;
  setShowBackgroundBlur: Dispatch<SetStateAction<boolean>>;
  tabData: Section[];
}

function PlaybackBottomMetadata({
  loopRange,
  setLoopRange,
  tabProgressValue,
  setTabProgressValue,
  showBackgroundBlur,
  setShowBackgroundBlur,
  tabData,
}: PlaybackBottomMetadata) {
  const {
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
                  <TuningFork className="size-4" />
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

                        <div className="my-1 h-[1px] w-full bg-primary"></div>
                        <SelectItem key={"fullTab"} value={`fullTab`}>
                          Full tab
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <MobileSettingsPopover
                  showBackgroundBlur={showBackgroundBlur}
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
                showBackgroundBlur={showBackgroundBlur}
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
  showBackgroundBlur: boolean;
  setShowBackgroundBlur: Dispatch<SetStateAction<boolean>>;
}

function MobileSettingsPopover({
  showBackgroundBlur,
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

  const [open, setOpen] = useState(false);

  // FYI: I really dislike this approach, and would have preferred to use the native
  // onOpenChange prop from <Popover>, however for whatever reason it would not work
  // properly on mobile, so I have this workaround instead.
  useEffect(() => {
    if (showBackgroundBlur === false) {
      setOpen(false);
    }
  }, [showBackgroundBlur]);

  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            setOpen((prev) => !prev);
            setShowBackgroundBlur((prev) => !prev);
            if (audioMetadata.playing) pauseAudio();
          }}
          style={{
            backgroundColor: open ? "hsl(var(--background))" : "transparent",
          }}
          className="z-50"
        >
          <IoSettingsOutline className="h-5 w-5" />
          <span className="ml-0 hidden mobilePortrait:ml-3 mobilePortrait:block">
            Settings
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="baseVertFlex size-full w-[450px] gap-4 mobilePortrait:w-[300px]">
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
            <div className="baseFlex w-full max-w-64 gap-2 md:justify-self-end">
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

              <Range
                label="Slider to control the playback volume"
                min={0}
                max={100}
                step={1}
                values={[volume * 50]} // 100 felt too quiet/narrow of a volume range
                onChange={(values) => {
                  localStorageVolume.set(`${values[0]! / 50}`); // 100 felt too quiet/narrow of a volume range
                }}
                renderTrack={({ props, children, disabled }) => (
                  <div
                    onMouseDown={props.onMouseDown}
                    onTouchStart={props.onTouchStart}
                    style={{
                      ...props.style,
                      display: "flex",
                      width: "100%",
                      justifyContent: "center",
                      margin: "0 0.35rem",
                    }}
                  >
                    <div
                      ref={props.ref}
                      style={{
                        height: "8px",
                        borderRadius: "4px",
                        filter: disabled ? "brightness(0.75)" : "none",
                        alignSelf: "center",
                        background: getTrackBackground({
                          values: [volume * 50],
                          colors: [
                            "hsl(var(--primary))",
                            "hsl(var(--gray)/0.75)",
                          ],
                          min: 0,
                          max: 100,
                        }),
                      }}
                      className={`relative w-full`}
                    >
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ props }) => (
                  <div
                    {...props}
                    className="!z-20 size-[18px] rounded-full border bg-primary"
                  />
                )}
              />
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
      <DialogContent className="baseVertFlex size-full max-h-dvh max-w-none !justify-start !rounded-none border-none pb-0">
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
                <p className="text-lg font-semibold text-gray">
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
                        <span className="text-gray">
                          {formatSecondsToMinutes(section.startSeconds)}
                        </span>
                        <span className="text-gray">-</span>
                        <span className="text-gray">
                          {formatSecondsToMinutes(section.endSeconds)}
                        </span>
                      </div>

                      <div className="baseFlex gap-2">
                        <span className="text-nowrap font-semibold">
                          {section.title}
                        </span>
                        {section.repetitions > 1 && (
                          <p>({section.repetitions}x)</p>
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
                <div className="baseFlex my-4 max-h-[calc(100dvh-6rem)] w-full flex-wrap gap-8 overflow-y-scroll px-8">
                  <>
                    {chords.map((chord, index) => (
                      <div
                        key={chord.id}
                        className="baseFlex w-full max-w-[175px]"
                      >
                        <div className="baseVertFlex gap-3">
                          <div className="baseFlex w-full !justify-between border-b py-2">
                            <span
                              style={{
                                color:
                                  previewMetadata.indexOfPattern === index &&
                                  previewMetadata.playing &&
                                  previewMetadata.type === "chord"
                                    ? "hsl(var(--primary))"
                                    : "hsl(var(--foreground))",
                              }}
                              className="px-3 font-semibold transition-colors"
                            >
                              {chord.name}
                            </span>

                            {/* preview chord button */}
                            <Button
                              variant={"audio"}
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

                          <div className="h-36">
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
              className="baseVertFlex h-full max-h-[calc(100dvh-6rem)]"
            >
              {strummingPatterns.length > 0 ? (
                <div className="baseVertFlex h-full w-full !justify-start gap-10 overflow-y-auto py-8">
                  {strummingPatterns.map((pattern, index) => (
                    <div
                      key={pattern.id}
                      className="shrink-0 self-start overflow-hidden"
                    >
                      <div className="baseVertFlex !items-start">
                        <Button
                          variant={"audio"}
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
                        <div className="baseFlex border-b-none rounded-md border-2">
                          <StrummingPattern
                            data={pattern}
                            mode="viewing"
                            index={index}
                            lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                            setLastModifiedPalmMuteNode={
                              setLastModifiedPalmMuteNode
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
        <Label htmlFor="instrument">Instrument</Label>
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
          <SelectTrigger id="instrument" className="w-[200px]">
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
        <Label htmlFor="speed">Speed</Label>
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
          <SelectTrigger id="speed" className="w-20">
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
        <Label htmlFor="loopDelay">Loop delay</Label>
        <Select
          disabled={countInTimer.showing}
          value={`${loopDelay}s`}
          onValueChange={(value) => {
            pauseAudio();

            setLoopDelay(Number(value[0]));
          }}
        >
          <SelectTrigger id="loopDelay" className="w-16">
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
          <Button variant="outline" className="size-10 !p-0">
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
        <PopoverContent
          className="baseVertFlex h-40 w-[54px] gap-2 pb-2 pt-4"
          side="top"
        >
          <Range
            label="Slider to control the playback volume"
            direction={Direction.Up}
            min={0}
            max={100}
            step={1}
            values={[volume * 50]} // 100 felt too quiet/narrow of a volume range
            onChange={(values) => {
              localStorageVolume.set(`${values[0]! / 50}`); // 100 felt too quiet/narrow of a volume range
            }}
            renderTrack={({ props, children }) => (
              <div
                onMouseDown={props.onMouseDown}
                onTouchStart={props.onTouchStart}
                style={{
                  ...props.style,
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  justifyContent: "center",
                  margin: "0.25rem 0",
                }}
              >
                <div
                  ref={props.ref}
                  style={{
                    width: "8px",
                    borderRadius: "4px",
                    alignSelf: "center",
                    background: getTrackBackground({
                      values: [volume * 50],
                      colors: ["hsl(var(--primary))", "hsl(var(--gray)/0.75)"],
                      min: 0,
                      max: 100,
                      direction: Direction.Up,
                    }),
                  }}
                  className={`relative h-full`}
                >
                  {children}
                </div>
              </div>
            )}
            renderThumb={({ props }) => (
              <div
                {...props}
                className="!z-20 size-[18px] rounded-full border bg-primary"
              />
            )}
          />
          <span>{Math.floor(volume * 50)}%</span>
        </PopoverContent>
      </Popover>
    </div>
  );
}
