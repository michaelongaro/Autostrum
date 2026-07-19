import assert from "node:assert/strict";
import {
  compileFullTab,
  compileSpecificChordGrouping,
} from "../src/utils/chordCompilationHelpers";
import {
  getLoopEndIndexFromSlider,
  getLoopEndSliderValue,
  getLoopRangeMaxIndex,
  sliceToLoopRange,
} from "../src/utils/loopRangeHelpers";
import { expandFullTab } from "../src/utils/playbackChordCompilationHelpers";
import type {
  AudioMetadata,
  Chord,
  Metadata,
  PlaybackMetadata,
  Section,
  SectionProgression,
  TabNote,
} from "../src/stores/TabStore";

const chords: Chord[] = [
  {
    id: "c-major",
    name: "C",
    color: "#ffffff",
    frets: ["0", "1", "0", "2", "3", ""],
  },
];

function makeNote(id: string, noteLength: TabNote["noteLength"] = "quarter") {
  return {
    type: "note" as const,
    palmMute: "" as const,
    firstString: "0",
    secondString: "",
    thirdString: "",
    fourthString: "",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength,
    id,
  };
}

const tabData: Section[] = [
  {
    id: "section-1",
    title: "Mixed section",
    data: [
      {
        id: "tab-subsection",
        type: "tab",
        bpm: 120,
        baseNoteLength: "quarter",
        repetitions: 2,
        data: [makeNote("note-1"), makeNote("note-2"), makeNote("note-3")],
      },
      {
        id: "chord-subsection",
        type: "chord",
        bpm: 120,
        repetitions: 2,
        data: [
          {
            id: "sequence-1",
            bpm: 120,
            repetitions: 2,
            data: ["C", ""],
            strummingPattern: {
              id: "pattern-1",
              baseNoteLength: "quarter",
              strums: [
                { palmMute: "", strum: "v", noteLength: "quarter" },
                { palmMute: "", strum: "^", noteLength: "eighth" },
              ],
            },
          },
          {
            id: "sequence-2",
            bpm: 120,
            repetitions: 1,
            data: ["C"],
            strummingPattern: {
              id: "pattern-2",
              baseNoteLength: "quarter",
              strums: [{ palmMute: "", strum: "v", noteLength: "sixteenth" }],
            },
          },
        ],
      },
    ],
  },
  {
    id: "section-2",
    title: "Final section",
    data: [
      {
        id: "final-tab-subsection",
        type: "tab",
        bpm: 120,
        baseNoteLength: "quarter",
        repetitions: 1,
        data: [makeNote("note-4"), makeNote("note-5")],
      },
    ],
  },
];

const sectionProgression: SectionProgression[] = tabData.map((section) => ({
  id: `progression-${section.id}`,
  sectionId: section.id,
  title: section.title,
  repetitions: 1,
  startSeconds: 0,
  endSeconds: 0,
}));

function compileFull({
  startLoopIndex = 0,
  endLoopIndex = -1,
  loopDelay = 0,
}: {
  startLoopIndex?: number;
  endLoopIndex?: number;
  loopDelay?: number;
} = {}) {
  let metadata: Metadata[] = [];
  let fullLength = -1;
  const compiled = compileFullTab({
    tabData,
    sectionProgression,
    chords,
    baselineBpm: 120,
    playbackSpeed: 1,
    setCurrentlyPlayingMetadata: (nextMetadata) => {
      metadata = nextMetadata ?? [];
    },
    startLoopIndex,
    endLoopIndex,
    atomicallyUpdateAudioMetadata: (updatedFields: Partial<AudioMetadata>) => {
      fullLength = updatedFields.fullCurrentlyPlayingMetadataLength ?? -1;
    },
    loopDelay,
  });

  return { compiled, metadata, fullLength };
}

type Location = {
  sectionIndex: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
};

function compileSpecific(location: Location, loopDelay = 0) {
  let audioMetadata: Metadata[] = [];
  let playbackMetadata: PlaybackMetadata[] = [];

  const audioChords = compileSpecificChordGrouping({
    tabData,
    location,
    chords,
    baselineBpm: 120,
    playbackSpeed: 1,
    setCurrentlyPlayingMetadata: (metadata) => {
      audioMetadata = metadata ?? [];
    },
    startLoopIndex: 0,
    endLoopIndex: -1,
    loopDelay,
  });
  const playback = expandFullTab({
    tabData,
    location,
    sectionProgression,
    chords,
    baselineBpm: 120,
    playbackSpeed: 1,
    setPlaybackMetadata: (metadata) => {
      playbackMetadata = metadata ?? [];
    },
    startLoopIndex: 0,
    endLoopIndex: -1,
    loopDelay,
    visiblePlaybackContainerWidth: 0,
  });

  return {
    audioChords,
    audioMetadata,
    playbackChords: playback.chords,
    playbackMetadata,
  };
}

let passed = 0;
function check(name: string, assertion: () => void) {
  assertion();
  passed += 1;
  console.log(`  PASS  ${name}`);
}

console.log("chord compilation and loop ranges");

check("uses real item count and an inclusive final slider index", () => {
  assert.equal(getLoopRangeMaxIndex(4), 3);
  assert.equal(getLoopEndSliderValue(-1, 4), 3);
  assert.equal(getLoopEndIndexFromSlider(3, 4), -1);
  assert.deepEqual(sliceToLoopRange([0, 1, 2, 3], 0, -1), [0, 1, 2, 3]);
  assert.deepEqual(sliceToLoopRange([0, 1, 2, 3], 1, 2), [1, 2]);
  assert.deepEqual(sliceToLoopRange(["only"], 0, -1), ["only"]);
});

check("includes the selected finite end chord without a ghost chord", () => {
  const full = compileFull();
  const selected = compileFull({ startLoopIndex: 1, endLoopIndex: 2 });
  const selectedThroughFinalChord = compileFull({
    startLoopIndex: 0,
    endLoopIndex: full.fullLength - 1,
  });

  assert.equal(full.fullLength, full.compiled.length);
  assert.equal(full.metadata.length, full.compiled.length);
  assert.equal(selected.compiled.length, 2);
  assert.deepEqual(
    selected.metadata.map((metadata) => metadata.location.chordIndex),
    [1, 2],
  );
  assert.equal(selectedThroughFinalChord.compiled.length, full.compiled.length);
});

check("uses each strum's note length in regular metadata", () => {
  const sequence = compileSpecific({
    sectionIndex: 0,
    subSectionIndex: 1,
    chordSequenceIndex: 0,
  });

  assert.deepEqual(
    sequence.audioMetadata.map((metadata) => metadata.noteLengthMultiplier),
    [1, 0.5, 1, 0.5],
  );
});

for (const [name, location] of [
  ["section", { sectionIndex: 0 }],
  ["subsection", { sectionIndex: 0, subSectionIndex: 1 }],
  [
    "chord sequence",
    { sectionIndex: 0, subSectionIndex: 1, chordSequenceIndex: 0 },
  ],
] satisfies [string, Location][]) {
  check(`${name} audio and playback compilation stay aligned`, () => {
    const result = compileSpecific(location);

    assert.equal(result.audioChords.length, result.playbackChords.length);
    assert.equal(result.audioMetadata.length, result.playbackMetadata.length);
    assert.deepEqual(
      result.audioMetadata.map((metadata) => metadata.location.chordIndex),
      result.playbackMetadata.map((metadata) => metadata.location.chordIndex),
    );
  });
}

check("partial audio and playback append the same loop-delay spacers", () => {
  const result = compileSpecific({ sectionIndex: 1 }, 1);

  assert.equal(result.audioChords.length, result.playbackChords.length);
  assert.equal(result.audioMetadata.length, result.playbackMetadata.length);
  assert.equal(result.audioMetadata.at(-1)?.type, "loopDelaySpacer");
  assert.equal(result.playbackMetadata.at(-1)?.type, "loopDelaySpacer");
});

console.log(`\nAll ${passed} chord compilation checks passed.`);
