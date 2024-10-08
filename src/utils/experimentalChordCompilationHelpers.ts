import type {
  AudioMetadata,
  Chord,
  ChordSection,
  ChordSequence,
  FullMetadata,
  Section,
  SectionProgression,
  StrummingPattern,
  TabSection,
  PlaybackTabChord,
  PlaybackStrummedChord,
} from "../stores/TabStore";
import getBpmForChord from "./getBpmForChord";
import getRepetitions from "./getRepetitions";

interface ExpandFullTab {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  chords: Chord[];
  baselineBpm: number;
  playbackSpeed: number;
  setFullCurrentlyPlayingMetadata: (
    fullCurrentlyPlayingMetadata: FullMetadata[] | null,
  ) => void;
  setPlaybackChordIndices: (chordIndices: number[]) => void;
  // startLoopIndex: number;
  // endLoopIndex: number;
  // atomicallyUpdateAudioMetadata?: (
  //   updatedFields: Partial<AudioMetadata>,
  // ) => void;
}

function expandFullTab({
  tabData,
  sectionProgression,
  chords,
  baselineBpm,
  playbackSpeed,
  setFullCurrentlyPlayingMetadata,
  setPlaybackChordIndices,
  // startLoopIndex,
  // endLoopIndex,
  // atomicallyUpdateAudioMetadata,
}: ExpandFullTab) {
  const compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[] = [];
  const metadata: FullMetadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues
  const chordIndices: number[] = [];
  let chordIndexCounter = { value: 0 }; // getting around pass by value/reference issues

  for (
    let sectionProgressionIndex = 0;
    sectionProgressionIndex < sectionProgression.length;
    sectionProgressionIndex++
  ) {
    const sectionIndex = getSectionIndexFromId(
      tabData,
      sectionProgression[sectionProgressionIndex]!.sectionId,
    );
    const sectionRepetitions = getRepetitions(
      sectionProgression[sectionProgressionIndex]?.repetitions,
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
        sectionRepeatIndex: sectionRepeatIdx,
        baselineBpm,
        compiledChords,
        metadata,
        chords,
        elapsedSeconds,
        playbackSpeed,
        chordIndices,
        chordIndexCounter,
      });
    }
  }

  // // hacky: but is used incase the slice returns an empty array, which we couldn't then access
  // // the last element in metadataMappedToLoopRange below for.
  // const backupFirstChordMetadata = metadata[startLoopIndex];

  // // +1 to account for ghost chord that's added below
  // if (atomicallyUpdateAudioMetadata) {
  //   console.log("og here");

  //   atomicallyUpdateAudioMetadata({
  //     fullCurrentlyPlayingMetadataLength: metadata.length + 1,
  //   });
  // }

  // const compiledChordsMappedToLoopRange = compiledChords.slice(
  //   startLoopIndex,
  //   endLoopIndex === -1 ? compiledChords.length : endLoopIndex,
  // );

  // const metadataMappedToLoopRange = metadata.slice(
  //   startLoopIndex,
  //   endLoopIndex === -1 ? metadata.length : endLoopIndex,
  // );

  // let ghostChordIndex = 0;

  // if (metadataMappedToLoopRange.length > 0) {
  //   if (endLoopIndex === -1) {
  //     ghostChordIndex =
  //       metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1;
  //   } else {
  //     ghostChordIndex = metadataMappedToLoopRange.at(-1)!.location.chordIndex;
  //     // ^ this is not perfect, somehow maybe want the chordIndex to be +1 more?
  //   }
  // }

  // if (endLoopIndex !== -1) {
  //   metadataMappedToLoopRange.pop();
  // }

  // const lastActualChord = metadataMappedToLoopRange.at(-1)!;

  // // conditionally adding fake chord + metadata to align the audio controls slider with the visual progress indicator
  // // really absolutely *hate* this solution, but technically it should work.
  // if (metadataMappedToLoopRange.length > 0 && lastActualChord) {
  //   metadataMappedToLoopRange.push({
  //     location: {
  //       ...lastActualChord.location,
  //       chordIndex: ghostChordIndex,
  //     },
  //     bpm: Number(getBpmForChord(lastActualChord.bpm, baselineBpm)),
  //     noteLengthMultiplier: lastActualChord.noteLengthMultiplier,
  //     elapsedSeconds: Math.ceil(
  //       lastActualChord.elapsedSeconds +
  //         60 /
  //           ((Number(lastActualChord.bpm) /
  //             Number(lastActualChord.noteLengthMultiplier)) *
  //             playbackSpeed) +
  //         1,
  //     ),
  //   });

  //   compiledChordsMappedToLoopRange.push([]);
  // }

  // if (metadataMappedToLoopRange.length === 0) {
  //   metadataMappedToLoopRange.push(backupFirstChordMetadata!);
  // }

  // // scaling the elapsedSeconds to start at 0 no matter the startLoopIndex
  // const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

  // for (let i = 0; i < metadataMappedToLoopRange.length; i++) {
  //   metadataMappedToLoopRange[i]!.elapsedSeconds -= secondsToSubtract;
  // }

  // setCurrentlyPlayingMetadata(metadataMappedToLoopRange);

  setFullCurrentlyPlayingMetadata(metadata);
  setPlaybackChordIndices(chordIndices);

  return compiledChords;
}

interface CompileSection {
  section: (TabSection | ChordSection)[];
  sectionIndex: number;
  sectionRepeatIndex: number;
  baselineBpm: number;
  compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[];
  metadata: FullMetadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
  chordIndices: number[];
  chordIndexCounter: { value: number };
}

function compileSection({
  section,
  sectionIndex,
  sectionRepeatIndex,
  baselineBpm,
  compiledChords,
  metadata,
  chords,
  elapsedSeconds,
  playbackSpeed,
  chordIndices,
  chordIndexCounter,
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
          subSectionRepeatIndex: subSectionRepeatIdx,
          sectionIndex,
          sectionRepeatIndex,
          subSectionIndex,
          baselineBpm,
          compiledChords,
          metadata,
          elapsedSeconds,
          playbackSpeed,
          chordIndices,
          chordIndexCounter,
        });
      } else {
        compileChordSection({
          subSection,
          subSectionRepeatIndex: subSectionRepeatIdx,
          sectionIndex,
          sectionRepeatIndex,
          subSectionIndex,
          baselineBpm,
          compiledChords,
          metadata,
          chords,
          elapsedSeconds,
          playbackSpeed,
          chordIndices,
          chordIndexCounter,
        });
      }
    }
  }
}

interface CompileTabSection {
  subSection: TabSection;
  subSectionIndex: number;
  subSectionRepeatIndex: number;
  sectionIndex: number;
  sectionRepeatIndex: number;
  baselineBpm: number;
  compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[];
  metadata: FullMetadata[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
  chordIndices: number[];
  chordIndexCounter: { value: number };
}

function compileTabSection({
  subSection,
  subSectionIndex,
  subSectionRepeatIndex,
  sectionIndex,
  sectionRepeatIndex,
  baselineBpm,
  compiledChords,
  metadata,
  elapsedSeconds,
  playbackSpeed,
  chordIndices,
  chordIndexCounter,
}: CompileTabSection) {
  const data = subSection.data;
  let currentBpm = getBpmForChord(subSection.bpm, baselineBpm);

  // if not the very first chord in the tab, and the last section type
  // was a chord section, we need to add a spacer "chord"
  if (compiledChords.length > 0 && compiledChords.at(-1)?.type === "strum") {
    compiledChords.push({
      type: "tab",
      isFirstChord: false,
      isLastChord: false,
      data: ["-1", "", "", "", "", "", "", "", "", ""],
    });
  }

  for (let chordIdx = 0; chordIdx < data.length; chordIdx++) {
    const chordData: PlaybackTabChord = {
      type: "tab",
      isFirstChord: chordIdx === 0,
      isLastChord: chordIdx === data.length - 1,
      data: data[chordIdx]!,
    };

    const chord = [...data[chordIdx]!];

    if (chord[8] === "measureLine") {
      const specifiedBpmToUsePostMeasureLine = chord?.[7];
      if (
        specifiedBpmToUsePostMeasureLine &&
        specifiedBpmToUsePostMeasureLine !== "-1"
      ) {
        currentBpm = specifiedBpmToUsePostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }

      // continue;
    } else {
      chordIndices.push(chordIndexCounter.value);
    }

    chordIndexCounter.value++;

    let noteLengthMultiplier = "1";

    if (chord[8] === "1/8th") noteLengthMultiplier = "0.5";
    else if (chord[8] === "1/16th") noteLengthMultiplier = "0.25";

    const isAMeasureLine = chord[8] === "measureLine";

    chord[8] = currentBpm;
    chord[9] = noteLengthMultiplier;

    // FYI: looks weird, but we need the measure lines in the overall expansion/compilation,
    // however for metadata we don't want to include them because it would include an extra
    // pre-processing step to remove them from the metadata array, since we already skip over them
    // in the playback chord widths/positions arrays.
    if (!isAMeasureLine) {
      metadata.push({
        location: {
          sectionIndex,
          sectionRepeatIndex,
          subSectionIndex,
          subSectionRepeatIndex,
          chordIndex: chordIdx,
        },
        bpm: Number(currentBpm),
        noteLengthMultiplier,
        elapsedSeconds: Math.floor(elapsedSeconds.value),
      });

      elapsedSeconds.value +=
        60 /
        ((Number(currentBpm) / Number(noteLengthMultiplier)) * playbackSpeed);
    }

    chordData.data = chord; // refactor later to be less split up

    compiledChords.push(chordData);
  }
}

interface CompileChordSection {
  subSection: ChordSection;
  subSectionIndex: number;
  subSectionRepeatIndex: number;
  sectionIndex: number;
  sectionRepeatIndex: number;
  baselineBpm: number;
  compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[];
  metadata: FullMetadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
  chordIndices: number[];
  chordIndexCounter: { value: number };
}

function compileChordSection({
  subSection,
  subSectionIndex,
  subSectionRepeatIndex,
  sectionIndex,
  sectionRepeatIndex,
  baselineBpm,
  compiledChords,
  metadata,
  chords,
  elapsedSeconds,
  playbackSpeed,
  chordIndices,
  chordIndexCounter,
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
      subSectionIndex,
      subSectionRepeatIndex,
      sectionIndex,
      sectionRepeatIndex,
      chordSequenceIndex,
      baselineBpm,
      subSectionBpm: subSection.bpm,
      compiledChords,
      metadata,
      chords,
      elapsedSeconds,
      playbackSpeed,
      chordIndices,
      chordIndexCounter,
    });
  }
}

interface CompileChordSequence {
  chordSequence: ChordSequence;
  subSectionIndex: number;
  subSectionRepeatIndex: number;
  sectionIndex: number;
  sectionRepeatIndex: number;
  chordSequenceIndex: number;
  baselineBpm: number;
  subSectionBpm: number;
  compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[];
  metadata: FullMetadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
  chordIndices: number[];
  chordIndexCounter: { value: number };
}

function compileChordSequence({
  chordSequence,
  subSectionIndex,
  subSectionRepeatIndex,
  sectionIndex,
  sectionRepeatIndex,
  chordSequenceIndex,
  baselineBpm,
  subSectionBpm,
  compiledChords,
  metadata,
  chords,
  elapsedSeconds,
  playbackSpeed,
  chordIndices,
  chordIndexCounter,
}: CompileChordSequence) {
  const chordSequenceRepetitions = getRepetitions(chordSequence?.repetitions);

  for (
    let chordSequenceRepeatIdx = 0;
    chordSequenceRepeatIdx < chordSequenceRepetitions;
    chordSequenceRepeatIdx++
  ) {
    let lastSpecifiedChordName: string | undefined = undefined;

    for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
      // immediately add fake "spacer" strum if chordIdx === 0, excluding the first chord
      // since we want the highlighted line to be right at the start of the first chord
      if (compiledChords.length > 0 && chordIdx === 0) {
        const playbackChordSequence: PlaybackStrummedChord = {
          type: "strum",
          isFirstChord: false,
          isLastChord: false,
          data: {
            strumIndex: -1,
            chordName: "",
            palmMute: "",
            strum: "",
            noteLength: chordSequence.strummingPattern.noteLength,
          },
        };

        compiledChords.push(playbackChordSequence);
      }

      let chordName = chordSequence.data[chordIdx];
      let chordNameToUse = ""; // This will be the chord name we assign

      // Check if current chordName is not empty and not the same as the last specified chord
      if (
        chordName !== "" &&
        chordName !== undefined &&
        chordName !== lastSpecifiedChordName
      ) {
        lastSpecifiedChordName = chordName;
        chordNameToUse = chordName; // Assign the chord name because it changed
      } else if (
        chordName === "" &&
        chordSequence.strummingPattern.strums[chordIdx]?.strum !== ""
      ) {
        // If chordName is empty but there's a strum, use last specified chordName internally
        chordName = lastSpecifiedChordName || "";
        chordNameToUse = ""; // Do not assign to avoid cluttering the UI
      } else {
        // ChordName is empty and there's no strum, assign empty string
        chordNameToUse = "";
      }

      // Proceed with the rest of your logic using chordNameToUse
      const chordBpm = getBpmForChord(
        chordSequence.bpm,
        baselineBpm,
        subSectionBpm,
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
          sectionRepeatIndex,
          subSectionIndex,
          subSectionRepeatIndex,
          chordSequenceIndex,
          chordSequenceRepeatIndex: chordSequenceRepeatIdx,
          chordIndex: chordIdx,
        },
        bpm: Number(chordBpm),
        noteLengthMultiplier,
        elapsedSeconds: Math.floor(elapsedSeconds.value),
      });

      elapsedSeconds.value +=
        60 /
        ((Number(chordBpm) / Number(noteLengthMultiplier)) * playbackSpeed);

      chordIndices.push(chordIndexCounter.value);
      chordIndexCounter.value++;

      const playbackChordSequence: PlaybackStrummedChord = {
        type: "strum",
        isFirstChord: chordIdx === 0,
        isLastChord: chordIdx === chordSequence.data.length - 1,
        data: {
          strumIndex: chordIdx,
          chordName: chordNameToUse,
          palmMute:
            chordSequence.strummingPattern.strums[chordIdx]?.palmMute ?? "",
          strum: chordSequence.strummingPattern.strums[chordIdx]?.strum ?? "",
          noteLength: chordSequence.strummingPattern.noteLength,
        },
      };

      compiledChords.push(playbackChordSequence);
    }
  }
}

function getSectionIndexFromId(tabData: Section[], sectionId: string) {
  for (let i = 0; i < tabData.length; i++) {
    if (tabData[i]?.id === sectionId) {
      return i;
    }
  }

  return 0;
}

// interface CompileSpecificChordGrouping {
//   tabData: Section[];
//   location: {
//     sectionIndex: number;
//     subSectionIndex?: number;
//     chordSequenceIndex?: number;
//   };
//   chords: Chord[];
//   baselineBpm: number;
//   playbackSpeed: number;
//   setCurrentlyPlayingMetadata: (
//     currentlyPlayingMetadata: FullMetadata[] | null,
//   ) => void;
//   startLoopIndex: number;
//   endLoopIndex: number;
//   atomicallyUpdateAudioMetadata?: (
//     updatedFields: Partial<AudioMetadata>,
//   ) => void;
// }

// function compileSpecificChordGrouping({
//   tabData,
//   location,
//   chords,
//   baselineBpm,
//   playbackSpeed,
//   setCurrentlyPlayingMetadata,
//   startLoopIndex,
//   endLoopIndex,
//   atomicallyUpdateAudioMetadata,
// }: CompileSpecificChordGrouping) {
//   const compiledChords: string[][] = [];
//   const metadata: FullMetadata[] = [];
//   const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues, prob want to combine all three into one obj};

//   // playing ONE chord sequence (for the repetition amount)
//   if (
//     location.chordSequenceIndex !== undefined &&
//     location.subSectionIndex !== undefined &&
//     location.sectionIndex !== undefined
//   ) {
//     const subSectionBpm =
//       tabData[location.sectionIndex]!.data[location.subSectionIndex]!.bpm;
//     const chordSequence =
//       tabData[location.sectionIndex]!.data[location.subSectionIndex]!.data[
//         location.chordSequenceIndex
//       ];

//     if (!chordSequence) return compiledChords;

//     compileChordSequence({
//       chordSequence: chordSequence as ChordSequence,
//       sectionIndex: location.sectionIndex,
//       subSectionIndex: location.subSectionIndex,
//       chordSequenceIndex: location.chordSequenceIndex,
//       baselineBpm,
//       subSectionBpm,
//       compiledChords,
//       metadata,
//       chords,
//       elapsedSeconds,
//       playbackSpeed,
//     });
//   } else if (
//     location.subSectionIndex !== undefined &&
//     location.sectionIndex !== undefined
//   ) {
//     // playing ONE subsection (for the repetition amount)
//     const subSection =
//       tabData[location.sectionIndex]!.data[location.subSectionIndex];

//     const subSectionRepetitions = getRepetitions(subSection?.repetitions);

//     for (
//       let subSectionRepeatIdx = 0;
//       subSectionRepeatIdx < subSectionRepetitions;
//       subSectionRepeatIdx++
//     ) {
//       if (!subSection) continue;

//       if (subSection?.type === "tab") {
//         compileTabSection({
//           subSection,
//           sectionIndex: location.sectionIndex,
//           subSectionIndex: location.subSectionIndex,
//           baselineBpm,
//           compiledChords,
//           metadata,
//           elapsedSeconds,
//           playbackSpeed,
//         });
//       } else {
//         compileChordSection({
//           subSection,
//           sectionIndex: location.sectionIndex,
//           subSectionIndex: location.subSectionIndex,
//           baselineBpm,
//           compiledChords,
//           metadata,
//           chords,
//           elapsedSeconds,
//           playbackSpeed,
//         });
//       }
//     }
//   } else if (location.sectionIndex !== undefined) {
//     // playing ONE section (for the repetition amount)
//     const section = tabData[location.sectionIndex]!.data;
//     const sectionIndex = location.sectionIndex;

//     compileSection({
//       section,
//       sectionIndex,
//       baselineBpm,
//       compiledChords,
//       metadata,
//       chords,
//       elapsedSeconds,
//       playbackSpeed,
//     });
//   }

//   // hacky: but is used incase the slice returns an empty array, which we couldn't then access
//   // the last element in metadataMappedToLoopRange below for.
//   const backupFirstChordMetadata = metadata[startLoopIndex];

//   // +1 to account for ghost chord that's added below
//   if (atomicallyUpdateAudioMetadata) {
//     atomicallyUpdateAudioMetadata({
//       fullCurrentlyPlayingMetadataLength: metadata.length + 1,
//     });
//   }

//   const compiledChordsMappedToLoopRange = compiledChords.slice(
//     startLoopIndex,
//     endLoopIndex === -1 ? compiledChords.length : endLoopIndex,
//   );

//   const metadataMappedToLoopRange = metadata.slice(
//     startLoopIndex,
//     endLoopIndex === -1 ? metadata.length : endLoopIndex,
//   );

//   let ghostChordIndex = 0;

//   if (metadataMappedToLoopRange.length > 0) {
//     if (endLoopIndex === -1) {
//       ghostChordIndex =
//         metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1;
//     } else {
//       ghostChordIndex = metadataMappedToLoopRange.at(-1)!.location.chordIndex;
//       // ^ this is not perfect, somehow maybe want the chordIndex to be +1 more?
//     }
//   }

//   if (endLoopIndex !== -1) {
//     metadataMappedToLoopRange.pop();
//   }

//   const lastActualChord = metadataMappedToLoopRange.at(-1)!;

//   // conditionally adding fake chord + metadata to align the audio controls slider with the visual progress indicator
//   // really absolutely *hate* this solution, but technically it should work.
//   if (metadataMappedToLoopRange.length > 0 && lastActualChord) {
//     metadataMappedToLoopRange.push({
//       location: {
//         ...lastActualChord.location,
//         chordIndex: ghostChordIndex,
//       },
//       bpm: Number(getBpmForChord(lastActualChord.bpm, baselineBpm)),
//       noteLengthMultiplier: lastActualChord.noteLengthMultiplier,
//       elapsedSeconds: Math.ceil(
//         lastActualChord.elapsedSeconds +
//           60 /
//             ((Number(lastActualChord.bpm) /
//               Number(lastActualChord.noteLengthMultiplier)) *
//               playbackSpeed) +
//           1,
//       ),
//     });

//     compiledChordsMappedToLoopRange.push([]);
//   }

//   if (metadataMappedToLoopRange.length === 0) {
//     metadataMappedToLoopRange.push(backupFirstChordMetadata!);
//   }

//   // scaling the elapsedSeconds to start at 0 no matter the startLoopIndex
//   const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

//   for (let i = 0; i < metadataMappedToLoopRange.length; i++) {
//     metadataMappedToLoopRange[i]!.elapsedSeconds -= secondsToSubtract;
//   }

//   setCurrentlyPlayingMetadata(metadataMappedToLoopRange);

//   return compiledChordsMappedToLoopRange;
// }

// interface CompileStrummingPatternPreview {
//   strummingPattern: StrummingPattern;
// }

// function compileStrummingPatternPreview({
//   strummingPattern,
// }: CompileStrummingPatternPreview) {
//   const compiledChords: string[][] = [];

//   let noteLengthMultiplier = "1";

//   if (strummingPattern.noteLength === "1/4th triplet")
//     noteLengthMultiplier = "0.6667";
//   else if (strummingPattern.noteLength === "1/8th")
//     noteLengthMultiplier = "0.5";
//   else if (strummingPattern.noteLength === "1/8th triplet")
//     noteLengthMultiplier = "0.3333";
//   else if (strummingPattern.noteLength === "1/16th")
//     noteLengthMultiplier = "0.25";
//   else if (strummingPattern.noteLength === "1/16th triplet")
//     noteLengthMultiplier = "0.1667";

//   for (let i = 0; i < strummingPattern.strums.length; i++) {
//     const strumIsEmpty = strummingPattern.strums[i]?.strum === "";

//     compiledChords.push(
//       compileChord({
//         chordName: strumIsEmpty ? "" : "C",
//         chordIdx: i,
//         strummingPattern,
//         chords: [
//           {
//             id: "0", // no need for an actual id here
//             name: "C",
//             frets: ["0", "1", "0", "2", "3", ""],
//           },
//         ],
//         stringifiedBpm: "75",
//         noteLengthMultiplier,
//       }),
//     );
//   }

//   return compiledChords;
// }

// function generateDefaultSectionProgression(tabData: Section[]) {
//   const sectionProgression: SectionProgression[] = [];

//   for (let i = 0; i < tabData.length; i++) {
//     sectionProgression.push({
//       id: `${i}`,
//       sectionId: tabData[i]?.id ?? "",
//       title: tabData[i]?.title ?? "",
//       repetitions: 1,
//     });
//   }

//   return sectionProgression;
// }

export {
  expandFullTab,
  // compileChord,
  // compileSpecificChordGrouping,
  // compileStrummingPatternPreview,
  // generateDefaultSectionProgression,
};
