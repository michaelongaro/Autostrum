import { type Dispatch, type SetStateAction, useMemo } from "react";
import { FaBook } from "react-icons/fa";
import AnimatedTabs from "~/components/ui/AnimatedTabs";
import { Button } from "~/components/ui/button";
import TuningFork from "~/components/ui/icons/TuningFork";
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
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { parse, toString } from "~/utils/tunings";

function PlaybackTopMetadata() {
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

  console.log("viewportLabel", viewportLabel);

  if (playbackMetadata === null || viewportLabel === "narrowMobileLandscape")
    return;

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
          <div className="baseFlex w-full !items-end !justify-start gap-2">
            {/* title + auto tuner button */}
            <div className="baseVertFlex !items-start gap-2">
              <div className="baseFlex gap-4">
                <p className="text-xl font-bold text-white tablet:text-2xl">
                  {title}
                </p>

                {!viewportLabel.includes("mobile") && (
                  <>
                    <Separator className="h-6 w-[1px]" />

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
                  </>
                )}
              </div>

              <div className="baseFlex gap-4">
                <div className="baseVertFlex !items-start text-nowrap">
                  <p className="text-sm font-medium">Tempo</p>
                  <div className="baseFlex gap-1">
                    {getDynamicNoteLengthIcon(
                      playbackMetadata[currentChordIndex]?.noteLength ??
                        "1/4th",
                    )}
                    {playbackMetadata[currentChordIndex]?.bpm ?? "120"} BPM
                  </div>
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

                {!viewportLabel.includes("mobile") && (
                  <Button
                    variant={"outline"}
                    className="size-9 !p-0"
                    onClick={() => setShowEffectGlossaryModal(true)}
                  >
                    <FaBook className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {viewportLabel.includes("mobile") && (
                <div className="baseFlex mt-1.5 gap-2">
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
            </div>
          </div>

          {!viewportLabel.includes("mobile") && <Menu />}
        </div>
      )}
    </>
  );
}

export default PlaybackTopMetadata;

function Menu() {
  const { playbackDialogViewingState, setPlaybackDialogViewingState } =
    useTabStore((state) => ({
      playbackDialogViewingState: state.playbackDialogViewingState,
      setPlaybackDialogViewingState: state.setPlaybackDialogViewingState,
    }));

  return (
    <div className="baseVertFlex max-h-dvh w-full max-w-none !justify-start rounded-full border-[1px] border-stone-400 bg-black py-1">
      <AnimatedTabs
        activeTabName={playbackDialogViewingState}
        setActiveTabName={
          setPlaybackDialogViewingState as Dispatch<SetStateAction<string>>
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
