import { type Metadata } from "~/stores/TabStore";

export interface PlaybackStrummingPattern {
  id: string;
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet";
  strums: PlaybackStrum[];
}

interface PlaybackStrum {
  palmMute: "" | "-" | "start" | "end";
  strum:
    | ""
    | "v"
    | "^"
    | "s"
    | "v>"
    | "^>"
    | "s>"
    | "v.>"
    | "^.>"
    | "s.>"
    | "v>."
    | "u>."
    | "s>.";
}

export interface PlaybackChordSequence {
  id: string; // used to identify for keys in .map()
  indices: number[];
  strummingPattern: PlaybackStrummingPattern;
  bpm: number;
  repetitions: number;
  data: string[]; // each string is a predefined chord name
}

export interface PlaybackChordSection {
  id: string; // used to identify for keys in .map()
  type: "chord";
  bpm: number;
  repetitions: number;
  data: PlaybackChordSequence[];
}

export interface PlaybackTabSection {
  id: string; // used to identify for keys in .map()
  indices: number[];
  type: "tab";
  bpm: number;
  repetitions: number;
  data: string[][];
}

export interface PlaybackSection {
  id: string; // used to identify the section incase there are multiple sections with the same title
  title: string;
  data: (PlaybackTabSection | PlaybackChordSection)[];
}

interface Section {
  id: string;
  title: string;
  data: (TabSection | ChordSection)[];
}

interface TabSection {
  id: string;
  type: "tab";
  bpm: number;
  repetitions: number;
  data: string[][];
}

interface ChordSection {
  id: string;
  type: "chord";
  bpm: number;
  repetitions: number;
  data: ChordSequence[];
}

interface ChordSequence {
  id: string;
  strummingPattern: PlaybackStrummingPattern;
  bpm: number;
  repetitions: number;
  data: string[];
}

interface SectionProgression {
  id: string;
  sectionId: string;
  title: string;
  repetitions: number;
}

function getRepetitions(repetitions: number | undefined): number {
  return repetitions && repetitions > 0 ? repetitions : 1;
}

function expandFullTab({
  tabData,
  sectionProgression,
  setFullCurrentlyPlayingMetadata,
}: {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  setFullCurrentlyPlayingMetadata: (
    fullCurrentlyPlayingMetadata: Metadata[] | null,
  ) => void;
}): PlaybackSection[] {
  const expandedSections: PlaybackSection[] = [];
  const fullCurrentlyPlayingMetadata: Metadata[] = [];
  let indexCounter = 0;
  let elapsedSeconds = { value: 0 };

  for (const progressionItem of sectionProgression) {
    const sectionIndex = tabData.findIndex(
      (s) => s.id === progressionItem.sectionId,
    );
    const section = tabData[sectionIndex];
    if (!section) continue;

    const sectionRepetitions = getRepetitions(progressionItem.repetitions);

    for (let i = 0; i < sectionRepetitions; i++) {
      const { playbackSection, newIndexCounter } = expandSection({
        section,
        indexCounter,
        sectionIndex,
        elapsedSeconds,
        fullCurrentlyPlayingMetadata,
      });
      indexCounter = newIndexCounter;
      expandedSections.push(playbackSection);
    }
  }

  // Adjust elapsedSeconds to start from zero
  const secondsToSubtract =
    fullCurrentlyPlayingMetadata[0]?.elapsedSeconds ?? 0;

  for (let i = 0; i < fullCurrentlyPlayingMetadata.length; i++) {
    fullCurrentlyPlayingMetadata[i]!.elapsedSeconds -= secondsToSubtract;
  }

  // Optionally, add a ghost chord for alignment
  if (fullCurrentlyPlayingMetadata.length > 0) {
    const lastActualChord = fullCurrentlyPlayingMetadata.at(-1)!;
    const ghostChordIndex = lastActualChord.location.chordIndex + 1;

    fullCurrentlyPlayingMetadata.push({
      location: {
        ...lastActualChord.location,
        chordIndex: ghostChordIndex,
      },
      bpm: lastActualChord.bpm,
      noteLengthMultiplier: lastActualChord.noteLengthMultiplier,
      elapsedSeconds: Math.ceil(
        lastActualChord.elapsedSeconds +
          60 /
            (lastActualChord.bpm /
              Number(lastActualChord.noteLengthMultiplier)) +
          1,
      ),
    });
  }

  setFullCurrentlyPlayingMetadata(fullCurrentlyPlayingMetadata);

  // HOW is this "not a function"^ ?

  return expandedSections;
}

function expandSection({
  section,
  indexCounter,
  sectionIndex,
  elapsedSeconds,
  fullCurrentlyPlayingMetadata,
}: {
  section: Section;
  indexCounter: number;
  sectionIndex: number;
  elapsedSeconds: { value: number };
  fullCurrentlyPlayingMetadata: Metadata[];
}): {
  playbackSection: PlaybackSection;
  newIndexCounter: number;
} {
  const playbackSection: PlaybackSection = {
    id: section.id,
    title: section.title,
    data: [],
  };

  for (
    let subSectionIndex = 0;
    subSectionIndex < section.data.length;
    subSectionIndex++
  ) {
    const subSection = section.data[subSectionIndex];

    if (!subSection) continue;

    const subSectionRepetitions = getRepetitions(subSection.repetitions);

    for (let i = 0; i < subSectionRepetitions; i++) {
      const { playbackSubSection, newIndexCounter } = expandSubSection({
        subSection,
        indexCounter,
        sectionIndex,
        subSectionIndex,
        elapsedSeconds,
        fullCurrentlyPlayingMetadata,
      });
      indexCounter = newIndexCounter;
      playbackSection.data.push(playbackSubSection);
    }
  }

  return { playbackSection, newIndexCounter: indexCounter };
}

function expandSubSection({
  subSection,
  indexCounter,
  sectionIndex,
  subSectionIndex,
  elapsedSeconds,
  fullCurrentlyPlayingMetadata,
}: {
  subSection: TabSection | ChordSection;
  indexCounter: number;
  sectionIndex: number;
  subSectionIndex: number;
  elapsedSeconds: { value: number };
  fullCurrentlyPlayingMetadata: Metadata[];
}): {
  playbackSubSection: PlaybackTabSection | PlaybackChordSection;
  newIndexCounter: number;
} {
  if (subSection.type === "tab") {
    return expandTabSection({
      subSection,
      indexCounter,
      sectionIndex,
      subSectionIndex,
      elapsedSeconds,
      fullCurrentlyPlayingMetadata,
    });
  } else {
    return expandChordSection({
      subSection,
      indexCounter,
      sectionIndex,
      subSectionIndex,
      elapsedSeconds,
      fullCurrentlyPlayingMetadata,
    });
  }
}

function expandTabSection({
  subSection,
  indexCounter,
  sectionIndex,
  subSectionIndex,
  elapsedSeconds,
  fullCurrentlyPlayingMetadata,
}: {
  subSection: TabSection;
  indexCounter: number;
  sectionIndex: number;
  subSectionIndex: number;
  elapsedSeconds: { value: number };
  fullCurrentlyPlayingMetadata: Metadata[];
}): {
  playbackSubSection: PlaybackTabSection;
  newIndexCounter: number;
} {
  const playbackTabSection: PlaybackTabSection = {
    id: subSection.id,
    type: "tab",
    bpm: subSection.bpm,
    repetitions: 1,
    data: [],
    indices: [],
  };

  let currentBpm = subSection.bpm;

  for (let chordIdx = 0; chordIdx < subSection.data.length; chordIdx++) {
    const chord = subSection.data[chordIdx];

    if (!chord) continue;

    playbackTabSection.data.push(chord);

    if (chord[8] === "measureLine") {
      const specifiedBpmToUsePostMeasureLine = chord[7];
      if (
        specifiedBpmToUsePostMeasureLine &&
        specifiedBpmToUsePostMeasureLine !== "-1"
      ) {
        currentBpm = Number(specifiedBpmToUsePostMeasureLine);
      } else {
        currentBpm = subSection.bpm;
      }
    }

    let noteLengthMultiplier = 1;
    if (chord[8] === "1/8th") noteLengthMultiplier = 0.5;
    else if (chord[8] === "1/16th") noteLengthMultiplier = 0.25;
    else if (chord[8] === "measureLine") noteLengthMultiplier = 0;

    fullCurrentlyPlayingMetadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: chordIdx,
      },
      bpm: currentBpm,
      noteLengthMultiplier: noteLengthMultiplier.toString(),
      elapsedSeconds: elapsedSeconds.value,
    });

    if (noteLengthMultiplier > 0) {
      elapsedSeconds.value += 60 / (currentBpm / noteLengthMultiplier);
    }

    if (chord[8] !== "measureLine") {
      playbackTabSection.indices.push(indexCounter);
    }

    indexCounter++;
  }

  return {
    playbackSubSection: playbackTabSection,
    newIndexCounter: indexCounter,
  };
}

function expandChordSection({
  subSection,
  indexCounter,
  sectionIndex,
  subSectionIndex,
  elapsedSeconds,
  fullCurrentlyPlayingMetadata,
}: {
  subSection: ChordSection;
  indexCounter: number;
  sectionIndex: number;
  subSectionIndex: number;
  elapsedSeconds: { value: number };
  fullCurrentlyPlayingMetadata: Metadata[];
}): {
  playbackSubSection: PlaybackChordSection;
  newIndexCounter: number;
} {
  const playbackChordSection: PlaybackChordSection = {
    id: subSection.id,
    type: "chord",
    bpm: subSection.bpm,
    repetitions: 1,
    data: [],
  };

  for (
    let chordSequenceIndex = 0;
    chordSequenceIndex < subSection.data.length;
    chordSequenceIndex++
  ) {
    const chordSequence = subSection.data[chordSequenceIndex];

    if (!chordSequence) continue;

    const chordSequenceRepetitions = getRepetitions(chordSequence.repetitions);

    for (let i = 0; i < chordSequenceRepetitions; i++) {
      const { playbackChordSequence, newIndexCounter } = expandChordSequence({
        chordSequence,
        indexCounter,
        sectionIndex,
        subSectionIndex,
        chordSequenceIndex,
        elapsedSeconds,
        fullCurrentlyPlayingMetadata,
        subSectionBpm: subSection.bpm,
      });
      indexCounter = newIndexCounter;
      playbackChordSection.data.push(playbackChordSequence);
    }
  }

  return {
    playbackSubSection: playbackChordSection,
    newIndexCounter: indexCounter,
  };
}

function expandChordSequence({
  chordSequence,
  indexCounter,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  elapsedSeconds,
  fullCurrentlyPlayingMetadata,
  subSectionBpm,
}: {
  chordSequence: ChordSequence;
  indexCounter: number;
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
  elapsedSeconds: { value: number };
  fullCurrentlyPlayingMetadata: Metadata[];
  subSectionBpm: number;
}): {
  playbackChordSequence: PlaybackChordSequence;
  newIndexCounter: number;
} {
  const playbackChordSequence: PlaybackChordSequence = {
    id: chordSequence.id,
    strummingPattern: chordSequence.strummingPattern,
    bpm: chordSequence.bpm,
    repetitions: 1,
    data: chordSequence.data.slice(),
    indices: [],
  };

  for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
    playbackChordSequence.indices.push(indexCounter);

    let noteLengthMultiplier = 1;
    switch (chordSequence.strummingPattern.noteLength) {
      case "1/4th triplet":
        noteLengthMultiplier = 0.6667;
        break;
      case "1/8th":
        noteLengthMultiplier = 0.5;
        break;
      case "1/8th triplet":
        noteLengthMultiplier = 0.3333;
        break;
      case "1/16th":
        noteLengthMultiplier = 0.25;
        break;
      case "1/16th triplet":
        noteLengthMultiplier = 0.1667;
        break;
    }

    const chordBpm = chordSequence.bpm ?? subSectionBpm;
    fullCurrentlyPlayingMetadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordSequenceIndex,
        chordIndex: chordIdx,
      },
      bpm: chordBpm,
      noteLengthMultiplier: noteLengthMultiplier.toString(),
      elapsedSeconds: elapsedSeconds.value,
    });

    // Update elapsedSeconds
    elapsedSeconds.value += 60 / (chordBpm / noteLengthMultiplier);

    indexCounter++;
  }

  return { playbackChordSequence, newIndexCounter: indexCounter };
}

function expandSpecificChordGrouping({
  tabData,
  location,
}: {
  tabData: Section[];
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  };
}): PlaybackSection[] {
  let indexCounter = 0;
  const section = tabData[location.sectionIndex];
  if (!section) return [];

  const playbackSection: PlaybackSection = {
    id: section.id,
    title: section.title,
    data: [],
  };

  if (
    location.chordSequenceIndex !== undefined &&
    location.subSectionIndex !== undefined
  ) {
    const subSection = section.data[location.subSectionIndex] as ChordSection;
    if (!subSection || subSection.type !== "chord") return [];

    const chordSequence = subSection.data[location.chordSequenceIndex];

    if (!chordSequence) return [];

    const chordSequenceRepetitions = getRepetitions(chordSequence.repetitions);

    const playbackChordSection: PlaybackChordSection = {
      id: subSection.id,
      type: "chord",
      bpm: subSection.bpm,
      repetitions: 1,
      data: [],
    };

    for (let i = 0; i < chordSequenceRepetitions; i++) {
      const { playbackChordSequence, newIndexCounter } = expandChordSequence({
        chordSequence,
        indexCounter,
        sectionIndex: location.sectionIndex,
        subSectionIndex: location.subSectionIndex,
        chordSequenceIndex: location.chordSequenceIndex,
        elapsedSeconds: { value: 0 },
        fullCurrentlyPlayingMetadata: [],
        subSectionBpm: subSection.bpm,
      });
      indexCounter = newIndexCounter;
      playbackChordSection.data.push(playbackChordSequence);
    }

    playbackSection.data.push(playbackChordSection);
  } else if (location.subSectionIndex !== undefined) {
    const subSection = section.data[location.subSectionIndex];
    if (!subSection) return [];

    const subSectionRepetitions = getRepetitions(subSection.repetitions);

    for (let i = 0; i < subSectionRepetitions; i++) {
      const { playbackSubSection, newIndexCounter } = expandSubSection({
        subSection,
        indexCounter,
        sectionIndex: location.sectionIndex,
        subSectionIndex: location.subSectionIndex,
        elapsedSeconds: { value: 0 },
        fullCurrentlyPlayingMetadata: [],
      });
      indexCounter = newIndexCounter;
      playbackSection.data.push(playbackSubSection);
    }
  } else {
    const { playbackSection: expandedSection, newIndexCounter } = expandSection(
      {
        section,
        indexCounter,
        sectionIndex: location.sectionIndex,
        elapsedSeconds: { value: 0 },
        fullCurrentlyPlayingMetadata: [],
      },
    );
    indexCounter = newIndexCounter;
    return [expandedSection];
  }

  return [playbackSection];
}

export { expandFullTab, expandSpecificChordGrouping };
