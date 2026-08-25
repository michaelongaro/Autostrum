import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import StaticTabSection from "~/components/Tab/Static/StaticTabSection";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import {
  getPracticeExerciseBpm,
  getPracticeExerciseTabSection,
  getPracticeExercisesTabData,
  groupPracticeExercisesByLevel,
  PRACTICE_LEVEL_LABELS,
  PRACTICE_TUNING,
  type PracticeExercise,
} from "~/data/tools/practiceExercises";
import { getTabStore, useTabStore } from "~/stores/TabStore";
import Logo from "~/components/ui/icons/Logo";
import { primePlaybackUserGesture } from "~/utils/primePlaybackUserGesture";
import GlossaryDialog from "~/components/Dialogs/GlossaryDialog";
import { PracticePlaybackProvider } from "~/components/tools/PracticePlaybackContext";
import { generateDefaultSectionProgression } from "~/utils/chordCompilationHelpers";

const PlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
  { ssr: false },
);

type PracticePlaybackPanelProps = {
  exercises: PracticeExercise[];
  emptyStateLabel: string;
};

function PracticePlaybackPanel({
  exercises,
  emptyStateLabel,
}: PracticePlaybackPanelProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exercises[0]?.id ?? "",
  );

  const [selectedDifficulty, setSelectedDifficulty] = useState("Beginner");

  const {
    showPlaybackModal,
    setShowPlaybackModal,
    pauseAudio,
    setEditing,
    setTitle,
    setTuning,
    setBpm,
    setCapo,
    setChords,
    setStrummingPatterns,
    setSectionProgression,
    setTabData,
    setCurrentChordIndex,
    setAudioMetadata,
    setExpandedTabData,
    setVisiblePlaybackContainerWidth,
    setDraftLoopRange,
    audioMetadata,
    color,
    theme,
  } = useTabStore((state) => ({
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    pauseAudio: state.pauseAudio,
    setEditing: state.setEditing,
    setTitle: state.setTitle,
    setTuning: state.setTuning,
    setBpm: state.setBpm,
    setCapo: state.setCapo,
    setChords: state.setChords,
    setStrummingPatterns: state.setStrummingPatterns,
    setSectionProgression: state.setSectionProgression,
    setTabData: state.setTabData,
    setCurrentChordIndex: state.setCurrentChordIndex,
    setAudioMetadata: state.setAudioMetadata,
    setExpandedTabData: state.setExpandedTabData,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    setDraftLoopRange: state.setDraftLoopRange,
    audioMetadata: state.audioMetadata,
    color: state.color,
    theme: state.theme,
  }));

  useAutoCompileChords();

  const selectedExercise =
    exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
  const exerciseGroups = useMemo(
    () => groupPracticeExercisesByLevel(exercises),
    [exercises],
  );
  const selectedExerciseTabSection = selectedExercise
    ? getPracticeExerciseTabSection(selectedExercise)
    : null;

  const selectExercise = useCallback(
    (exerciseId: string) => {
      const exercise = exercises.find((item) => item.id === exerciseId);
      if (!exercise || exercise.id === selectedExerciseId) return;

      const sectionIndex = exercises.findIndex((item) => item.id === exerciseId);
      const {
        showPlaybackModal: modalOpen,
        audioMetadata: currentAudioMetadata,
      } = getTabStore();

      setSelectedExerciseId(exerciseId);
      setSelectedDifficulty(PRACTICE_LEVEL_LABELS[exercise.level]);

      pauseAudio(true, true);
      setTitle(exercise.title);
      setBpm(getPracticeExerciseBpm(exercise));
      setCurrentChordIndex(0);
      setDraftLoopRange({
        startIndex: null,
        endIndex: null,
      });

      if (!modalOpen) {
        // Clear stale playback layout from the previous exercise so the modal
        // remeasures/recompiles instead of inheriting the old strip width/data.
        setExpandedTabData(null);
        setVisiblePlaybackContainerWidth(0);
      }

      setAudioMetadata({
        ...currentAudioMetadata,
        playing: false,
        location: { sectionIndex },
        startLoopIndex: 0,
        endLoopIndex: -1,
        editingLoopRange: false,
      });
    },
    [
      exercises,
      selectedExerciseId,
      pauseAudio,
      setTitle,
      setBpm,
      setCurrentChordIndex,
      setDraftLoopRange,
      setExpandedTabData,
      setVisiblePlaybackContainerWidth,
      setAudioMetadata,
    ],
  );

  useEffect(() => {
    const allSections = structuredClone(getPracticeExercisesTabData(exercises));

    pauseAudio(true, true);
    setShowPlaybackModal(false);
    setEditing(false);
    setTuning(PRACTICE_TUNING);
    setCapo(0);
    setChords([]);
    setStrummingPatterns([]);
    setSectionProgression(generateDefaultSectionProgression(allSections));
    setCurrentChordIndex(0);
    setExpandedTabData(null);
    setVisiblePlaybackContainerWidth(0);

    setTabData((draft) => {
      draft.splice(0, draft.length, ...allSections);
    });

    const exercise =
      exercises.find((item) => item.id === selectedExerciseId) ?? exercises[0];
    if (!exercise) return;

    const sectionIndex = exercises.findIndex((item) => item.id === exercise.id);

    setTitle(exercise.title);
    setBpm(getPracticeExerciseBpm(exercise));
    setAudioMetadata({
      playing: false,
      location: { sectionIndex },
      startLoopIndex: 0,
      endLoopIndex: -1,
      editingLoopRange: false,
      fullTabMetadataLength: -1,
    });
    // Intentionally only rehydrate when the exercise list changes. Switching
    // exercises is handled by selectExercise so the playback modal stays open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

  const practicePlaybackValue = useMemo(
    () => ({
      exerciseGroups,
      selectedExerciseId,
      selectExercise,
    }),
    [exerciseGroups, selectedExerciseId, selectExercise],
  );

  if (!selectedExercise) {
    return (
      <div className="baseVertFlex w-full items-start rounded-lg border bg-secondary p-4 shadow-md">
        <p className="text-sm">{emptyStateLabel}</p>
      </div>
    );
  }

  return (
    <PracticePlaybackProvider value={practicePlaybackValue}>
      <div className="baseVertFlex w-full xs:px-4 sm:px-6 md:px-8">
        <div className="baseVertFlex w-full items-start gap-4 rounded-none border-y bg-background p-4 shadow-md sm:gap-8 sm:rounded-lg sm:border-x">
          <div className="baseVertFlex w-full !items-start gap-2">
            <p className="text-sm font-medium sm:hidden">Choose an exercise</p>

            <Select value={selectedExerciseId} onValueChange={selectExercise}>
              <SelectTrigger className="sm:hidden">
                <SelectValue>{selectedExercise.title}</SelectValue>
              </SelectTrigger>
              <SelectContent className="sm:hidden">
                {exerciseGroups.map((group) => (
                  <SelectGroup key={group.level}>
                    <SelectLabel className="text-foreground/60">
                      {group.label}
                    </SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <span className="baseVertFlex w-72 flex-wrap !items-start gap-0.5 text-left">
                          <span className="text-sm font-medium">
                            {item.title}
                          </span>
                          <span
                            className={`text-xs ${selectedExerciseId === item.id ? "text-primary-foreground/75" : "text-foreground"}`}
                          >
                            {item.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden w-full flex-col gap-4 sm:flex">
              <div className="baseFlex !justify-between gap-4">
                <p className="text-sm font-medium">Choose an exercise</p>

                <div className="baseFlex gap-4">
                  <span className="text-sm font-medium">Difficulty</span>
                  <div className="baseFlex gap-2">
                    {exerciseGroups.map((group) => (
                      <Button
                        key={group.level}
                        variant={"text"}
                        className="relative"
                        onClick={() => {
                          setSelectedDifficulty(group.label);
                          const firstExerciseId = group.items.at(0)?.id;
                          if (firstExerciseId) {
                            selectExercise(firstExerciseId);
                          }
                        }}
                      >
                        {group.label}
                        {selectedDifficulty === group.label && (
                          <span className="absolute bottom-0.5 left-1.5 right-1.5 z-0 h-[2px] rounded-full bg-foreground" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              {exerciseGroups.map((group) =>
                selectedDifficulty === group.label ? (
                  <div
                    key={`exercises-${group.level}`}
                    className="grid grid-cols-2 gap-2"
                  >
                    {group.items.map((item) => (
                      <Button
                        key={item.id}
                        variant={
                          item.id === selectedExerciseId ? "default" : "outline"
                        }
                        className="!h-auto min-h-14 !justify-start px-3 py-2 text-left"
                        onClick={() => selectExercise(item.id)}
                      >
                        <span className="baseVertFlex !items-start gap-0.5">
                          <span className="text-sm font-medium transition">
                            {item.title}
                          </span>
                          <span
                            className={`text-xs transition ${item.id === selectedExerciseId ? "text-primary-foreground/80" : "text-foreground/80"}`}
                          >
                            {item.description}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : null,
              )}
            </div>
          </div>

          <div className="baseVertFlex w-full !items-start gap-2">
            <p className="text-sm font-medium">Preview</p>
            {selectedExerciseTabSection && (
              <div className="w-full">
                <StaticTabSection
                  subSectionData={selectedExerciseTabSection}
                  sectionIndex={0}
                  subSectionIndex={0}
                  color={color}
                  theme={theme}
                  overflowX={true}
                />
              </div>
            )}
          </div>

          <div className="baseFlex my-2 w-full sm:mb-2 sm:mt-0">
            <Button
              variant="audio"
              className="baseFlex gap-2 px-8 *:!h-10 sm:px-8 sm:text-base"
              disabled={audioMetadata.fullTabMetadataLength <= 0}
              onClick={() => {
                primePlaybackUserGesture();
                setCurrentChordIndex(0);
                setShowPlaybackModal(true);
              }}
            >
              <Logo className="size-3 sm:size-4" />
              Begin
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showPlaybackModal && <PlaybackModal />}
        </AnimatePresence>

        <GlossaryDialog />
      </div>
    </PracticePlaybackProvider>
  );
}

export default PracticePlaybackPanel;
