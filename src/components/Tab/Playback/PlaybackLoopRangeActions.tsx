import { BsArrowLeftShort } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import { VscDebugRestart } from "react-icons/vsc";
import {
  isDraftLoopRangeComplete,
  isDraftLoopRangeEmpty,
  isDraftLoopRangeUnchanged,
} from "~/utils/loopRangeHelpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";

function PlaybackLoopRangeActions() {
  const {
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
    draftLoopStartIndex,
    draftLoopEndIndex,
    setDraftLoopRange,
    sectionProgression,
    viewportLabel,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
    setDraftLoopRange: state.setDraftLoopRange,
    sectionProgression: state.sectionProgression,
    viewportLabel: state.viewportLabel,
  }));

  const isAlreadyEmpty = isDraftLoopRangeEmpty(
    draftLoopStartIndex,
    draftLoopEndIndex,
  );
  const isComplete = isDraftLoopRangeComplete(
    draftLoopStartIndex,
    draftLoopEndIndex,
  );
  const isUnchanged = isDraftLoopRangeUnchanged(
    draftLoopStartIndex,
    draftLoopEndIndex,
    audioMetadata,
  );

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

    setDraftLoopRange({
      startIndex: null,
      endIndex: null,
    });

    setCurrentChordIndex(0);
  }

  // Empty draft means "full tab" ([0, -1]) and is a valid Save target when the
  // committed store range is narrowed. Incomplete mid-pick drafts are not.
  const canSave = !isUnchanged && (isAlreadyEmpty || isComplete);

  function exitEditMode() {
    setCurrentChordIndex(0);
    setAudioMetadata({
      ...audioMetadata,
      editingLoopRange: false,
    });
  }

  function handleReturn() {
    // Discard draft edits — store still holds the committed range.
    setDraftLoopRange({ startIndex: null, endIndex: null });
    exitEditMode();
  }

  function handleReset() {
    if (isAlreadyEmpty) return;
    setDraftLoopRange({ startIndex: null, endIndex: null });
  }

  function handleSave() {
    if (!canSave) return;

    if (isAlreadyEmpty) {
      setCurrentChordIndex(0);
      setAudioMetadata({
        ...audioMetadata,
        startLoopIndex: 0,
        endLoopIndex: -1,
        editingLoopRange: false,
      });
      return;
    }

    const fullLength = audioMetadata.fullTabMetadataLength;
    const adjustedEndIndex =
      draftLoopEndIndex === fullLength - 1 ? -1 : draftLoopEndIndex!;

    setCurrentChordIndex(0);
    setAudioMetadata({
      ...audioMetadata,
      startLoopIndex: draftLoopStartIndex!,
      endLoopIndex: adjustedEndIndex,
      editingLoopRange: false,
    });
    setDraftLoopRange({ startIndex: null, endIndex: null });
  }

  return (
    <div
      className={`baseFlex w-full gap-3 px-4 pb-2 ${viewportLabel.includes("Landscape") && sectionProgression.length > 1 ? "!justify-between" : ""}`}
    >
      {viewportLabel.includes("Landscape") && sectionProgression.length > 1 && (
        <div className="baseFlex gap-2">
          <Label htmlFor="sectionPicker" className="text-sm font-medium">
            Section
          </Label>
          <Select
            value={
              audioMetadata.location === null
                ? "fullTab"
                : sectionProgression[audioMetadata.location?.sectionIndex ?? 0]
                    ?.sectionId
            }
            onValueChange={(value) => {
              handleChangeSection(value);
            }}
          >
            <SelectTrigger
              id="sectionPicker"
              className="!h-9 max-w-32 sm:max-w-none"
            >
              <SelectValue placeholder="Select a section" asChild>
                <p className="truncate">
                  {audioMetadata.location === null
                    ? "Full tab"
                    : `${
                        sectionProgression[
                          uniqueSections.findIndex((elem) => {
                            return (
                              elem.sectionId ===
                              sectionProgression[
                                audioMetadata.location?.sectionIndex ?? 0
                              ]?.sectionId
                            );
                          })
                        ]?.title
                      }`}
                </p>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <>
                {uniqueSections.map((section) => {
                  return (
                    <SelectItem
                      key={section.sectionId}
                      value={section.sectionId}
                    >
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
      )}

      <div className="baseFlex mb-2 mt-2 gap-3 mobilePortrait:mt-8">
        <Button
          variant="outline"
          onClick={handleReturn}
          className="baseFlex min-w-20 pl-2"
        >
          <BsArrowLeftShort className="h-6 w-8" />
          Return
        </Button>
        <Button
          variant="outline"
          disabled={isAlreadyEmpty}
          onClick={handleReset}
          className="baseFlex min-w-20 gap-2"
        >
          <VscDebugRestart />
          Reset
        </Button>
        <Button disabled={!canSave} onClick={handleSave} className="min-w-24">
          Save
        </Button>
      </div>
    </div>
  );
}

export default PlaybackLoopRangeActions;
