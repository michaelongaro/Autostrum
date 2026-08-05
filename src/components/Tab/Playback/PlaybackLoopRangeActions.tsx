import { BsArrowLeftShort } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import { VscDebugRestart } from "react-icons/vsc";
import {
  isDraftLoopRangeComplete,
  isDraftLoopRangeEmpty,
  isDraftLoopRangeUnchanged,
} from "~/utils/loopRangeHelpers";
import PlaybackSectionPicker from "~/components/Tab/Playback/PlaybackSectionPicker";

function PlaybackLoopRangeActions() {
  const {
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
    draftLoopStartIndex,
    draftLoopEndIndex,
    setDraftLoopRange,
    sectionProgressionLength,
    viewportLabel,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
    setDraftLoopRange: state.setDraftLoopRange,
    sectionProgressionLength: state.sectionProgression.length,
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
      className={`baseFlex w-full gap-3 px-4 pb-2 ${viewportLabel.includes("Landscape") && sectionProgressionLength > 1 ? "!justify-between" : ""}`}
    >
      {viewportLabel.includes("Landscape") && <PlaybackSectionPicker />}

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
