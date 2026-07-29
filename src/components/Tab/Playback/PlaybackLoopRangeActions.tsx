import { BsArrowLeftShort } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import { VscDebugRestart } from "react-icons/vsc";
import {
  isDraftLoopRangeComplete,
  isDraftLoopRangeEmpty,
  isDraftLoopRangeUnchanged,
} from "~/utils/loopRangeHelpers";

function PlaybackLoopRangeActions() {
  const {
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
    draftLoopStartIndex,
    draftLoopEndIndex,
    setDraftLoopRange,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
    setDraftLoopRange: state.setDraftLoopRange,
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
    if (!isComplete || isUnchanged) return;

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
    <div className="baseFlex w-full gap-3 px-4 pb-2">
      <Button
        variant="outline"
        onClick={handleReturn}
        className="baseFlex min-w-20"
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
      <Button
        disabled={!isComplete || isUnchanged}
        onClick={handleSave}
        className="min-w-20"
      >
        Save
      </Button>
    </div>
  );
}

export default PlaybackLoopRangeActions;
