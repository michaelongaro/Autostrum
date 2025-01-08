import type {
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
  PlaybackLoopDelaySpacerChord,
} from "../stores/TabStore";
import getBpmForChord from "./getBpmForChord";
import getRepetitions from "./getRepetitions";
import isEqual from "lodash.isequal";

interface ExpandFullTab {
  tabData: Section[];
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  } | null;
  sectionProgression: SectionProgression[];
  chords: Chord[];
  baselineBpm: number;
  playbackSpeed: number;
  setPlaybackMetadata: (playbackMetadata: PlaybackMetadata[] | null) => void;
  startLoopIndex: number;
  endLoopIndex: number;
  loopDelay: number;
  visiblePlaybackContainerWidth: number;
}

function expandFullTab({
  tabData,
  location,
  sectionProgression,
  chords,
  baselineBpm,
  playbackSpeed,
  setPlaybackMetadata,
  startLoopIndex,
  endLoopIndex,
  loopDelay,
  visiblePlaybackContainerWidth,
}: ExpandFullTab) {
  const compiledChords: (
    | PlaybackTabChord
    | PlaybackStrummedChord
    | PlaybackLoopDelaySpacerChord
  )[] = [];
  const metadata: PlaybackMetadata[] = [];
  const elapsedSeconds = { value: 0 }; // getting around pass by value/reference issues

  const modifiedSectionProg =
    location?.sectionIndex === undefined
      ? sectionProgression
      : [
          {
            id: "",
            sectionId: tabData[location.sectionIndex]?.id ?? "",
            title: "",
            repetitions: 1,
            startSeconds: 0,
            endSeconds: 0,
          },
        ];

  for (
    let sectionProgressionIndex = 0;
    sectionProgressionIndex < modifiedSectionProg.length;
    sectionProgressionIndex++
  ) {
    const sectionIndex = getSectionIndexFromId(
      tabData,
      modifiedSectionProg[sectionProgressionIndex]!.sectionId,
    );

    const sectionRepetitions = getRepetitions(
      modifiedSectionProg[sectionProgressionIndex]?.repetitions,
    );

    for (
      let sectionRepeatIdx = 0;
      sectionRepeatIdx < sectionRepetitions;
      sectionRepeatIdx++
    ) {
      const section = tabData[sectionIndex]?.data;
      if (!section) continue;

      expandSection({
        section,
        sectionIndex,
        sectionRepeatIndex: sectionRepeatIdx,
        baselineBpm,
        compiledChords: compiledChords as (
          | PlaybackTabChord
          | PlaybackStrummedChord
        )[],
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

  if (metadataMappedToLoopRange.length === 0) {
    metadataMappedToLoopRange.push(backupFirstChordMetadata!);
  }

  // scaling the elapsedSeconds to start at 0 no matter the startLoopIndex
  const secondsToSubtract = metadataMappedToLoopRange[0]?.elapsedSeconds ?? 0;

  for (let i = 0; i < metadataMappedToLoopRange.length; i++) {
    metadataMappedToLoopRange[i]!.elapsedSeconds -= secondsToSubtract;
  }

  const firstChordType = compiledChordsMappedToLoopRange[0]?.type ?? "tab";
  const lastChordType = compiledChordsMappedToLoopRange.at(-1)?.type ?? "tab";

  const firstChordBpm = `${compiledChordsMappedToLoopRange[0]?.data.bpm ?? baselineBpm}`;
  const lastChordBpm = `${compiledChordsMappedToLoopRange.at(-1)?.data.bpm ?? baselineBpm}`;

  // right before duplication step, need to add a spacer chord if the first chord and last
  // chord are different types (tab vs strum)
  if (firstChordType !== lastChordType) {
    compiledChordsMappedToLoopRange.push(
      firstChordType === "tab"
        ? {
            type: "tab",
            isFirstChord: false,
            isLastChord: false,
            data: {
              chordData: [
                "-1",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                firstChordBpm !== lastChordBpm ? firstChordBpm : "",
                "",
              ],
              bpm: compiledChordsMappedToLoopRange[0]?.data.bpm ?? baselineBpm,
            },
          }
        : {
            type: "strum",
            isFirstChord: false,
            isLastChord: false,
            data: {
              strumIndex: -1,
              chordName: "",
              palmMute: "",
              strum: "",
              noteLength: "1/4th",
              bpm: compiledChordsMappedToLoopRange[0]?.data.bpm ?? baselineBpm,
              showBpm: false,
              isRaised: true,
            },
          },
    );

    metadataMappedToLoopRange.push({
      location: {
        ...metadataMappedToLoopRange.at(-1)!.location,
        chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
      },
      bpm: Number(
        getBpmForChord(
          compiledChordsMappedToLoopRange.at(-1)?.data.bpm ?? baselineBpm,
          baselineBpm,
        ),
      ),
      noteLengthMultiplier: "1",
      noteLength: "1/4th",
      elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
      type: "ornamental",
    });
  } else if (
    firstChordType === "tab" &&
    lastChordType === "tab" &&
    firstChordBpm !== lastChordBpm
  ) {
    // add a measure line w/ the new bpm
    compiledChordsMappedToLoopRange.push({
      type: "tab",
      isFirstChord: false,
      isLastChord: false,
      data: {
        chordData: ["", "|", "|", "|", "|", "|", "|", firstChordBpm, "", "1"],
        bpm: Number(firstChordBpm),
      },
    });
    metadataMappedToLoopRange.push({
      location: {
        ...metadataMappedToLoopRange.at(-1)!.location,
        chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
      },
      bpm: Number(
        getBpmForChord(
          compiledChordsMappedToLoopRange.at(-1)?.data.bpm ?? baselineBpm,
          baselineBpm,
        ),
      ),
      noteLengthMultiplier: "1",
      noteLength: "1/4th",
      elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
      type: "ornamental",
    });
  }

  // FYI: don't need a spacer chord if the first + last chords are strums, since if the very first
  // chord is a strum, it already automatically shows its bpm anyways, and no "spacer" chord is needed

  let loopCounter = 1;

  // getting overall width of the chords
  const baselineTotalChordsWidth = compiledChordsMappedToLoopRange.reduce(
    (acc, curr) => {
      if (curr.type === "tab") {
        if (curr.data.chordData.includes("|")) {
          // measure line
          return acc + 2;
        } else if (curr.data.chordData[0] === "-1") {
          // spacer chord
          return acc + 16;
        }
        // regular chord
        return acc + 35;
      } else {
        if (curr.type === "strum" && curr.data.strumIndex === -1) {
          // spacer chord
          return acc + 16;
        }

        // regular chord
        return acc + 40;
      }
    },
    0,
  );

  let totalChordsWidth = baselineTotalChordsWidth;
  const baselineCompiledChords = structuredClone(
    compiledChordsMappedToLoopRange,
  );
  const baselineMetadata = structuredClone(metadataMappedToLoopRange);

  // adding loopDelay in one-off fasion since do-while loop approach caused some clunky issues.
  if (loopDelay > 0 && totalChordsWidth >= visiblePlaybackContainerWidth) {
    // add as many spacer chords as needed to fill up the loopDelay
    // (according to the bpm of the very last chord in the loop).
    // The loopDelay value is the number of seconds to delay the repeat of the loop by.
    if (loopDelay > 0) {
      // make sure that last chord has "isLastChord" set to true, so that it has the rounded right border

      // @ts-expect-error asdf
      compiledChordsMappedToLoopRange.at(-1)!.isLastChord = true;

      const numSpacerChordsToAdd = Math.floor(
        loopDelay / ((60 / Number(lastChordBpm)) * playbackSpeed),
      );

      const lastChordMultiplier =
        metadataMappedToLoopRange.at(-1)?.noteLengthMultiplier ?? "1";
      const lastChordNoteLength =
        metadataMappedToLoopRange.at(-1)?.noteLength ?? "1/4th";

      for (let i = 0; i < numSpacerChordsToAdd; i++) {
        compiledChordsMappedToLoopRange.push({
          type: "loopDelaySpacer",
          data: {
            bpm: Number(lastChordBpm),
          },
        });

        metadataMappedToLoopRange.push({
          location: {
            ...metadataMappedToLoopRange.at(-1)!.location,
            chordIndex:
              metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
          },
          bpm: Number(
            getBpmForChord(
              compiledChordsMappedToLoopRange.at(-1)?.data.bpm ?? baselineBpm,
              baselineBpm,
            ),
          ),
          noteLengthMultiplier: lastChordMultiplier,
          noteLength: lastChordNoteLength,
          elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
          type: "ornamental",
        });
      }
    }
  }

  // non-zero check because this was running before visiblePlaybackContainerWidth was set,
  // probably want to gate entire function even being called beforehand?
  while (
    visiblePlaybackContainerWidth > 0 &&
    totalChordsWidth < visiblePlaybackContainerWidth
  ) {
    // adding the loopDelay spacer chords to the very end of the compiledChords
    // make sure that last chord has "isLastChord" set to true, so that it has the rounded right border

    // @ts-expect-error asdf
    compiledChordsMappedToLoopRange.at(-1)!.isLastChord = true;

    const numSpacerChordsToAdd = Math.floor(
      loopDelay / ((60 / Number(lastChordBpm)) * playbackSpeed),
    );

    const lastChordMultiplier =
      metadataMappedToLoopRange.at(-1)?.noteLengthMultiplier ?? "1";
    const lastChordNoteLength =
      metadataMappedToLoopRange.at(-1)?.noteLength ?? "1/4th";

    for (let i = 0; i < numSpacerChordsToAdd; i++) {
      compiledChordsMappedToLoopRange.push({
        type: "loopDelaySpacer",
        data: {
          bpm: Number(lastChordBpm),
        },
      });

      metadataMappedToLoopRange.push({
        location: {
          ...metadataMappedToLoopRange.at(-1)!.location,
          chordIndex: metadataMappedToLoopRange.at(-1)!.location.chordIndex + 1,
        },
        bpm: Number(
          getBpmForChord(
            compiledChordsMappedToLoopRange.at(-1)?.data.bpm ?? baselineBpm,
            baselineBpm,
          ),
        ),
        noteLengthMultiplier: lastChordMultiplier,
        noteLength: lastChordNoteLength,
        elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
        type: "ornamental",
      });
    }

    compiledChordsMappedToLoopRange.push(...baselineCompiledChords);
    metadataMappedToLoopRange.push(...baselineMetadata);

    totalChordsWidth += baselineTotalChordsWidth;
    loopCounter++;
  }

  setPlaybackMetadata(metadataMappedToLoopRange);

  return {
    chords: compiledChordsMappedToLoopRange,
    loopCounter,
  };
}

interface ExpandSection {
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

function expandSection({
  section,
  sectionIndex,
  sectionRepeatIndex,
  baselineBpm,
  compiledChords,
  metadata,
  chords,
  elapsedSeconds,
  playbackSpeed,
}: ExpandSection) {
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
        expandTabSection({
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
        expandChordSection({
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

interface ExpandTabSection {
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

function expandTabSection({
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
}: ExpandTabSection) {
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
        chordData: [
          "-1",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          compiledChords.at(-1)!.data.bpm !== Number(currentBpm)
            ? currentBpm
            : "",
          "",
        ],
        bpm: Number(currentBpm),
      },
    });
    metadata.push({
      location: {
        sectionIndex,
        sectionRepeatIndex,
        subSectionIndex,
        subSectionRepeatIndex,
        chordIndex: compiledChords.length - 1,
      },
      bpm: Number(currentBpm),
      noteLengthMultiplier: "1",
      noteLength: "1/4th",
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
    metadata.push({
      location: {
        sectionIndex,
        sectionRepeatIndex,
        subSectionIndex,
        subSectionRepeatIndex,
        chordIndex: compiledChords.length - 1,
      },
      bpm: Number(currentBpm),
      noteLengthMultiplier: "1",
      noteLength: "1/4th",
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: "ornamental",
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

    const isAMeasureLine = chord[8] === "measureLine";

    if (isAMeasureLine) {
      const newBpmPostMeasureLine = chord?.[7];
      if (newBpmPostMeasureLine && newBpmPostMeasureLine !== "-1") {
        currentBpm = newBpmPostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }
    }

    let noteLengthMultiplier = "1";
    const noteLength = chord[8];

    if (chord[8] === "1/8th") noteLengthMultiplier = "0.5";
    else if (chord[8] === "1/16th") noteLengthMultiplier = "0.25";

    chord[8] = currentBpm;
    chord[9] = noteLengthMultiplier;

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
      type: isAMeasureLine ? "ornamental" : "tab",
    });

    if (!isAMeasureLine) {
      elapsedSeconds.value +=
        60 /
        ((Number(currentBpm) / Number(noteLengthMultiplier)) * playbackSpeed);
    }

    chordData.data.chordData = chord; // refactor later to be less split up

    compiledChords.push(chordData);
  }
}

interface ExpandChordSection {
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

function expandChordSection({
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
}: ExpandChordSection) {
  const chordSection = subSection.data;

  // if not the very first chord in the tab, and the last section type
  // was a chord section, we need to add a spacer "chord"
  if (compiledChords.length > 0 && compiledChords.at(-1)?.type === "tab") {
    compiledChords.push({
      type: "strum",
      isFirstChord: false,
      isLastChord: false,
      data: {
        strumIndex: -1,
        chordName: "",
        palmMute: "",
        strum: "",
        noteLength: "1/4th",
        bpm: baselineBpm,
        showBpm: false,
        isRaised: false,
      },
    });
    metadata.push({
      location: {
        sectionIndex,
        sectionRepeatIndex,
        subSectionIndex,
        subSectionRepeatIndex,
        chordSequenceIndex: 0,
        chordSequenceRepeatIndex: 0,
        chordIndex: -1,
      },
      bpm: baselineBpm,
      noteLengthMultiplier: "1",
      noteLength: "1/4th",
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
    expandChordSequence({
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

interface ExpandChordSequence {
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

function expandChordSequence({
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
}: ExpandChordSequence) {
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
        type: "strum",
      });

      elapsedSeconds.value +=
        60 /
        ((Number(chordBpm) / Number(noteLengthMultiplier)) * playbackSpeed);

      const previousChordName = chordSequence.data[chordIdx - 1] ?? "";
      const currentChordName = chordSequence.data[chordIdx] ?? "";

      const isRaised =
        chordIdx === 0
          ? false
          : previousChordName.length > 5 && currentChordName.length > 5;

      const prevChord = compiledChords?.at(-1);

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
          // TODO: check this logic, might be flaky
          showBpm: Boolean(
            compiledChords.length === 0 ||
              (prevChord &&
                prevChord?.data.bpm !==
                  Number(
                    getBpmForChord(
                      chordSequence.bpm,
                      baselineBpm,
                      subSectionBpm,
                    ),
                  )),
          ),
          isRaised,
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

///////////////////////////////////////////////////////////////////////////////
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
  setSectionProgression,
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
    const chord = subSection.data[chordIdx];
    if (!chord) continue;

    // Check for measure line that can change BPM
    if (chord[8] === "measureLine") {
      const newBpmPostMeasureLine = chord[7];
      if (newBpmPostMeasureLine && newBpmPostMeasureLine !== "-1") {
        currentBpm = newBpmPostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }
    }

    let noteLengthMultiplier = 1;
    if (chord[8] === "1/8th") noteLengthMultiplier = 0.5;
    else if (chord[8] === "1/16th") noteLengthMultiplier = 0.25;

    // Calculate the duration of the chord and update elapsedSeconds
    const chordDuration =
      60 / (Number(currentBpm) / Number(noteLengthMultiplier));
    elapsedSeconds.value += chordDuration;
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
        default:
          noteLengthMultiplier = 1;
      }

      const chordBpm = getBpmForChord(
        chordSequence.bpm,
        baselineBpm,
        subSection.bpm,
      );

      // Calculate the duration of each chord in the sequence
      for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
        const chordDuration =
          60 / (Number(chordBpm) / Number(noteLengthMultiplier));
        elapsedSeconds.value += chordDuration;
      }
    }
  }
}

export { expandFullTab, updateElapsedSecondsInSectionProgression };
