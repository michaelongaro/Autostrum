import isEqual from "lodash.isequal";
import { getSectionIndexFromId } from "~/utils/getSectionIndexFromId";
import {
  type ChordSection,
  noteLengthMultipliers,
  type Section,
  type SectionProgression,
  type TabSection,
} from "../stores/TabStore";
import getBpmForChord from "./getBpmForChord";
import getRepetitions from "./getRepetitions";
import { isTabMeasureLine, isTabNote } from "./tabNoteHelpers";

interface UpdateElapsedSecondsInSectionProgression {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  baselineBpm: number;
  setSectionProgression: (sectionProgression: SectionProgression[]) => void;
}

function updateElapsedSecondsInSectionProgression({
  tabData,
  sectionProgression,
  baselineBpm,
  setSectionProgression: setSectionProgression,
}: UpdateElapsedSecondsInSectionProgression) {
  const sectionProgressionWithElapsedSeconds: SectionProgression[] = [];
  const elapsedSeconds = { value: 0 }; // Using an object to pass by reference

  for (
    let sectionProgressionIndex = 0;
    sectionProgressionIndex < sectionProgression.length;
    sectionProgressionIndex++
  ) {
    const currentSectionProgression =
      sectionProgression[sectionProgressionIndex];
    if (!currentSectionProgression) continue;

    // Record the start time before processing the section
    const startSeconds = Math.floor(elapsedSeconds.value);

    const sectionIndex = getSectionIndexFromId(
      tabData,
      currentSectionProgression.sectionId,
    );
    const sectionRepetitions = getRepetitions(
      currentSectionProgression.repetitions,
    );

    // Process the section to update elapsedSeconds
    const section = tabData[sectionIndex]?.data;
    if (section) {
      for (
        let sectionRepeatIdx = 0;
        sectionRepeatIdx < sectionRepetitions;
        sectionRepeatIdx++
      ) {
        updateElapsedTimeForSection({
          section,
          baselineBpm,
          elapsedSeconds,
        });
      }
    }

    // Record the end time after processing the section
    const endSeconds = Math.floor(elapsedSeconds.value);

    // Push the updated SectionProgression with startSeconds and endSeconds
    sectionProgressionWithElapsedSeconds.push({
      ...currentSectionProgression,
      startSeconds,
      endSeconds,
    });
  }

  // Update the state only if there's a change to prevent infinite loops
  if (!isEqual(sectionProgression, sectionProgressionWithElapsedSeconds)) {
    setSectionProgression(sectionProgressionWithElapsedSeconds);
  }
}

function updateElapsedTimeForSection({
  section,
  baselineBpm,
  elapsedSeconds,
}: {
  section: (TabSection | ChordSection)[];
  baselineBpm: number;
  elapsedSeconds: { value: number };
}) {
  for (
    let subSectionIndex = 0;
    subSectionIndex < section.length;
    subSectionIndex++
  ) {
    const subSection = section[subSectionIndex];
    if (!subSection) continue;

    const subSectionRepetitions = getRepetitions(subSection.repetitions);

    for (
      let subSectionRepeatIdx = 0;
      subSectionRepeatIdx < subSectionRepetitions;
      subSectionRepeatIdx++
    ) {
      if (subSection.type === "tab") {
        updateElapsedTimeForTabSection({
          subSection,
          baselineBpm,
          elapsedSeconds,
        });
      } else {
        updateElapsedTimeForChordSection({
          subSection,
          baselineBpm,
          elapsedSeconds,
        });
      }
    }
  }
}

function updateElapsedTimeForTabSection({
  subSection,
  baselineBpm,
  elapsedSeconds,
}: {
  subSection: TabSection;
  baselineBpm: number;
  elapsedSeconds: { value: number };
}) {
  let currentBpm = getBpmForChord(subSection.bpm, baselineBpm);

  for (let chordIdx = 0; chordIdx < subSection.data.length; chordIdx++) {
    const column = subSection.data[chordIdx];
    if (!column) continue;

    if (isTabMeasureLine(column)) {
      const specifiedBpmToUsePostMeasureLine = column.bpmAfterLine;
      if (specifiedBpmToUsePostMeasureLine !== null) {
        currentBpm = specifiedBpmToUsePostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }
      // Measure lines are ornamental and have 0 duration
      continue;
    }

    // Only process timing if it's a valid note column
    if (isTabNote(column)) {
      const noteLengthMultiplier =
        noteLengthMultipliers[column.noteLength] ?? 1;

      // Calculate the duration of the chord and update elapsedSeconds
      const chordDuration = 60 / (currentBpm / noteLengthMultiplier);
      elapsedSeconds.value += chordDuration;
    }
  }
}

function updateElapsedTimeForChordSection({
  subSection,
  baselineBpm,
  elapsedSeconds,
}: {
  subSection: ChordSection;
  baselineBpm: number;
  elapsedSeconds: { value: number };
}) {
  const chordSection = subSection.data;

  for (
    let chordSequenceIndex = 0;
    chordSequenceIndex < chordSection.length;
    chordSequenceIndex++
  ) {
    const chordSequence = chordSection[chordSequenceIndex];
    if (!chordSequence) continue;

    const chordSequenceRepetitions = getRepetitions(chordSequence?.repetitions);

    for (
      let chordSequenceRepeatIdx = 0;
      chordSequenceRepeatIdx < chordSequenceRepetitions;
      chordSequenceRepeatIdx++
    ) {
      const chordBpm = getBpmForChord(
        chordSequence.bpm,
        baselineBpm,
        subSection.bpm,
      );

      // Calculate the duration of each chord in the sequence
      for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
        const strum = chordSequence.strummingPattern.strums[chordIdx];

        const noteLengthMultiplier = strum
          ? (noteLengthMultipliers[strum.noteLength] ?? 1)
          : (noteLengthMultipliers[
              chordSequence.strummingPattern.baseNoteLength
            ] ?? 1);

        const chordDuration = 60 / (chordBpm / noteLengthMultiplier);
        elapsedSeconds.value += chordDuration;
      }
    }
  }
}

export { updateElapsedSecondsInSectionProgression };
