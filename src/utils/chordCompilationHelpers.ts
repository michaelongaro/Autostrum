import type {
  Chord,
  ChordSection,
  ChordSequence,
  Metadata,
  Section,
  SectionProgression,
  StrummingPattern,
  TabSection,
} from "../stores/TabStore";
import getBpmForChord from "./getBpmForChord";
import getRepetitions from "./getRepetitions";

interface CompileChord {
  chordName: string;
  chordIdx: number;
  strummingPattern: StrummingPattern;
  chords: Chord[];
  stringifiedBpm: string;
  noteLengthMultiplier: string;
}

function compileChord({
  chordName,
  chordIdx,
  strummingPattern,
  chords,
  stringifiedBpm,
  noteLengthMultiplier,
}: CompileChord) {
  const chordFrets =
    chords[chords.findIndex((chord) => chord.name === chordName)]?.frets;

  if (chordName === "" || !chordFrets) {
    return [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      stringifiedBpm,
      noteLengthMultiplier,
    ];
  }

  let chordEffect = "";
  chordEffect = strummingPattern.strums[chordIdx]!.strum;

  return [
    strummingPattern.strums[chordIdx]!.palmMute,
    ...chordFrets,
    chordEffect,
    stringifiedBpm,
    noteLengthMultiplier,
  ];
}

function getSectionIndexFromId(tabData: Section[], sectionId: string) {
  for (let i = 0; i < tabData.length; i++) {
    if (tabData[i]?.id === sectionId) {
      return i;
    }
  }

  return 0;
}

interface CompileFullTab {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  chords: Chord[];
  baselineBpm: number;
  playbackSpeed: number;
  setCurrentlyPlayingMetadata: (
    currentlyPlayingMetadata: Metadata[] | null
  ) => void;
}

// try passing through playbackSpeed to all children functions and see if it changes
// total # of compiled chords

function compileFullTab({
  tabData,
  sectionProgression,
  chords,
  baselineBpm,
  playbackSpeed,
  setCurrentlyPlayingMetadata,
}: CompileFullTab) {
  const compiledChords: string[][] = [];
  const metadata: Metadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues, prob want to combine all three into one obj

  for (
    let sectionProgressionIndex = 0;
    sectionProgressionIndex < sectionProgression.length;
    sectionProgressionIndex++
  ) {
    const sectionIndex = getSectionIndexFromId(
      tabData,
      sectionProgression[sectionProgressionIndex]!.sectionId
    );
    const sectionRepetitions = getRepetitions(
      sectionProgression[sectionProgressionIndex]?.repetitions
    );

    for (
      let sectionRepeatIdx = 0;
      sectionRepeatIdx < sectionRepetitions;
      sectionRepeatIdx++
    ) {
      const section = tabData[sectionIndex]?.data;
      if (!section) continue;

      compileSection({
        section,
        sectionIndex,
        baselineBpm,
        compiledChords,
        metadata,
        chords,
        elapsedSeconds,
        playbackSpeed,
      });
    }
  }

  const lastActualChord = metadata.at(-1);

  if (lastActualChord) {
    // adding fake chord + metadata to align the audio controls slider with the visual progress indicator
    metadata.push({
      location: {
        ...lastActualChord.location,
        chordIndex: lastActualChord.location.chordIndex + 1,
      },
      bpm: Number(getBpmForChord(lastActualChord.bpm, baselineBpm)),
      noteLengthMultiplier: lastActualChord.noteLengthMultiplier,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
    });

    compiledChords.push([]);
  }

  setCurrentlyPlayingMetadata(metadata);

  return compiledChords;
}

interface CompileSpecificChordGrouping {
  tabData: Section[];
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  };
  chords: Chord[];
  baselineBpm: number;
  playbackSpeed: number;
  setCurrentlyPlayingMetadata: (
    currentlyPlayingMetadata: Metadata[] | null
  ) => void;
}

function compileSpecificChordGrouping({
  tabData,
  location,
  chords,
  baselineBpm,
  playbackSpeed,
  setCurrentlyPlayingMetadata,
}: CompileSpecificChordGrouping) {
  const compiledChords: string[][] = [];
  const metadata: Metadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues, prob want to combine all three into one obj};

  // playing ONE chord sequence (for the repetition amount)
  if (
    location.chordSequenceIndex !== undefined &&
    location.subSectionIndex !== undefined &&
    location.sectionIndex !== undefined
  ) {
    const subSectionBpm =
      tabData[location.sectionIndex]!.data[location.subSectionIndex]!.bpm;
    const chordSequence =
      tabData[location.sectionIndex]!.data[location.subSectionIndex]!.data[
        location.chordSequenceIndex
      ];

    if (!chordSequence) return compiledChords;

    compileChordSequence({
      chordSequence: chordSequence as ChordSequence,
      sectionIndex: location.sectionIndex,
      subSectionIndex: location.subSectionIndex,
      chordSequenceIndex: location.chordSequenceIndex,
      baselineBpm,
      subSectionBpm,
      compiledChords,
      metadata,
      chords,
      elapsedSeconds,
      playbackSpeed,
    });
  } else if (
    location.subSectionIndex !== undefined &&
    location.sectionIndex !== undefined
  ) {
    // playing ONE subsection (for the repetition amount)
    const subSection =
      tabData[location.sectionIndex]!.data[location.subSectionIndex];

    const subSectionRepetitions = getRepetitions(subSection?.repetitions);

    for (
      let subSectionRepeatIdx = 0;
      subSectionRepeatIdx < subSectionRepetitions;
      subSectionRepeatIdx++
    ) {
      if (!subSection) continue;

      if (subSection?.type === "tab") {
        compileTabSection({
          subSection,
          sectionIndex: location.sectionIndex,
          subSectionIndex: location.subSectionIndex,
          baselineBpm,
          compiledChords,
          metadata,
          elapsedSeconds,
          playbackSpeed,
        });
      } else {
        compileChordSection({
          subSection,
          sectionIndex: location.sectionIndex,
          subSectionIndex: location.subSectionIndex,
          baselineBpm,
          compiledChords,
          metadata,
          chords,
          elapsedSeconds,
          playbackSpeed,
        });
      }
    }
  } else if (location.sectionIndex !== undefined) {
    // playing ONE section (for the repetition amount)
    const section = tabData[location.sectionIndex]!.data;
    const sectionIndex = location.sectionIndex;

    compileSection({
      section,
      sectionIndex,
      baselineBpm,
      compiledChords,
      metadata,
      chords,
      elapsedSeconds,
      playbackSpeed,
    });
  }

  const lastActualChord = metadata.at(-1)!;

  // adding fake chord + metadata to align the audio controls slider with the visual progress indicator
  if (lastActualChord) {
    metadata.push({
      location: {
        ...lastActualChord.location,
        chordIndex: lastActualChord.location.chordIndex + 1,
      },
      bpm: Number(getBpmForChord(lastActualChord.bpm, baselineBpm)),
      noteLengthMultiplier: lastActualChord.noteLengthMultiplier,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
    });

    compiledChords.push([]);
  }

  setCurrentlyPlayingMetadata(metadata);

  return compiledChords;
}

interface CompileSection {
  section: (TabSection | ChordSection)[];
  sectionIndex: number;
  baselineBpm: number;
  compiledChords: string[][];
  metadata: Metadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
}

function compileSection({
  section,
  sectionIndex,
  baselineBpm,
  compiledChords,
  metadata,
  chords,
  elapsedSeconds,
  playbackSpeed,
}: CompileSection) {
  for (
    let subSectionIndex = 0;
    subSectionIndex < section.length;
    subSectionIndex++
  ) {
    const subSection = section[subSectionIndex];
    const subSectionRepetitions = getRepetitions(subSection?.repetitions);

    if (!subSection) continue;

    for (
      let subSectionRepeatIdx = 0;
      subSectionRepeatIdx < subSectionRepetitions;
      subSectionRepeatIdx++
    ) {
      if (subSection?.type === "tab") {
        compileTabSection({
          subSection,
          sectionIndex,
          subSectionIndex,
          baselineBpm,
          compiledChords,
          metadata,
          elapsedSeconds,
          playbackSpeed,
        });
      } else {
        compileChordSection({
          subSection,
          sectionIndex,
          subSectionIndex,
          baselineBpm,
          compiledChords,
          metadata,
          chords,
          elapsedSeconds,
          playbackSpeed,
        });
      }
    }
  }
}

interface CompileTabSection {
  subSection: TabSection;
  sectionIndex: number;
  subSectionIndex: number;
  baselineBpm: number;
  compiledChords: string[][];
  metadata: Metadata[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
}

function compileTabSection({
  subSection,
  sectionIndex,
  subSectionIndex,
  baselineBpm,
  compiledChords,
  metadata,
  elapsedSeconds,
  playbackSpeed,
}: CompileTabSection) {
  const data = subSection.data;
  let currentBpm = getBpmForChord(subSection.bpm, baselineBpm);

  for (let chordIdx = 0; chordIdx < data.length; chordIdx++) {
    const chord = [...data[chordIdx]!];

    if (chord?.[8] === "measureLine") {
      const specifiedBpmToUsePostMeasureLine = chord?.[7];
      if (
        specifiedBpmToUsePostMeasureLine &&
        specifiedBpmToUsePostMeasureLine !== "-1"
      ) {
        currentBpm = specifiedBpmToUsePostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }
      continue;
    }

    chord[8] = currentBpm;
    chord[9] = "1";

    metadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: chordIdx,
      },
      bpm: Number(currentBpm),
      noteLengthMultiplier: "1",
      elapsedSeconds: Math.floor(elapsedSeconds.value),
    });

    elapsedSeconds.value += 60 / (Number(currentBpm) * playbackSpeed);

    compiledChords.push(chord);
  }
}

interface CompileChordSection {
  subSection: ChordSection;
  sectionIndex: number;
  subSectionIndex: number;
  baselineBpm: number;
  compiledChords: string[][];
  metadata: Metadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
}

function compileChordSection({
  subSection,
  sectionIndex,
  subSectionIndex,
  baselineBpm,
  compiledChords,
  metadata,
  chords,
  elapsedSeconds,
  playbackSpeed,
}: CompileChordSection) {
  const chordSection = subSection.data;

  for (
    let chordSequenceIndex = 0;
    chordSequenceIndex < chordSection.length;
    chordSequenceIndex++
  ) {
    const chordSequence = chordSection[chordSequenceIndex];

    if (!chordSequence) continue;

    compileChordSequence({
      chordSequence,
      sectionIndex,
      subSectionIndex,
      chordSequenceIndex,
      baselineBpm,
      subSectionBpm: subSection.bpm,
      compiledChords,
      metadata,
      chords,
      elapsedSeconds,
      playbackSpeed,
    });
  }
}

interface CompileChordSequence {
  chordSequence: ChordSequence;
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
  baselineBpm: number;
  subSectionBpm: number;
  compiledChords: string[][];
  metadata: Metadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
}

function compileChordSequence({
  chordSequence,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  baselineBpm,
  subSectionBpm,
  compiledChords,
  metadata,
  chords,
  elapsedSeconds,
  playbackSpeed,
}: CompileChordSequence) {
  const chordSequenceRepetitions = getRepetitions(chordSequence?.repetitions);

  for (
    let chordSequenceRepeatIdx = 0;
    chordSequenceRepeatIdx < chordSequenceRepetitions;
    chordSequenceRepeatIdx++
  ) {
    let lastSpecifiedChordName: string | undefined = undefined;
    for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
      let chordName = chordSequence.data[chordIdx];

      // only want to update lastSpecifiedChordName if current chord name is not empty
      if (chordName !== "" && chordName !== lastSpecifiedChordName) {
        lastSpecifiedChordName = chordName;
      }

      if (
        chordName === "" &&
        chordSequence.strummingPattern.strums[chordIdx]?.strum !== ""
      ) {
        chordName = lastSpecifiedChordName;
      }

      const chordBpm = getBpmForChord(
        chordSequence.bpm,
        baselineBpm,
        subSectionBpm
      );

      let noteLengthMultiplier = "1";

      if (chordSequence.strummingPattern.noteLength === "1/4th triplet")
        noteLengthMultiplier = "0.6667";
      else if (chordSequence.strummingPattern.noteLength === "1/8th")
        noteLengthMultiplier = "0.5";
      else if (chordSequence.strummingPattern.noteLength === "1/8th triplet")
        noteLengthMultiplier = "0.3333";
      else if (chordSequence.strummingPattern.noteLength === "1/16th")
        noteLengthMultiplier = "0.25";
      else if (chordSequence.strummingPattern.noteLength === "1/16th triplet")
        noteLengthMultiplier = "0.1667";

      metadata.push({
        location: {
          sectionIndex,
          subSectionIndex,
          chordSequenceIndex,
          chordIndex: chordIdx,
        },
        bpm: Number(chordBpm),
        noteLengthMultiplier,
        elapsedSeconds: Math.floor(elapsedSeconds.value),
      });

      elapsedSeconds.value +=
        60 /
        ((Number(chordBpm) / Number(noteLengthMultiplier)) * playbackSpeed);

      compiledChords.push(
        compileChord({
          chordName: chordName ?? "",
          chordIdx,
          strummingPattern: chordSequence.strummingPattern,
          chords,
          stringifiedBpm: chordBpm,
          noteLengthMultiplier,
        })
      );
    }
  }
}

interface CompileStrummingPatternPreview {
  strummingPattern: StrummingPattern;
}

function compileStrummingPatternPreview({
  strummingPattern,
}: CompileStrummingPatternPreview) {
  const compiledChords: string[][] = [];

  let noteLengthMultiplier = "1";

  if (strummingPattern.noteLength === "1/4th triplet")
    noteLengthMultiplier = "0.6667";
  else if (strummingPattern.noteLength === "1/8th")
    noteLengthMultiplier = "0.5";
  else if (strummingPattern.noteLength === "1/8th triplet")
    noteLengthMultiplier = "0.3333";
  else if (strummingPattern.noteLength === "1/16th")
    noteLengthMultiplier = "0.25";
  else if (strummingPattern.noteLength === "1/16th triplet")
    noteLengthMultiplier = "0.1667";

  for (let i = 0; i < strummingPattern.strums.length; i++) {
    const strumIsEmpty = strummingPattern.strums[i]?.strum === "";

    compiledChords.push(
      compileChord({
        chordName: strumIsEmpty ? "" : "C",
        chordIdx: i,
        strummingPattern,
        chords: [
          {
            id: "0", // no need for an actual id here
            name: "C",
            frets: ["0", "1", "0", "2", "3", ""],
          },
        ],
        stringifiedBpm: "75",
        noteLengthMultiplier,
      })
    );
  }

  return compiledChords;
}

function generateDefaultSectionProgression(tabData: Section[]) {
  const sectionProgression: SectionProgression[] = [];

  for (let i = 0; i < tabData.length; i++) {
    sectionProgression.push({
      id: `${i}`,
      sectionId: tabData[i]?.id ?? "",
      title: tabData[i]?.title ?? "",
      repetitions: 1,
    });
  }

  return sectionProgression;
}

export {
  compileChord,
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
};
