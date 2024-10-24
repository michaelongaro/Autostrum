import type {
  AudioMetadata,
  Chord,
  ChordSection,
  ChordSequence,
  PlaybackMetadata,
  Section,
  SectionProgression,
  StrummingPattern,
  TabSection,
  PlaybackTabChord,
  PlaybackStrummedChord,
} from "../stores/TabStore";
import getBpmForChord from "./getBpmForChord";
import getRepetitions from "./getRepetitions";
import isEqual from "lodash.isequal";

interface ExpandFullTab {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  chords: Chord[];
  baselineBpm: number;
  playbackSpeed: number;
  setPlaybackMetadata: (playbackMetadata: PlaybackMetadata[] | null) => void;
  startLoopIndex: number;
  endLoopIndex: number;
}

function expandFullTab({
  tabData,
  sectionProgression,
  chords,
  baselineBpm,
  playbackSpeed,
  setPlaybackMetadata,
  startLoopIndex,
  endLoopIndex,
}: ExpandFullTab) {
  const compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[] = [];
  const metadata: PlaybackMetadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues

  console.log("start", startLoopIndex, "end", endLoopIndex);

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
      });
    }
  }

  // hacky: but is used incase the slice returns an empty array, which we couldn't then access
  // the last element in metadataMappedToLoopRange below for.
  const backupFirstChordMetadata = metadata[startLoopIndex];

  const compiledChordsMappedToLoopRange = compiledChords.slice(
    startLoopIndex,
    endLoopIndex === -1 ? compiledChords.length : endLoopIndex,
  );

  const metadataMappedToLoopRange = metadata.slice(
    startLoopIndex,
    endLoopIndex === -1 ? metadata.length : endLoopIndex,
  );

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

  // conditionally adding fake chord + metadata to align the audio controls slider with the visual
  // progress indicator, really absolutely *hate* this solution, but technically it should work.
  // if (metadataMappedToLoopRange.length > 0 && lastActualChord) {
  //   metadataMappedToLoopRange.push({
  //     location: {
  //       ...lastActualChord.location,
  //       chordIndex: ghostChordIndex,
  //     },
  //     bpm: Number(getBpmForChord(lastActualChord.bpm, baselineBpm)),
  //     noteLengthMultiplier: lastActualChord.noteLengthMultiplier,
  //     noteLength: lastActualChord.noteLength,
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

  if (metadataMappedToLoopRange.length === 0) {
    metadataMappedToLoopRange.push(backupFirstChordMetadata!);
  }

  // scaling the elapsedSeconds to start at 0 no matter the startLoopIndex
  const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

  for (let i = 0; i < metadataMappedToLoopRange.length; i++) {
    metadataMappedToLoopRange[i]!.elapsedSeconds -= secondsToSubtract;
  }

  console.log(
    metadataMappedToLoopRange.length,
    compiledChordsMappedToLoopRange.length,
  );

  setPlaybackMetadata(metadataMappedToLoopRange);

  return compiledChordsMappedToLoopRange;
}

interface CompileSection {
  section: (TabSection | ChordSection)[];
  sectionIndex: number;
  sectionRepeatIndex: number;
  baselineBpm: number;
  compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[];
  metadata: PlaybackMetadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
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
  metadata: PlaybackMetadata[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
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
      data: {
        chordData: ["-1", "", "", "", "", "", "", "", "", ""],
        bpm: Number(currentBpm),
      },
    });
  }

  // FYI: would like to be !== 0, however you would be rendering a measure line at
  // the very start of the tab, which goes against your current tab making rules and
  // visually wouldn't work out. maybe just need to live with the fact that the first
  // chord won't show bpm, instead just showing it in top right (or wherever) of
  // playback dialog.
  if (
    compiledChords.length > 0 &&
    compiledChords.at(-1) !== undefined &&
    compiledChords.at(-1)!.data.bpm !== Number(currentBpm)
  ) {
    compiledChords.push({
      type: "tab",
      isFirstChord: false,
      isLastChord: false,
      data: {
        chordData: ["", "|", "|", "|", "|", "|", "|", currentBpm, "", "1"],
        bpm: Number(currentBpm),
      },
    });
  }

  for (let chordIdx = 0; chordIdx < data.length; chordIdx++) {
    const chordData: PlaybackTabChord = {
      type: "tab",
      isFirstChord: chordIdx === 0,
      isLastChord: chordIdx === data.length - 1,
      data: {
        chordData: data[chordIdx]!,
        bpm: Number(currentBpm),
      },
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
    }

    let noteLengthMultiplier = "1";
    const noteLength = chord[8];

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
        noteLength: noteLength as StrummingPattern["noteLength"],
        elapsedSeconds: Math.floor(elapsedSeconds.value),
      });

      elapsedSeconds.value +=
        60 /
        ((Number(currentBpm) / Number(noteLengthMultiplier)) * playbackSpeed);
    }

    chordData.data.chordData = chord; // refactor later to be less split up

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
  metadata: PlaybackMetadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
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
  metadata: PlaybackMetadata[];
  chords: Chord[];
  elapsedSeconds: { value: number };
  playbackSpeed: number;
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
}: CompileChordSequence) {
  const chordSequenceRepetitions = getRepetitions(chordSequence?.repetitions);

  for (
    let chordSequenceRepeatIdx = 0;
    chordSequenceRepeatIdx < chordSequenceRepetitions;
    chordSequenceRepeatIdx++
  ) {
    let lastSpecifiedChordName: string | undefined = undefined;

    if (compiledChords.length > 0) {
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
          bpm: Number(
            getBpmForChord(chordSequence.bpm, baselineBpm, subSectionBpm),
          ),
        },
      };

      compiledChords.push(playbackChordSequence);
    }

    for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
      // immediately add fake "spacer" strum if chordIdx === 0, excluding the first chord
      // since we want the highlighted line to be right at the start of the first chord

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
        noteLength: chordSequence.strummingPattern.noteLength,
        elapsedSeconds: Math.floor(elapsedSeconds.value),
      });

      elapsedSeconds.value +=
        60 /
        ((Number(chordBpm) / Number(noteLengthMultiplier)) * playbackSpeed);

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
          bpm: Number(
            getBpmForChord(chordSequence.bpm, baselineBpm, subSectionBpm),
          ),
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

interface ExpandSpecificSection {
  tabData: Section[];
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  };
  chords: Chord[];
  baselineBpm: number;
  playbackSpeed: number;
  setPlaybackMetadata: (playbackMetadata: PlaybackMetadata[] | null) => void;
  // startLoopIndex: number;
  // endLoopIndex: number;
  // atomicallyUpdateAudioMetadata?: (
  //   updatedFields: Partial<AudioMetadata>,
  // ) => void;
}

function expandSpecificSection({
  tabData,
  location,
  chords,
  baselineBpm,
  playbackSpeed,
  setPlaybackMetadata,
  // startLoopIndex,
  // endLoopIndex,
  // atomicallyUpdateAudioMetadata,
}: ExpandSpecificSection) {
  const compiledChords: (PlaybackTabChord | PlaybackStrummedChord)[] = [];
  const metadata: PlaybackMetadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues, prob want to combine all three into one obj};

  const section = tabData[location.sectionIndex]?.data;
  const sectionIndex = location.sectionIndex;

  if (!section) return [];

  compileSection({
    section,
    sectionIndex,
    sectionRepeatIndex: 0,
    baselineBpm,
    compiledChords,
    metadata,
    chords,
    elapsedSeconds,
    playbackSpeed,
  });

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

  setPlaybackMetadata(metadata);

  return compiledChords;
}

////////////////////////  validate this extracted logic below later  /////////////////////////////////////
interface UpdateElasedSecondsInSectionProgression {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  baselineBpm: number;
  playbackSpeed: number;
  setSectionProgression: (sectionProgression: SectionProgression[]) => void;
}

function updateElapsedSecondsInSectionProgression({
  tabData,
  sectionProgression,
  baselineBpm,
  playbackSpeed,
  setSectionProgression,
}: UpdateElasedSecondsInSectionProgression) {
  const sectionProgressionWithElapsedSeconds: SectionProgression[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues

  for (
    let sectionProgressionIndex = 0;
    sectionProgressionIndex < sectionProgression.length;
    sectionProgressionIndex++
  ) {
    const sectionIndex = getSectionIndexFromId(
      tabData,
      sectionProgression[sectionProgressionIndex]!.sectionId,
    );

    // Add current section's elapsed seconds
    sectionProgressionWithElapsedSeconds.push({
      ...sectionProgression[sectionProgressionIndex]!,
      elapsedSecondsIntoTab: Math.floor(elapsedSeconds.value),
    });

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

      updateElapsedTimeForSection({
        section,
        baselineBpm,
        elapsedSeconds,
        playbackSpeed,
      });
    }
  }

  // was causing infinite loop in useAutoCompileChords, so only update if they are different
  if (!isEqual(sectionProgression, sectionProgressionWithElapsedSeconds)) {
    setSectionProgression(sectionProgressionWithElapsedSeconds);
  }
}

function updateElapsedTimeForSection({
  section,
  baselineBpm,
  elapsedSeconds,
  playbackSpeed,
}: {
  section: (TabSection | ChordSection)[];
  baselineBpm: number;
  elapsedSeconds: { value: number };
  playbackSpeed: number;
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
          playbackSpeed,
        });
      } else {
        updateElapsedTimeForChordSection({
          subSection,
          baselineBpm,
          elapsedSeconds,
          playbackSpeed,
        });
      }
    }
  }
}

function updateElapsedTimeForTabSection({
  subSection,
  baselineBpm,
  elapsedSeconds,
  playbackSpeed,
}: {
  subSection: TabSection;
  baselineBpm: number;
  elapsedSeconds: { value: number };
  playbackSpeed: number;
}) {
  let currentBpm = getBpmForChord(subSection.bpm, baselineBpm);

  for (let chordIdx = 0; chordIdx < subSection.data.length; chordIdx++) {
    const chord = subSection.data[chordIdx];

    if (!chord) continue;

    // Check for measure line that can change BPM
    if (chord[8] === "measureLine") {
      const specifiedBpmToUsePostMeasureLine = chord[7];
      if (
        specifiedBpmToUsePostMeasureLine &&
        specifiedBpmToUsePostMeasureLine !== "-1"
      ) {
        currentBpm = specifiedBpmToUsePostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }
    }

    let noteLengthMultiplier = "1";
    if (chord[8] === "1/8th") noteLengthMultiplier = "0.5";
    else if (chord[8] === "1/16th") noteLengthMultiplier = "0.25";

    elapsedSeconds.value +=
      60 /
      ((Number(currentBpm) / Number(noteLengthMultiplier)) * playbackSpeed);
  }
}

function updateElapsedTimeForChordSection({
  subSection,
  baselineBpm,
  elapsedSeconds,
  playbackSpeed,
}: {
  subSection: ChordSection;
  baselineBpm: number;
  elapsedSeconds: { value: number };
  playbackSpeed: number;
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

      const chordBpm = getBpmForChord(
        chordSequence.bpm,
        baselineBpm,
        subSection.bpm,
      );

      for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
        elapsedSeconds.value +=
          60 /
          ((Number(chordBpm) / Number(noteLengthMultiplier)) * playbackSpeed);
      }
    }
  }
}

export {
  expandFullTab,
  expandSpecificSection,
  updateElapsedSecondsInSectionProgression,
};
