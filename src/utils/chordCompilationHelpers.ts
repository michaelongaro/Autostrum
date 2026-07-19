import {
  noteLengthMultipliers,
  type AudioMetadata,
  type Chord,
  type ChordSection,
  type ChordSequence,
  type Metadata,
  type Section,
  type SectionProgression,
  type StrummingPattern,
  type TabSection,
} from "../stores/TabStore";
import getBpmForChord from "./getBpmForChord";
import getRepetitions from "./getRepetitions";
import { sliceToLoopRange } from "./loopRangeHelpers";
import { isTabMeasureLine, tabNoteToArray } from "./tabNoteHelpers";

interface CompileChord {
  chordName: string;
  chordIdx: number;
  strummingPattern: StrummingPattern;
  chords: Chord[];
  bpm: number;
}

function compileChord({
  chordName,
  chordIdx,
  strummingPattern,
  chords,
  bpm,
}: CompileChord) {
  const chordFrets =
    chords[chords.findIndex((chord) => chord.name === chordName)]?.frets;

  const isRestChord = strummingPattern.strums[chordIdx]!.strum === "r";

  if (chordName === "" || !chordFrets || isRestChord) {
    return [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `${isRestChord ? "r" : ""}`,
      strummingPattern.strums[chordIdx]!.noteLength,
      `${bpm}`,
    ];
  }

  let chordEffect = "";
  chordEffect = strummingPattern.strums[chordIdx]!.strum;

  return [
    strummingPattern.strums[chordIdx]!.palmMute,
    ...chordFrets,
    chordEffect,
    strummingPattern.strums[chordIdx]!.noteLength,
    `${bpm}`,
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
    currentlyPlayingMetadata: Metadata[] | null,
  ) => void;
  startLoopIndex: number;
  endLoopIndex: number;
  atomicallyUpdateAudioMetadata?: (
    updatedFields: Partial<AudioMetadata>,
  ) => void;
  loopDelay: number;
}

interface FinalizeCompiledChords {
  compiledChords: string[][];
  metadata: Metadata[];
  baselineBpm: number;
  playbackSpeed: number;
  setCurrentlyPlayingMetadata: (
    currentlyPlayingMetadata: Metadata[] | null,
  ) => void;
  startLoopIndex: number;
  endLoopIndex: number;
  atomicallyUpdateAudioMetadata?: (
    updatedFields: Partial<AudioMetadata>,
  ) => void;
  loopDelay: number;
}

function finalizeCompiledChords({
  compiledChords,
  metadata,
  baselineBpm,
  playbackSpeed,
  setCurrentlyPlayingMetadata,
  startLoopIndex,
  endLoopIndex,
  atomicallyUpdateAudioMetadata,
  loopDelay,
}: FinalizeCompiledChords) {
  atomicallyUpdateAudioMetadata?.({
    fullCurrentlyPlayingMetadataLength: metadata.length,
  });

  const compiledChordsMappedToLoopRange = sliceToLoopRange(
    compiledChords,
    startLoopIndex,
    endLoopIndex,
  );
  const metadataMappedToLoopRange = sliceToLoopRange(
    metadata,
    startLoopIndex,
    endLoopIndex,
  );

  if (metadataMappedToLoopRange.length === 0) {
    setCurrentlyPlayingMetadata([]);
    return compiledChordsMappedToLoopRange;
  }

  const secondsToSubtract = metadataMappedToLoopRange[0]!.elapsedSeconds;
  for (const item of metadataMappedToLoopRange) {
    item.elapsedSeconds -= secondsToSubtract;
  }

  const firstChordType = metadataMappedToLoopRange[0]!.type;
  const lastChordType = metadataMappedToLoopRange.at(-1)!.type;
  const firstChordBpm = metadataMappedToLoopRange[0]!.bpm;
  const lastChordBpm = metadataMappedToLoopRange.at(-1)!.bpm;

  if (
    firstChordType !== lastChordType ||
    (firstChordType === "tab" &&
      lastChordType === "tab" &&
      firstChordBpm !== lastChordBpm)
  ) {
    compiledChordsMappedToLoopRange.push([]);
    metadataMappedToLoopRange.push({
      location: {
        ...metadataMappedToLoopRange.at(-1)!.location,
        chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
      },
      bpm: getBpmForChord(lastChordBpm, baselineBpm),
      noteLengthMultiplier: 1,
      elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
      type: "ornamental",
    });
  }

  if (loopDelay > 0) {
    const numSpacerChordsToAdd = Math.floor(
      loopDelay / ((60 / lastChordBpm) * playbackSpeed),
    );

    for (let i = 0; i < numSpacerChordsToAdd; i++) {
      compiledChordsMappedToLoopRange.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "quarter",
        `${lastChordBpm}`,
      ]);
      metadataMappedToLoopRange.push({
        location: {
          ...metadataMappedToLoopRange.at(-1)!.location,
          chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
        },
        bpm: lastChordBpm,
        noteLengthMultiplier: 1,
        elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
        type: "loopDelaySpacer",
      });
    }
  }

  setCurrentlyPlayingMetadata(metadataMappedToLoopRange);
  return compiledChordsMappedToLoopRange;
}

function compileFullTab({
  tabData,
  sectionProgression,
  chords,
  baselineBpm,
  playbackSpeed,
  setCurrentlyPlayingMetadata,
  startLoopIndex,
  endLoopIndex,
  atomicallyUpdateAudioMetadata,
  loopDelay,
}: CompileFullTab) {
  const compiledChords: string[][] = [];
  const metadata: Metadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues, prob want to combine all three into one obj

  for (const sectionProgressionItem of sectionProgression) {
    const sectionIndex = getSectionIndexFromId(
      tabData,
      sectionProgressionItem.sectionId,
    );
    const sectionRepetitions = getRepetitions(
      sectionProgressionItem.repetitions,
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

  return finalizeCompiledChords({
    compiledChords,
    metadata,
    baselineBpm,
    playbackSpeed,
    setCurrentlyPlayingMetadata,
    startLoopIndex,
    endLoopIndex,
    atomicallyUpdateAudioMetadata,
    loopDelay,
  });
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

  // if not the very first chord in the tab, and the last section type
  // was a chord section, we need to add a spacer "chord"
  if (compiledChords.length > 0 && metadata.at(-1)?.type === "strum") {
    compiledChords.push([]);
    metadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: -1,
      },
      bpm: currentBpm,
      noteLengthMultiplier: 1,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: "ornamental",
    });
  }

  // FYI: would like to be !== 0, however you would be rendering a measure line at
  // the very start of the tab, which goes against your current tab making rules and
  // visually wouldn't work out. maybe just need to live with the fact that the first
  // chord won't show bpm, instead just showing it in top right (or wherever) of
  // playback dialog.
  if (
    compiledChords.length > 0 &&
    metadata.at(-1) !== undefined &&
    metadata.at(-1)!.bpm !== Number(currentBpm)
  ) {
    compiledChords.push([]);
    metadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: -1,
      },
      bpm: Number(currentBpm),
      noteLengthMultiplier: 1,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: "ornamental",
    });
  }

  for (let chordIdx = 0; chordIdx < data.length; chordIdx++) {
    const column = data[chordIdx]!;

    if (isTabMeasureLine(column)) {
      const specifiedBpmToUsePostMeasureLine = column.bpmAfterLine;
      if (specifiedBpmToUsePostMeasureLine !== null) {
        currentBpm = specifiedBpmToUsePostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }

      compiledChords.push([]);
      metadata.push({
        location: {
          sectionIndex,
          subSectionIndex,
          chordIndex: chordIdx,
        },
        bpm: currentBpm,
        noteLengthMultiplier: 1,
        elapsedSeconds: Math.floor(elapsedSeconds.value),
        type: "ornamental",
      });
      continue;
    }

    // column is TabNote at this point
    const noteLengthMultiplier = noteLengthMultipliers[column.noteLength] ?? 1;

    // Convert to array format for compiledChords, embedding current BPM
    const chordArray = tabNoteToArray(column);
    chordArray[9] = `${currentBpm}`;

    metadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: chordIdx,
      },
      bpm: currentBpm,
      noteLengthMultiplier,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: "tab",
    });

    elapsedSeconds.value +=
      60 / ((currentBpm / noteLengthMultiplier) * playbackSpeed);

    compiledChords.push(chordArray);
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

  // if last section was a tab section, need to add a spacer "chord"
  if (compiledChords.length > 0 && metadata.at(-1)?.type === "tab") {
    compiledChords.push([]);
    metadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: -1,
      },
      bpm: subSection.bpm,
      noteLengthMultiplier: 1,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: "ornamental",
    });
  }

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
        subSectionBpm,
      );

      const noteLength =
        chordSequence.strummingPattern.strums[chordIdx]?.noteLength ??
        "quarter";
      const noteLengthMultiplier = noteLengthMultipliers[noteLength];

      metadata.push({
        location: {
          sectionIndex,
          subSectionIndex,
          chordSequenceIndex,
          chordIndex: chordIdx,
        },
        bpm: chordBpm,
        noteLengthMultiplier,
        elapsedSeconds: Math.floor(elapsedSeconds.value),
        type: "strum",
      });

      elapsedSeconds.value +=
        60 / ((chordBpm / noteLengthMultiplier) * playbackSpeed);

      compiledChords.push(
        compileChord({
          chordName: chordName ?? "",
          chordIdx,
          strummingPattern: chordSequence.strummingPattern,
          chords,
          bpm: chordBpm,
        }),
      );
    }
  }
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
    currentlyPlayingMetadata: Metadata[] | null,
  ) => void;
  startLoopIndex: number;
  endLoopIndex: number;
  atomicallyUpdateAudioMetadata?: (
    updatedFields: Partial<AudioMetadata>,
  ) => void;
  loopDelay: number;
}

function compileSpecificChordGrouping({
  tabData,
  location,
  chords,
  baselineBpm,
  playbackSpeed,
  setCurrentlyPlayingMetadata,
  startLoopIndex,
  endLoopIndex,
  atomicallyUpdateAudioMetadata,
  loopDelay,
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

  return finalizeCompiledChords({
    compiledChords,
    metadata,
    baselineBpm,
    playbackSpeed,
    setCurrentlyPlayingMetadata,
    startLoopIndex,
    endLoopIndex,
    atomicallyUpdateAudioMetadata,
    loopDelay,
  });
}

function generateDefaultSectionProgression(tabData: Section[]) {
  const sectionProgression: SectionProgression[] = [];

  for (const section of tabData) {
    sectionProgression.push({
      id: crypto.randomUUID(),
      sectionId: section.id,
      title: section.title,
      repetitions: 1,
      startSeconds: 0, // will be overwritten by useAutoCompileChords
      endSeconds: 0, // will be overwritten by useAutoCompileChords
    });
  }

  return sectionProgression;
}

interface CompileStrummingPatternPreview {
  strummingPattern: StrummingPattern;
}

function compileStrummingPatternPreview({
  strummingPattern,
}: CompileStrummingPatternPreview) {
  const compiledChords: string[][] = [];

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
            color: "#000000", // no need for an actual color here
            frets: ["0", "1", "0", "2", "3", ""],
          },
        ],
        bpm: 75,
      }),
    );
  }

  return compiledChords;
}

export {
  compileChord,
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
};
