import { type Dispatch, type SetStateAction } from "react";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import {
  getConcreteLoopEndIndex,
  isDraftLoopRangeUnchanged,
  isFullLoopRange,
} from "~/utils/loopRangeHelpers";

interface PlaybackLoopRangeActions {
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
  pendingStartIndex: number | null;
  setPendingStartIndex: Dispatch<SetStateAction<number | null>>;
}

function PlaybackLoopRangeActions({
  loopRange,
  setLoopRange,
  pendingStartIndex,
  setPendingStartIndex,
}: PlaybackLoopRangeActions) {
  const {
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
  }));

  const fullLength = audioMetadata.fullTabMetadataLength;
  const isAlreadyFullRange =
    pendingStartIndex === null && isFullLoopRange(loopRange, fullLength);
  const isUnchanged = isDraftLoopRangeUnchanged(loopRange, audioMetadata);

  function exitEditMode() {
    setPendingStartIndex(null);
    setCurrentChordIndex(0);
    setAudioMetadata({
      ...audioMetadata,
      editingLoopRange: false,
    });
  }

  function handleReturn() {
    // Discard draft edits and restore the committed store range.
    setLoopRange([
      audioMetadata.startLoopIndex,
      getConcreteLoopEndIndex(
        audioMetadata.endLoopIndex,
        fullLength,
      ),
    ]);
    exitEditMode();
  }

  function handleReset() {
    if (isAlreadyFullRange) return;

    setPendingStartIndex(null);
    setLoopRange([0, Math.max(0, fullLength - 1)]);
  }

  function handleSave() {
    if (isUnchanged || pendingStartIndex !== null) return;

    const adjustedEndIndex =
      loopRange[1] === fullLength - 1 ? -1 : loopRange[1];

    setPendingStartIndex(null);
    setCurrentChordIndex(0);
    setAudioMetadata({
      ...audioMetadata,
      startLoopIndex: loopRange[0],
      endLoopIndex: adjustedEndIndex,
      editingLoopRange: false,
    });
  }

  return (
    <div className="baseFlex w-full gap-3 px-4 pb-2">
      <Button variant="outline" onClick={handleReturn} className="min-w-20">
        Return
      </Button>
      <Button
        variant="outline"
        disabled={isAlreadyFullRange}
        onClick={handleReset}
        className="min-w-20"
      >
        Reset
      </Button>
      <Button
        disabled={isUnchanged || pendingStartIndex !== null}
        onClick={handleSave}
        className="min-w-20"
      >
        Save
      </Button>
    </div>
  );
}

export default PlaybackLoopRangeActions;
