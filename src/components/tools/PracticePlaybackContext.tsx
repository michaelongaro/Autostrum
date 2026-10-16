import { createContext, useContext, type ReactNode } from "react";
import type { PracticeExerciseGroup } from "~/data/tools/practiceExercises";

export type PracticePlaybackContextValue = {
  exerciseGroups: PracticeExerciseGroup[];
  selectedExerciseId: string;
  selectExercise: (exerciseId: string) => void;
};

const PracticePlaybackContext =
  createContext<PracticePlaybackContextValue | null>(null);

export function PracticePlaybackProvider({
  value,
  children,
}: {
  value: PracticePlaybackContextValue;
  children: ReactNode;
}) {
  return (
    <PracticePlaybackContext.Provider value={value}>
      {children}
    </PracticePlaybackContext.Provider>
  );
}

export function usePracticePlayback() {
  return useContext(PracticePlaybackContext);
}
