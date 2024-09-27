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
}: {
  tabData: Section[];
  sectionProgression: SectionProgression[];
}): PlaybackSection[] {
  const expandedSections: PlaybackSection[] = [];
  let indexCounter = 0;

  for (const progressionItem of sectionProgression) {
    const section = tabData.find((s) => s.id === progressionItem.sectionId);
    if (!section) continue;

    const sectionRepetitions = getRepetitions(progressionItem.repetitions);

    for (let i = 0; i < sectionRepetitions; i++) {
      const { playbackSection, newIndexCounter } = expandSection({
        section,
        indexCounter,
      });
      indexCounter = newIndexCounter;
      expandedSections.push(playbackSection);
    }
  }

  return expandedSections;
}

function expandSection({
  section,
  indexCounter,
}: {
  section: Section;
  indexCounter: number;
}): {
  playbackSection: PlaybackSection;
  newIndexCounter: number;
} {
  const playbackSection: PlaybackSection = {
    id: section.id,
    title: section.title,
    data: [],
  };

  for (const subSection of section.data) {
    const subSectionRepetitions = getRepetitions(subSection.repetitions);

    for (let i = 0; i < subSectionRepetitions; i++) {
      const { playbackSubSection, newIndexCounter } = expandSubSection({
        subSection,
        indexCounter,
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
}: {
  subSection: TabSection | ChordSection;
  indexCounter: number;
}): {
  playbackSubSection: PlaybackTabSection | PlaybackChordSection;
  newIndexCounter: number;
} {
  if (subSection.type === "tab") {
    return expandTabSection({ subSection, indexCounter });
  } else {
    return expandChordSection({ subSection, indexCounter });
  }
}

function expandTabSection({
  subSection,
  indexCounter,
}: {
  subSection: TabSection;
  indexCounter: number;
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

  for (const chord of subSection.data) {
    playbackTabSection.data.push(chord);

    if (chord[8] !== "measureLine") {
      playbackTabSection.indices.push(indexCounter++);
    }
  }

  return { playbackSubSection: playbackTabSection, newIndexCounter: indexCounter };
}

function expandChordSection({
  subSection,
  indexCounter,
}: {
  subSection: ChordSection;
  indexCounter: number;
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

  for (const chordSequence of subSection.data) {
    const chordSequenceRepetitions = getRepetitions(chordSequence.repetitions);

    for (let i = 0; i < chordSequenceRepetitions; i++) {
      const { playbackChordSequence, newIndexCounter } = expandChordSequence({
        chordSequence,
        indexCounter,
      });
      indexCounter = newIndexCounter;
      playbackChordSection.data.push(playbackChordSequence);
    }
  }

  return { playbackSubSection: playbackChordSection, newIndexCounter: indexCounter };
}

function expandChordSequence({
  chordSequence,
  indexCounter,
}: {
  chordSequence: ChordSequence;
  indexCounter: number;
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

  for (const chordName of chordSequence.data) {
    playbackChordSequence.indices.push(indexCounter++);
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
      });
      indexCounter = newIndexCounter;
      playbackSection.data.push(playbackSubSection);
    }
  } else {
    const { playbackSection: expandedSection, newIndexCounter } = expandSection({
      section,
      indexCounter,
    });
    indexCounter = newIndexCounter;
    return [expandedSection];
  }

  return [playbackSection];
}

// goal: create expanded version of tabData that respects all of the repeated
// sections and order of the section progression. The output will be used for
// the <PlaybackDialog /> component.

export {
  expandFullTab,
  expandSpecificChordGrouping,
};