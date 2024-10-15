import { FaBook } from "react-icons/fa";
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
import { useMemo } from "react";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";
import { Separator } from "~/components/ui/separator";

interface PlaybackTopMetadata {
  realChordsToFullChordsMap: {
    [key: number]: number;
  };
}

function PlaybackTopMetadata({
  realChordsToFullChordsMap,
}: PlaybackTopMetadata) {
  const {
    tabData,
    title,
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

export default PlaybackTopMetadata;
