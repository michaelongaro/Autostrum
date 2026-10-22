import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createTabStore,
  TabStoreContext,
  useTabStore,
  useTabStoreApi,
  type ChordSection,
  type Section,
  type StrummingPattern,
  type TabSection,
} from "~/stores/TabStore";
import { getColorForChordName } from "~/utils/chordColors";
import { createTabMeasureLine, createTabNote } from "~/utils/tabNoteHelpers";
import { DEFAULT_TUNING } from "~/utils/tunings";
import type { FeatureId } from "./FeaturePreviews";
import styles from "./FeatureShowcase.module.css";

const FEATURE_IDS: FeatureId[] = [
  "zoom",
  "colors",
  "speed",
  "loop",
  "reordering",
  "autoscroll",
  "hotkeys",
  "tuning",
];
const CHORD_NAMES = ["G", "C", "Em", "D"];
const FRETS = [
  ["3", "2", "0", "0", "0", "3"],
  ["", "3", "2", "0", "1", "0"],
  ["0", "2", "2", "0", "0", "0"],
  ["", "", "0", "2", "3", "2"],
];

const PRACTICE_CHORDS = [
  // Frets follow the rendered string rows, from highest to lowest pitch.
  { name: "G", frets: ["3", "0", "0", "0", "2", "3"] },
  { name: "Cadd9", frets: ["3", "3", "0", "2", "3", ""] },
  { name: "D", frets: ["2", "3", "2", "0", "", ""] },
  { name: "Cmaj7", frets: ["0", "0", "0", "2", "3", ""] },
  { name: "Em7/B", frets: ["0", "0", "0", "0", "2", ""] },
  { name: "Fmaj7(#11)", frets: ["0", "0", "2", "3", "3", "1"] },
  { name: "Fmaj7", frets: ["0", "1", "2", "3", "3", "1"] },
  { name: "G6", frets: ["0", "3", "4", "5", "5", "3"] },
];

function createPattern(
  id: string,
  noteLength: "eighth" | "sixteenth",
  directions: string[],
): StrummingPattern {
  return {
    id,
    baseNoteLength: noteLength,
    strums: directions.map((strum) => ({
      palmMute: "",
      strum,
      noteLength,
    })),
  };
}

const COLOR_PATTERN = createPattern("homepage-color-pattern", "sixteenth", [
  "v",
  "",
  "v",
  "",
  "v",
  "^",
  "v",
  "^",
  "",
  "^",
  "v",
  "",
  "v",
  "^",
  "v",
  "^",
]);
// Each reference row spans eight beats (16 eighth-note slots).
const LOOP_INTRO_PATTERN = createPattern(
  "homepage-loop-intro-pattern",
  "eighth",
  ["v", "", "v", "", "v", "^", "v", "^", "", "^", "v", "^", "", "^", "v", "^"],
);
// The other rows alternate down/up, accenting downstrokes on beats 1, 3, 5, 7.
const LOOP_PATTERN = createPattern("homepage-loop-pattern", "eighth", [
  "v>",
  "^",
  "v",
  "^",
  "v>",
  "^",
  "v",
  "^",
  "v>",
  "^",
  "v",
  "^",
  "v>",
  "^",
  "v",
  "^",
]);

// Only the visible columns in the reference screenshots are transcribed here.
// Tab-note string fields follow the displayed rows, highest to lowest.
const ZOOM_MEASURES: NonNullable<Parameters<typeof createTabNote>[0]>[][] = [
  [
    { thirdString: "0", secondString: "3p", noteLength: "eighth" },
    { secondString: "2" },
    { fifthString: "2" },
    { fourthString: "0" },
    { fifthString: "2", noteLength: "eighth" },
  ],
  [
    { thirdString: "0", noteLength: "eighth" },
    { fourthString: "0", noteLength: "eighth" },
    { secondString: "0", noteLength: "eighth" },
    { fifthString: "0" },
    { fourthString: "0", noteLength: "eighth" },
    { thirdString: "0", noteLength: "eighth" },
    { sixthString: "4", noteLength: "eighth" },
  ],
  [
    { noteLength: "eighth" },
    { thirdString: "0", secondString: "3p", noteLength: "eighth" },
    { secondString: "2", noteLength: "eighth" },
    { sixthString: "5" },
    { fourthString: "0" },
    { sixthString: "5", noteLength: "eighth" },
  ],
];
const SPEED_MEASURES: NonNullable<Parameters<typeof createTabNote>[0]>[][] = [
  [
    { sixthString: "3" },
    { secondString: "0" },
    { thirdString: "2p" },
    { thirdString: "0" },
  ],
  [
    { fifthString: "2" },
    { thirdString: "0" },
    { fourthString: "4" },
    { thirdString: "0" },
  ],
  [
    { fifthString: "3" },
    { thirdString: "0" },
    { fourthString: "4" },
    { thirdString: "0" },
  ],
  [
    { secondString: "0" },
    { thirdString: "2p" },
    { thirdString: "0" },
    { fourthString: "4" },
  ],
];

function createPracticeTab(
  sectionIndex: number,
  feature: "zoom" | "speed",
): TabSection {
  const measures = feature === "zoom" ? ZOOM_MEASURES : SPEED_MEASURES;
  return {
    id: `demo-${sectionIndex}-tab`,
    type: "tab",
    bpm: feature === "speed" ? 200 : -1,
    repetitions: feature === "speed" ? 2 : 1,
    baseNoteLength: "quarter",
    data: measures.flatMap((measure, measureIndex) => [
      ...(measureIndex === 0
        ? []
        : [
            {
              ...createTabMeasureLine(),
              id: `demo-${sectionIndex}-measure-${measureIndex}`,
            },
          ]),
      ...measure.map((options, noteIndex) => ({
        ...createTabNote(options),
        id: `demo-${sectionIndex}-measure-${measureIndex}-note-${noteIndex}`,
      })),
    ]),
  };
}

function createPracticeChords(
  sectionIndex: number,
  feature: "colors" | "loop",
): ChordSection {
  const sequences: {
    pattern: StrummingPattern;
    changes: Record<number, string>;
  }[] =
    feature === "colors"
      ? [
          { pattern: COLOR_PATTERN, changes: { 0: "G" } },
          { pattern: COLOR_PATTERN, changes: { 0: "Cadd9", 7: "D" } },
        ]
      : [
          {
            pattern: LOOP_INTRO_PATTERN,
            changes: { 0: "Cmaj7", 7: "Em7/B", 11: "Em7/B" },
          },
          { pattern: LOOP_PATTERN, changes: { 0: "Fmaj7(#11)", 7: "Fmaj7" } },
          { pattern: LOOP_PATTERN, changes: { 0: "Cmaj7", 7: "Em7/B" } },
          { pattern: LOOP_PATTERN, changes: { 0: "Fmaj7", 13: "G6" } },
        ];
  return {
    id: `demo-${sectionIndex}-strumming`,
    type: "chord",
    bpm: feature === "colors" ? 80 : 125,
    repetitions: feature === "colors" ? 2 : 1,
    data: sequences.map(({ pattern, changes }, sequenceIndex) => ({
      id: `demo-${sectionIndex}-sequence-${sequenceIndex}`,
      strummingPattern: pattern,
      bpm: -1,
      repetitions: 1,
      data: pattern.strums.map((_, index) => changes[index] ?? ""),
    })),
  };
}

export const DEMO_PATTERN: StrummingPattern = {
  id: "homepage-strumming-pattern",
  baseNoteLength: "eighth",
  strums: Array.from({ length: 8 }, (_, index) => ({
    palmMute: "",
    strum: index % 2 === 0 ? "v" : "^",
    noteLength: "eighth",
  })),
};

export function createDemoData(
  sectionIndex: number,
  feature: FeatureId,
): Section[] {
  const noteCount = feature === "autoscroll" ? 24 : 6;
  const notes = Array.from({ length: noteCount }, (_, index) => {
    const frets = ["", "", "", "", "", ""];
    frets[index % 6] = ["3", "2", "0", "0", "0", "3"][index % 6] ?? "0";
    return {
      ...createTabNote({
        firstString: frets[0],
        secondString: frets[1],
        thirdString: frets[2],
        fourthString: frets[3],
        fifthString: frets[4],
        sixthString: frets[5],
        noteLength: "quarter",
      }),
      id: `demo-${sectionIndex}-note-${index}`,
    };
  });
  const tab: TabSection = {
    id: `demo-${sectionIndex}-tab`,
    type: "tab",
    bpm: -1,
    repetitions: 1,
    baseNoteLength: "quarter",
    data: notes,
  };
  if (feature === "reordering") {
    // This pane uses consecutive indices so the native move controls have the
    // same first/last boundaries as the editor. Other demos reserve indices 10+.
    return ["Intro", "Chorus", "Bridge", "Outro"].map((title, index) => ({
      id: `demo-${sectionIndex}-section-${index}`,
      title,
      data: [
        {
          ...tab,
          id: `demo-${sectionIndex}-tab-${index}`,
          data: notes.map((note, noteIndex) => ({
            ...note,
            id: `demo-${sectionIndex}-section-${index}-note-${noteIndex}`,
          })),
        },
      ],
    }));
  }
  let subSection: TabSection | ChordSection = tab;
  if (feature === "zoom" || feature === "speed")
    subSection = createPracticeTab(sectionIndex, feature);
  else if (feature === "colors" || feature === "loop")
    subSection = createPracticeChords(sectionIndex, feature);
  // Existing editor focus IDs include sectionIndex. Reserve a distinct index
  // for each demo, including the outgoing crossfade and mobile neighbors.
  return Array.from({ length: sectionIndex + 1 }, (_, index) => ({
    id: `demo-${sectionIndex}-section-${index}`,
    title: "Verse",
    data: index === sectionIndex ? [subSection] : [],
  }));
}

let audibleDemoStore: ReturnType<typeof createTabStore> | null = null;

function createSession(
  sectionIndex: number,
  feature: FeatureId,
  parentStore: ReturnType<typeof createTabStore>,
) {
  const tabData = createDemoData(sectionIndex, feature);
  const subSection = tabData[sectionIndex]?.data[0];
  const practiceChords = feature === "colors" || feature === "loop";
  const store = createTabStore(
    {
      tabData,
      bpm: subSection && subSection.bpm !== -1 ? subSection.bpm : 120,
      tuning: feature === "zoom" ? "d2 a2 d3 f#3 b3 d4" : DEFAULT_TUNING,
      editing: feature !== "loop",
      looping: feature === "loop" || feature === "autoscroll",
      showPlaybackModal: feature === "loop",
      playbackSpeed: feature === "speed" ? 0.75 : 1,
      chordDisplayMode:
        feature === "colors" || feature === "loop" ? "color" : "text",
      chords: (practiceChords
        ? PRACTICE_CHORDS
        : CHORD_NAMES.map((name, index) => ({
            name,
            frets: FRETS[index] ?? [],
          }))
      ).map(({ name, frets }, index) => ({
        id: `demo-chord-${index}`,
        name,
        color: getColorForChordName(name) ?? "#46A758",
        frets,
      })),
      strummingPatterns:
        feature === "colors"
          ? [COLOR_PATTERN]
          : feature === "loop"
            ? [LOOP_INTRO_PATTERN, LOOP_PATTERN]
            : [DEMO_PATTERN],
      viewportLabel: "desktop",
    },
    () => {
      // This session has no progress slider. Leave the homepage player's DOM alone.
    },
  );
  let enabled = false;
  const ensureAudioSystemReady = store.getState().ensureAudioSystemReady;
  store.setState({
    ensureAudioSystemReady: async () => {
      if (!enabled) return null;
      parentStore.getState().pauseAudio();
      if (audibleDemoStore && audibleDemoStore !== store)
        audibleDemoStore.getState().pauseAudio();
      audibleDemoStore = store;
      const ready = await ensureAudioSystemReady();
      if (!enabled || audibleDemoStore !== store) return null;
      return ready;
    },
  });
  return {
    store,
    setEnabled: (value: boolean) => {
      enabled = value;
    },
  };
}

const FeatureDemoContext = createContext<{
  sectionIndex: number;
  feature: FeatureId;
  active: boolean;
}>({
  sectionIndex: 0,
  feature: "zoom",
  active: false,
});
export const useFeatureDemo = () => useContext(FeatureDemoContext);

export default function FeatureDemoSession({
  feature,
  surface,
  active,
  children,
}: {
  feature: FeatureId;
  surface: "desktop" | "mobile";
  active: boolean;
  children: ReactNode;
}) {
  const { color, theme } = useTabStore((state) => ({
    color: state.color,
    theme: state.theme,
  }));
  const parentStore = useTabStoreApi();
  const sectionIndex =
    (surface === "desktop" ? 10 : 30) + FEATURE_IDS.indexOf(feature);
  const [session] = useState(() =>
    createSession(sectionIndex, feature, parentStore),
  );

  useEffect(() => {
    session.store.setState({ color, theme });
  }, [session, color, theme]);
  useEffect(() => {
    session.setEnabled(active);
    return () => {
      session.setEnabled(false);
      session.store.getState().disposeAudioSystem();
      if (audibleDemoStore === session.store) audibleDemoStore = null;
    };
  }, [session, active]);

  return (
    <TabStoreContext.Provider value={session.store}>
      <FeatureDemoContext.Provider value={{ sectionIndex, feature, active }}>
        <div className={styles.demoRoot} data-feature-demo={feature}>
          {children}
        </div>
      </FeatureDemoContext.Provider>
    </TabStoreContext.Provider>
  );
}
