import { getSectionIndexFromId } from "~/utils/getSectionIndexFromId";
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
import { isTabMeasureLine, tabNoteToArray } from "./tabNoteHelpers";

interface CompileFullTab {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  chords: Chord[];
  strummingPatterns: StrummingPattern[];
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
  forMetadataOnly: boolean; // aims to improve metadata compilation speed while editing
  forPlayback?: {
    loopDelay: number;
  };
}

function compileFullTab({
  tabData,
  sectionProgression,
  chords,
  strummingPatterns,
  baselineBpm,
  playbackSpeed,
  setCurrentlyPlayingMetadata,
  startLoopIndex,
  endLoopIndex,
  atomicallyUpdateAudioMetadata,
  forMetadataOnly,
  forPlayback,
}: CompileFullTab) {
  const compiledChords: string[][] = [];
  const metadata: Metadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues by storing in an object

  for (const sectionProg of sectionProgression) {
    const sectionIndex = getSectionIndexFromId(tabData, sectionProg.sectionId);
    const sectionRepetitions = getRepetitions(sectionProg?.repetitions);

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
        strummingPatterns,
        elapsedSeconds,
        playbackSpeed,
        forMetadataOnly,
      });
    }
  }

  if (atomicallyUpdateAudioMetadata) {
    atomicallyUpdateAudioMetadata({
      fullTabMetadataLength: metadata.length,
    });
  }

  const compiledChordsMappedToLoopRange = compiledChords.slice(
    startLoopIndex,
    endLoopIndex === -1 ? compiledChords.length : endLoopIndex + 1,
  );

  const metadataMappedToLoopRange = metadata.slice(
    startLoopIndex,
    endLoopIndex === -1 ? metadata.length : endLoopIndex + 1,
  );

  // adjusting the elapsedSeconds to start at 0 no matter the startLoopIndex
  const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

  for (const metadata of metadataMappedToLoopRange) {
    metadata.elapsedSeconds -= secondsToSubtract;
  }

  // for playback compilation
  if (forPlayback) {
    // appending loop-delay spacers,
    // using quarter-note duration so spacer count * duration ≈ loopDelay seconds.
    if (forPlayback.loopDelay > 0) {
      const lastChordBpm = `${metadataMappedToLoopRange.at(-1)?.bpm ?? baselineBpm}`;
      const numSpacerChordsToAdd = Math.floor(
        forPlayback.loopDelay / ((60 / Number(lastChordBpm)) * playbackSpeed),
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
          lastChordBpm,
        ]);

        metadataMappedToLoopRange.push({
          location: {
            ...metadataMappedToLoopRange.at(-1)!.location,
            chordIndex:
              metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
          },
          bpm: Number(lastChordBpm),
          noteLengthMultiplier: 1,
          elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
          type: "ornamental",
        });
      }
    }
  }
  // for editing compilation
  else {
    // adding a "ghost" chord here since it makes the logic for whether to
    // highlight the last chord in a sub section more straightforward

    const lastMetadataLocation = metadataMappedToLoopRange.at(-1);

    if (lastMetadataLocation) {
      compiledChordsMappedToLoopRange.push([]);
      metadataMappedToLoopRange.push({
        location: {
          sectionIndex: lastMetadataLocation?.location.sectionIndex,
          subSectionIndex: lastMetadataLocation?.location.subSectionIndex,
          chordIndex: lastMetadataLocation?.location.chordIndex + 1,
        },
        bpm: lastMetadataLocation.bpm,
        noteLengthMultiplier: 1,
        elapsedSeconds: lastMetadataLocation.elapsedSeconds,
        type: "ornamental",
      });
    }
  }

  setCurrentlyPlayingMetadata(metadataMappedToLoopRange);

  return compiledChordsMappedToLoopRange;
}

interface CompileSection {
  section: (TabSection | ChordSection)[];
  sectionIndex: number;
  baselineBpm: number;
  compiledChords: string[][];
  metadata: Metadata[];
  chords: Chord[];
  strummingPatterns: StrummingPattern[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
  forMetadataOnly: boolean;
}

function compileSection({
  section,
  sectionIndex,
  baselineBpm,
  compiledChords,
  metadata,
  chords,
  strummingPatterns,
  elapsedSeconds,
  playbackSpeed,
  forMetadataOnly,
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
          forMetadataOnly,
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
          strummingPatterns,
          elapsedSeconds,
          playbackSpeed,
          forMetadataOnly,
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
  forMetadataOnly: boolean;
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
  forMetadataOnly,
}: CompileTabSection) {
  const data = subSection.data;
  let currentBpm = getBpmForChord(subSection.bpm, baselineBpm);

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

    if (!forMetadataOnly) {
      // Convert to array format for compiledChords, embedding current BPM
      const chordArray = tabNoteToArray(column);
      chordArray[9] = `${currentBpm}`;
      compiledChords.push(chordArray);
    }

    // column is TabNote at this point
    const noteLengthMultiplier = noteLengthMultipliers[column.noteLength] ?? 1;

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
  strummingPatterns: StrummingPattern[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
  forMetadataOnly: boolean;
}

function compileChordSection({
  subSection,
  sectionIndex,
  subSectionIndex,
  baselineBpm,
  compiledChords,
  metadata,
  chords,
  strummingPatterns,
  elapsedSeconds,
  playbackSpeed,
  forMetadataOnly,
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
      strummingPatterns,
      elapsedSeconds,
      forMetadataOnly,
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
  strummingPatterns: StrummingPattern[];
  elapsedSeconds: { value: number };
  forMetadataOnly: boolean;
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
  strummingPatterns,
  elapsedSeconds,
  forMetadataOnly,
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

      if (!forMetadataOnly) {
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

      const strummingPattern = strummingPatterns.find(
        (pattern) => pattern.id === chordSequence.strummingPattern.id,
      );

      const strumNoteLength =
        strummingPattern?.strums[chordIdx]?.noteLength ?? "quarter";

      const noteLengthMultiplier = noteLengthMultipliers[strumNoteLength];

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
    }
  }
}

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

interface CompileSpecificChordGrouping {
  tabData: Section[];
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  };
  chords: Chord[];
  strummingPatterns: StrummingPattern[];
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
  forMetadataOnly: boolean;
}

// FYI: there is no need for the "forPlayback" logic in this function,
// since the <PlaybackModal> can only ever play back the whole tab or an
// whole section at once, and in the latter we just .slice() the appropriate
// section and pass it to compileFullTab().
function compileSpecificChordGrouping({
  tabData,
  location,
  chords,
  strummingPatterns,
  baselineBpm,
  playbackSpeed,
  setCurrentlyPlayingMetadata,
  startLoopIndex,
  endLoopIndex,
  atomicallyUpdateAudioMetadata,
  forMetadataOnly,
}: CompileSpecificChordGrouping) {
  const compiledChords: string[][] = [];
  const metadata: Metadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues by storing in an object

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
      strummingPatterns,
      elapsedSeconds,
      playbackSpeed,
      forMetadataOnly,
    });
  }

  // playing ONE subsection (for the repetition amount)
  else if (
    location.subSectionIndex !== undefined &&
    location.sectionIndex !== undefined
  ) {
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
          forMetadataOnly,
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
          strummingPatterns,
          elapsedSeconds,
          playbackSpeed,
          forMetadataOnly,
        });
      }
    }
  }

  // playing ONE section (for the repetition amount)
  else {
    const section = tabData[location.sectionIndex]!.data;
    const sectionIndex = location.sectionIndex;

    compileSection({
      section,
      sectionIndex,
      baselineBpm,
      compiledChords,
      metadata,
      chords,
      strummingPatterns,
      elapsedSeconds,
      playbackSpeed,
      forMetadataOnly,
    });
  }

  if (atomicallyUpdateAudioMetadata) {
    atomicallyUpdateAudioMetadata({
      fullTabMetadataLength: metadata.length,
    });
  }

  const compiledChordsMappedToLoopRange = compiledChords.slice(
    startLoopIndex,
    endLoopIndex === -1 ? compiledChords.length : endLoopIndex,
  );

  const metadataMappedToLoopRange = metadata.slice(
    startLoopIndex,
    endLoopIndex === -1 ? metadata.length : endLoopIndex,
  );

  // adjusting the elapsedSeconds to start at 0 no matter the startLoopIndex
  const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

  for (const metadata of metadataMappedToLoopRange) {
    metadata.elapsedSeconds -= secondsToSubtract;
  }

  // adding a "ghost" chord here since it makes the logic for whether to
  // highlight the last chord in a sub section more straightforward

  const lastMetadataLocation = metadataMappedToLoopRange.at(-1);

  if (lastMetadataLocation) {
    compiledChordsMappedToLoopRange.push([]);
    metadataMappedToLoopRange.push({
      location: {
        sectionIndex: lastMetadataLocation?.location.sectionIndex,
        subSectionIndex: lastMetadataLocation?.location.subSectionIndex,
        chordIndex: lastMetadataLocation?.location.chordIndex + 1,
      },
      bpm: lastMetadataLocation.bpm,
      noteLengthMultiplier: 1,
      elapsedSeconds: lastMetadataLocation.elapsedSeconds,
      type: "ornamental",
    });
  }

  setCurrentlyPlayingMetadata(metadataMappedToLoopRange);

  return compiledChordsMappedToLoopRange;
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
