import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LoopRangeSelectionStep } from "~/utils/loopRangeHelpers";

export interface PlaybackLoopRangeEditContextValue {
  enabled: boolean;
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
  pendingStartIndex: number | null;
  setPendingStartIndex: Dispatch<SetStateAction<number | null>>;
  selectionStep: LoopRangeSelectionStep;
  onSelectChord: (index: number) => void;
}

const PlaybackLoopRangeEditContext =
  createContext<PlaybackLoopRangeEditContextValue | null>(null);

export function PlaybackLoopRangeEditProvider({
  value,
  children,
}: {
  value: PlaybackLoopRangeEditContextValue;
  children: React.ReactNode;
}) {
  return (
    <PlaybackLoopRangeEditContext.Provider value={value}>
      {children}
    </PlaybackLoopRangeEditContext.Provider>
  );
}

export function usePlaybackLoopRangeEdit() {
  return useContext(PlaybackLoopRangeEditContext);
}
