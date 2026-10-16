import { useState } from "react";
import { useTabStore } from "~/stores/TabStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { usePracticePlayback } from "~/components/tools/PracticePlaybackContext";
import PracticePlaybackSectionPicker from "~/components/Tab/Playback/PracticePlaybackSectionPicker";

function PlaybackSectionPicker() {
  const practicePlayback = usePracticePlayback();

  if (practicePlayback) {
    return <PracticePlaybackSectionPicker />;
  }

  return <TabPlaybackSectionPicker />;
}

function TabPlaybackSectionPicker() {
  const {
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
    setDraftLoopRange,
    sectionProgression,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
    setDraftLoopRange: state.setDraftLoopRange,
    sectionProgression: state.sectionProgression,
  }));

  const [currentSectionTitle, setCurrentSectionTitle] = useState("Full tab");
  const [currentSectionId, setCurrentSectionId] = useState("fullTab");

  const sectionsById: Record<string, { sectionId: string; title: string }> = {};

  for (const section of sectionProgression) {
    if (!sectionsById[section.sectionId]) {
      sectionsById[section.sectionId] = {
        sectionId: section.sectionId,
        title: section.title,
      };
    }
  }

  const uniqueSections = Object.values(sectionsById);

  function handleChangeSection(value: string) {
    setAudioMetadata({
      ...audioMetadata,
      location:
        value === "fullTab"
          ? null
          : {
              sectionIndex: uniqueSections.findIndex((elem) => {
                return elem.sectionId === value;
              }),
            },
      startLoopIndex: 0,
      endLoopIndex: -1,
    });

    setCurrentChordIndex(0);

    setDraftLoopRange({
      startIndex: null,
      endIndex: null,
    });

    setCurrentSectionTitle(
      sectionProgression[
        sectionProgression.findIndex((elem) => elem.sectionId === value)
      ]?.title ?? "Full tab",
    );

    setCurrentSectionId(value);
  }

  if (sectionProgression.length <= 1) return null;

  return (
    <div className="baseFlex gap-4">
      <Separator className="hidden h-6 w-[1px] bg-foreground/50 tablet:block" />
      <div className="baseFlex gap-2">
        <Label htmlFor="sectionPicker" className="text-sm font-medium">
          Section
        </Label>
        <Select
          value={currentSectionId}
          onValueChange={(value) => {
            handleChangeSection(value);
          }}
        >
          <SelectTrigger
            id="sectionPicker"
            className="!h-9 !max-w-32 mobilePortrait:!h-8 mobilePortrait:!max-w-none"
          >
            <SelectValue placeholder="Select a section" asChild>
              <p className="truncate">{currentSectionTitle}</p>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="!justify-start">
            <>
              {uniqueSections.map((section) => {
                return (
                  <SelectItem key={section.sectionId} value={section.sectionId}>
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
    </div>
  );
}

export default PlaybackSectionPicker;
