import type {
  AudioMetadata,
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
    currentlyPlayingMetadata: Metadata[] | null,
  ) => void;
  startLoopIndex: number;
  endLoopIndex: number;
  atomicallyUpdateAudioMetadata?: (
    updatedFields: Partial<AudioMetadata>,
  ) => void;
  loopDelay: number;
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
  startLoopIndex,
  endLoopIndex,
  atomicallyUpdateAudioMetadata,
  loopDelay,
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

  // TODO: probably remove +1 since we aren't using ghost chord right now
  // +1 to account for ghost chord that's added below
  if (atomicallyUpdateAudioMetadata) {
    atomicallyUpdateAudioMetadata({
      fullCurrentlyPlayingMetadataLength: metadata.length - 1, // + 1,
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

  if (metadataMappedToLoopRange.length === 0) {
    metadataMappedToLoopRange.push(backupFirstChordMetadata!);
  }

  // scaling the elapsedSeconds to start at 0 no matter the startLoopIndex
  const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

  for (let i = 0; i < metadataMappedToLoopRange.length; i++) {
    metadataMappedToLoopRange[i]!.elapsedSeconds -= secondsToSubtract;
  }

  // fyi: perfectly fine for these to be duplicated, since they are in playback helpers as well!
  // was there any reason we didn't include this before? feels like a decent sized oversight if so...
  const firstChordType = metadataMappedToLoopRange[0]?.type ?? "tab";
  const lastChordType = metadataMappedToLoopRange.at(-1)?.type ?? "tab";

  const firstChordBpm = `${metadataMappedToLoopRange[0]?.bpm ?? baselineBpm}`;
  const lastChordBpm = `${metadataMappedToLoopRange.at(-1)?.bpm ?? baselineBpm}`;

  if (firstChordType !== lastChordType) {
    compiledChordsMappedToLoopRange.push([]);

    metadataMappedToLoopRange.push({
      location: {
        ...metadataMappedToLoopRange.at(-1)!.location,
        chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
      },
      bpm: Number(
        getBpmForChord(
          metadataMappedToLoopRange.at(-1)?.bpm ?? baselineBpm,
          baselineBpm,
        ),
      ),
      noteLengthMultiplier: "1",
      elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
      type: "ornamental",
    });
  } else if (
    firstChordType === "tab" &&
    lastChordType === "tab" &&
    firstChordBpm !== lastChordBpm
  ) {
    // add a measure line w/ the new bpm
    compiledChordsMappedToLoopRange.push([]);
    metadataMappedToLoopRange.push({
      location: {
        ...metadataMappedToLoopRange.at(-1)!.location,
        chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
      },
      bpm: Number(
        getBpmForChord(
          metadataMappedToLoopRange.at(-1)?.bpm ?? baselineBpm,
          baselineBpm,
        ),
      ),
      noteLengthMultiplier: "1",
      elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
      type: "ornamental",
    });
  }

  // FYI: don't need a spacer chord if the first + last chords are strums, since if the very first
  // chord is a strum, it already automatically shows its bpm anyways, and no "spacer" chord is needed

  // TODO: TEMPORARILY doing this always, but should only do if being played from <PlaybackModal />
  if (loopDelay > 0) {
    const numSpacerChordsToAdd = Math.floor(
      loopDelay / ((60 / Number(lastChordBpm)) * playbackSpeed),
    );

    const lastChordMultiplier =
      metadataMappedToLoopRange.at(-1)?.noteLengthMultiplier ?? "1";

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
        lastChordBpm,
        lastChordMultiplier,
      ]); // might need to fill with "" ?

      metadataMappedToLoopRange.push({
        location: {
          ...metadataMappedToLoopRange.at(-1)!.location,
          chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
        },
        bpm: Number(lastChordBpm),
        noteLengthMultiplier: lastChordMultiplier,
        elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
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
      bpm: Number(currentBpm),
      noteLengthMultiplier: "1",
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
      noteLengthMultiplier: "1",
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: "ornamental",
    });
  }

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

      compiledChords.push([]);
      metadata.push({
        location: {
          sectionIndex,
          subSectionIndex,
          chordIndex: chordIdx,
        },
        bpm: Number(currentBpm),
        noteLengthMultiplier: "1",
        elapsedSeconds: Math.floor(elapsedSeconds.value),
        type: "ornamental",
      });
      continue;
    }

    let noteLengthMultiplier = "1";

    if (chord[8] === "1/8th") noteLengthMultiplier = "0.5";
    else if (chord[8] === "1/16th") noteLengthMultiplier = "0.25";

    chord[8] = currentBpm;
    chord[9] = noteLengthMultiplier;

    metadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: chordIdx,
      },
      bpm: Number(currentBpm),
      noteLengthMultiplier,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: "tab",
    });

    elapsedSeconds.value +=
      60 /
      ((Number(currentBpm) / Number(noteLengthMultiplier)) * playbackSpeed);

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

  // if last section was a tab section, need to add a spacer "chord"
  if (compiledChords.length > 0 && metadata.at(-1)?.type === "tab") {
    compiledChords.push([]);
    metadata.push({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: -1,
      },
      bpm: Number(subSection.bpm),
      noteLengthMultiplier: "1",
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
        type: "strum",
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
        }),
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
      }),
    );
  }

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
    currentlyPlayingMetadata: Metadata[] | null,
  ) => void;
  startLoopIndex: number;
  endLoopIndex: number;
  atomicallyUpdateAudioMetadata?: (
    updatedFields: Partial<AudioMetadata>,
  ) => void;
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

  // hacky: but is used incase the slice returns an empty array, which we couldn't then access
  // the last element in metadataMappedToLoopRange below for.
  const backupFirstChordMetadata = metadata[startLoopIndex];

  // TODO: probably remove +1 since we aren't using ghost chord right now
  // +1 to account for ghost chord that's added below
  if (atomicallyUpdateAudioMetadata) {
    atomicallyUpdateAudioMetadata({
      fullCurrentlyPlayingMetadataLength: metadata.length - 1, //+ 1,
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

  let ghostChordIndex = 0;

  if (metadataMappedToLoopRange.length > 0) {
    if (endLoopIndex === -1) {
      ghostChordIndex =
        metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1;
    } else {
      ghostChordIndex = metadataMappedToLoopRange.at(-1)!.location.chordIndex;
      // ^ this is not perfect, somehow maybe want the chordIndex to be +1 more?
    }
  }

  if (endLoopIndex !== -1) {
    metadataMappedToLoopRange.pop();
  }

  const lastActualChord = metadataMappedToLoopRange.at(-1)!;

  // TODO: keep an eye on this, not sure how ghost chords should be handled in current setup
  // conditionally adding fake chord + metadata to align the audio controls slider with the visual progress indicator
  // really absolutely *hate* this solution, but technically it should work.
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
  //     type: "tab"
  //   });

  //   compiledChordsMappedToLoopRange.push([]);
  // }

  // right before duplication step, need to add a spacer chord if the first chord and last
  // chord are different types (tab vs strum)
  if (metadata[0]?.type !== metadata.at(-1)?.type) {
    compiledChordsMappedToLoopRange.push([]);

    metadataMappedToLoopRange.push({
      location: {
        ...metadataMappedToLoopRange.at(-1)!.location,
        chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
      },
      bpm: metadataMappedToLoopRange.at(-1)!.bpm,
      noteLengthMultiplier: "1",
      elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
      type: "tab",
    });
  }

  if (metadataMappedToLoopRange.length === 0) {
    metadataMappedToLoopRange.push(backupFirstChordMetadata!);
  }

  // scaling the elapsedSeconds to start at 0 no matter the startLoopIndex
  const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

  for (let i = 0; i < metadataMappedToLoopRange.length; i++) {
    metadataMappedToLoopRange[i]!.elapsedSeconds -= secondsToSubtract;
  }

  setCurrentlyPlayingMetadata(metadataMappedToLoopRange);

  return compiledChordsMappedToLoopRange;
}

function generateDefaultSectionProgression(tabData: Section[]) {
  const sectionProgression: SectionProgression[] = [];

  for (let i = 0; i < tabData.length; i++) {
    sectionProgression.push({
      id: `${i}`,
      sectionId: tabData[i]?.id ?? "",
      title: tabData[i]?.title ?? "",
      repetitions: 1,
      startSeconds: 0, // will be overwritten by useAutoCompileChords
      endSeconds: 0, // will be overwritten by useAutoCompileChords
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
