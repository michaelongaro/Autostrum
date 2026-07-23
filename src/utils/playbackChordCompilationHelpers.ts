import { generateBeatLabels } from "~/utils/getBeatIndicator";
import { getSectionIndexFromId } from "~/utils/getSectionIndexFromId";
import {
  type Chord,
  type ChordSection,
  type ChordSequence,
  type FullNoteLengths,
  noteLengthMultipliers,
  type PlaybackLoopDelaySpacerChord,
  type PlaybackMetadata,
  type PlaybackStrummedChord,
  type PlaybackTabChord,
  type Section,
  type SectionProgression,
  type TabSection,
} from "../stores/TabStore";
import getBpmForChord from "./getBpmForChord";
import getRepetitions from "./getRepetitions";
import {
  isTabNote,
  isTabMeasureLine,
  tabColumnToArray,
} from "./tabNoteHelpers";

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
    PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord
  )[] = [];
  const metadata: PlaybackMetadata[] = [];
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

      expandSection({
        section,
        sectionIndex,
        sectionRepeatIndex: sectionRepeatIdx,
        baselineBpm,
        compiledChords: compiledChords as (
          PlaybackTabChord | PlaybackStrummedChord
        )[],
        metadata,
        chords,
        elapsedSeconds,
        playbackSpeed,
      });
    }
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

  // these need to be set before spacer chords are added
  compiledChordsMappedToLoopRange.at(0)!.isFirstChordInTab = true;
  compiledChordsMappedToLoopRange.at(-1)!.isLastChordInTab = true;

  // appending loop-delay spacers,
  // using quarter-note duration so spacer count * duration ≈ loopDelay seconds.
  if (loopDelay > 0) {
    const lastChordBpm = `${compiledChordsMappedToLoopRange.at(-1)?.data.bpm ?? baselineBpm}`;
    const numSpacerChordsToAdd = Math.floor(
      loopDelay / ((60 / Number(lastChordBpm)) * playbackSpeed),
    );

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
        bpm: getBpmForChord(
          compiledChordsMappedToLoopRange.at(-1)?.data.bpm ?? baselineBpm,
          baselineBpm,
        ),
        noteLengthMultiplier: 1,
        noteLength: "quarter",
        elapsedSeconds: metadataMappedToLoopRange.at(-1)!.elapsedSeconds,
        type: "ornamental",
      });
    }
  }

  let artificialLoopsNecessary = 1;

  const getChordWidth = (
    curr:
      | (typeof compiledChordsMappedToLoopRange)[number]
      | PlaybackLoopDelaySpacerChord,
  ) => {
    if (curr.type === "tab") {
      if (curr.data.chordData.includes("|")) {
        return 2;
      }
      if (curr.data.chordData[0] === "-1") {
        return 16;
      }
      return 34;
    }

    if (curr.type === "loopDelaySpacer") {
      return 34;
    }

    if (curr.type === "strum" && curr.data.strumIndex === -1) {
      return 16;
    }

    return 40;
  };

  // Baseline includes loop-delay spacers so L visual copies == L * compiledChords.length.
  const baselineTotalChordsWidth = compiledChordsMappedToLoopRange.reduce(
    (acc, curr) => acc + getChordWidth(curr),
    0,
  );

  let totalChordsWidth = baselineTotalChordsWidth;

  const baselineCompiledChords = structuredClone(
    compiledChordsMappedToLoopRange,
  );
  const baselineMetadata = structuredClone(metadataMappedToLoopRange);

  // Duplicate full baseline loops until the strip is wide enough for seamless scrolling.
  // non-zero check because this was running before visiblePlaybackContainerWidth was set.
  while (
    visiblePlaybackContainerWidth > 0 &&
    totalChordsWidth < visiblePlaybackContainerWidth * 2
  ) {
    compiledChordsMappedToLoopRange.push(...baselineCompiledChords);
    metadataMappedToLoopRange.push(...baselineMetadata);

    totalChordsWidth += baselineTotalChordsWidth;
    artificialLoopsNecessary++;
  }

  setPlaybackMetadata(metadataMappedToLoopRange);

  return {
    chords: compiledChordsMappedToLoopRange,
    artificialLoopsNecessary,
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

  for (let chordIdx = 0; chordIdx < data.length; chordIdx++) {
    const column = data[chordIdx]!;
    const chordArray = tabColumnToArray(column);

    const isANote = isTabNote(column);
    const isAMeasureLine = isTabMeasureLine(column);

    const prevChord = compiledChords?.at(-1);
    const prevChordIsAMeasureLine = isTabMeasureLine(data[chordIdx - 1]!); // TODO: do actual type checking here

    const chordData: PlaybackTabChord = {
      type: "tab",
      isFirstChord: chordIdx === 0,
      isLastChord: chordIdx === data.length - 1,
      data: {
        chordData: chordArray,
        bpm: currentBpm,
        showBpm:
          compiledChords.length === 0 ||
          (prevChord?.data.bpm !== currentBpm && !prevChordIsAMeasureLine),
      },
    };

    if (isAMeasureLine) {
      const newBpmPostMeasureLine = column.bpmAfterLine;
      if (newBpmPostMeasureLine !== null) {
        currentBpm = newBpmPostMeasureLine;
      } else {
        currentBpm = getBpmForChord(subSection.bpm, baselineBpm);
      }
    }

    const noteLength = isANote
      ? column.noteLength
      : ("quarter" as FullNoteLengths);

    const noteLengthMultiplier = noteLengthMultipliers[noteLength] ?? 1;

    // Update BPM in array for playback
    chordArray[9] = `${currentBpm}`;

    metadata.push({
      location: {
        sectionIndex,
        sectionRepeatIndex,
        subSectionIndex,
        subSectionRepeatIndex,
        chordIndex: chordIdx,
      },
      bpm: currentBpm,
      noteLengthMultiplier,
      noteLength,
      elapsedSeconds: Math.floor(elapsedSeconds.value),
      type: isAMeasureLine ? "ornamental" : "tab",
    });

    if (!isAMeasureLine) {
      elapsedSeconds.value +=
        60 / ((currentBpm / noteLengthMultiplier) * playbackSpeed);
    }

    chordData.data.chordData = chordArray;

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

    // get the corresponding array of beat indicies, so that you can directly
    // index for them and attach the correct beat index in playbackChordSequence below.
    const strumsWithNoteLengths = chordSequence.strummingPattern.strums.map(
      (strum) => {
        return strum.noteLength;
      },
    );
    const beatIndicies = generateBeatLabels(strumsWithNoteLengths);

    for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
      // immediately add fake "spacer" strum if chordIdx === 0, excluding the first chord
      // since we want the highlighted line to be right at the start of the first chord

      let chordName = chordSequence.data[chordIdx];
      let chordNameToUse = "";

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
          sectionRepeatIndex,
          subSectionIndex,
          subSectionRepeatIndex,
          chordSequenceIndex,
          chordSequenceRepeatIndex: chordSequenceRepeatIdx,
          chordIndex: chordIdx,
        },
        bpm: chordBpm,
        noteLengthMultiplier,
        noteLength: noteLength,
        elapsedSeconds: Math.floor(elapsedSeconds.value),
        type: "strum",
      });

      elapsedSeconds.value +=
        60 / ((chordBpm / noteLengthMultiplier) * playbackSpeed);

      const prevChord = compiledChords?.at(-1);

      // Look up chord color from the chords array
      const matchingChord = chords.find((c) => c.name === chordName);
      const chordColor = matchingChord?.color ?? "";

      const playbackChordSequence: PlaybackStrummedChord = {
        type: "strum",
        isFirstChord: chordIdx === 0,
        isLastChord: chordIdx === chordSequence.data.length - 1,
        baseNoteLength: chordSequence.strummingPattern.baseNoteLength,
        data: {
          strumIndex: chordIdx,
          chordName: chordNameToUse,
          chordColor,
          palmMute:
            chordSequence.strummingPattern.strums[chordIdx]?.palmMute ?? "",
          strum: chordSequence.strummingPattern.strums[chordIdx]?.strum ?? "",
          noteLength:
            chordSequence.strummingPattern.strums[chordIdx]?.noteLength ??
            "quarter",
          beatIndicator: beatIndicies[chordIdx] ?? "",
          bpm: Number(
            getBpmForChord(chordSequence.bpm, baselineBpm, subSectionBpm),
          ),
          // TODO: check this logic, might be flaky
          showBpm: Boolean(
            compiledChords.length === 0 ||
            prevChord?.data.bpm !==
              Number(
                getBpmForChord(chordSequence.bpm, baselineBpm, subSectionBpm),
              ),
          ),
        },
      };

      compiledChords.push(playbackChordSequence);
    }
  }
}

export { expandFullTab };
