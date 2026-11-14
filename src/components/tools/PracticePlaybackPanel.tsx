import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
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
  PRACTICE_TUNING,
  type PracticeExercise,
} from "~/data/tools/practiceExercises";
import { getTabStore, useTabStore } from "~/stores/TabStore";
import Logo from "~/components/ui/icons/Logo";
import { primePlaybackUserGesture } from "~/utils/primePlaybackUserGesture";
import GlossaryDialog from "~/components/Dialogs/GlossaryDialog";
import { PracticePlaybackProvider } from "~/components/tools/PracticePlaybackContext";
import { generateDefaultSectionProgression } from "~/utils/chordCompilationHelpers";

import PlaybackModal from "~/components/Tab/Playback/PlaybackModal";

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

  const difficultyLayoutId = useId();
  const reduceMotion = useReducedMotion();
  const exerciseListRef = useRef<HTMLDivElement>(null);
  const [exerciseListHeight, setExerciseListHeight] = useState<number | null>(
    null,
  );

  useLayoutEffect(() => {
    const exerciseList = exerciseListRef.current;
    if (!exerciseList) return;

    // Measure the incoming list in normal flow while the outgoing list fades
    // out of flow, so the entire panel resizes without scaling its contents.
    const measure = () => {
      const height = exerciseList.offsetHeight;
      setExerciseListHeight(height > 0 ? height : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(exerciseList);
    return () => observer.disconnect();
  }, [exercises]);

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
  const selectedExerciseIndex = exercises.findIndex(
    (exercise) => exercise.id === selectedExerciseId,
  );
  const previousExercise = exercises[selectedExerciseIndex - 1];
  const nextExercise = exercises[selectedExerciseIndex + 1];
  const exerciseGroups = useMemo(
    () => groupPracticeExercisesByLevel(exercises),
    [exercises],
  );
  const selectedExerciseTabSection = selectedExercise
    ? getPracticeExerciseTabSection(selectedExercise)
    : null;
  const selectedExerciseGroup = exerciseGroups.find(
    (group) => group.level === selectedExercise?.level,
  );

  const selectExercise = useCallback(
    (exerciseId: string) => {
      const exercise = exercises.find((item) => item.id === exerciseId);
      if (!exercise || exercise.id === selectedExerciseId) return;

      const sectionIndex = exercises.findIndex(
        (item) => item.id === exerciseId,
      );
      const {
        showPlaybackModal: modalOpen,
        audioMetadata: currentAudioMetadata,
      } = getTabStore();

      setSelectedExerciseId(exerciseId);

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
      <div className="baseVertFlex w-full sm:px-6 md:px-8">
        <div className="baseVertFlex w-full items-start gap-4 rounded-none border-y bg-background p-4 shadow-md sm:gap-8 sm:rounded-lg sm:border-x">
          <div className="baseVertFlex w-full !items-start gap-2">
            <p className="text-sm font-medium sm:hidden">Choose an exercise</p>

            <Select
              value={selectedExerciseId}
              onValueChange={(value) => {
                if (value !== null) selectExercise(value);
              }}
            >
              <SelectTrigger
                aria-label={`Choose an exercise: ${selectedExercise.title}`}
                className="sm:hidden"
              >
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
                  <span className="text-sm font-medium text-foreground/75">
                    Difficulty
                  </span>
                  <LayoutGroup id={difficultyLayoutId}>
                    <ToggleGroup
                      aria-label="Difficulty"
                      value={[selectedExercise.level]}
                      onValueChange={(levels) => {
                        const firstExerciseId = exerciseGroups
                          .find((group) => group.level === levels[0])
                          ?.items.at(0)?.id;
                        if (firstExerciseId) selectExercise(firstExerciseId);
                      }}
                      className="baseFlex gap-2"
                    >
                      {exerciseGroups.map((group) => (
                        <Toggle
                          key={group.level}
                          value={group.level}
                          render={
                            <Button variant="text" className="relative" />
                          }
                        >
                          {group.label}
                          {selectedExercise.level === group.level && (
                            <motion.span
                              layoutId="practice-difficulty-indicator"
                              transition={{
                                duration: reduceMotion ? 0 : 0.25,
                                ease: "easeInOut",
                              }}
                              aria-hidden="true"
                              className="absolute bottom-0.5 left-1.5 right-1.5 h-[2px] rounded-full bg-foreground"
                            />
                          )}
                        </Toggle>
                      ))}
                    </ToggleGroup>
                  </LayoutGroup>
                </div>
              </div>
              <motion.div
                initial={false}
                animate={{ height: exerciseListHeight ?? "auto" }}
                transition={{
                  duration: reduceMotion ? 0 : 0.25,
                  ease: "easeInOut",
                }}
                className="-m-1 overflow-hidden"
              >
                <div ref={exerciseListRef} className="relative">
                  <AnimatePresence initial={false} mode="popLayout">
                    {selectedExerciseGroup && (
                      <motion.div
                        key={selectedExerciseGroup.level}
                        initial={{ opacity: reduceMotion ? 1 : 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, pointerEvents: "none" }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        className="grid grid-cols-2 gap-2 p-1"
                      >
                        {selectedExerciseGroup.items.map((item) => (
                          <Button
                            key={item.id}
                            variant={
                              item.id === selectedExerciseId
                                ? "default"
                                : "outline"
                            }
                            className="!h-auto min-h-14 !justify-start px-3 py-2 text-left"
                            onClick={() => selectExercise(item.id)}
                          >
                            <span className="baseVertFlex !items-start gap-0.5">
                              <span className="text-sm font-medium transition">
                                {item.title}
                              </span>
                            </span>
                          </Button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
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
                  height={"h-64"} // prevents layout shift from conditional horizontal scrollbar
                />
              </div>
            )}
          </div>

          <div className="baseFlex my-2 w-full gap-4 sm:mb-2 sm:mt-0">
            <Button
              variant="outline"
              className="baseFlex gap-1 pl-2 pr-3 sm:hidden"
              disabled={!previousExercise}
              onClick={() => {
                if (previousExercise) selectExercise(previousExercise.id);
              }}
            >
              <IoIosArrowBack />
              Prev
            </Button>
            <Button
              variant="audio"
              className="baseFlex gap-2 px-6 *:!h-10 sm:px-8 sm:text-base"
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
            <Button
              variant="outline"
              className="baseFlex gap-1 pl-3 pr-2 sm:hidden"
              disabled={!nextExercise}
              onClick={() => {
                if (nextExercise) selectExercise(nextExercise.id);
              }}
            >
              Next
              <IoIosArrowForward />
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
