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
import { createTabNote } from "~/utils/tabNoteHelpers";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";
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
  surface: "desktop" | "mobile" = "desktop",
): Section[] {
  let noteCount = 6;
  if (feature === "autoscroll") noteCount = 24;
  else if (feature === "zoom" || feature === "speed") {
    noteCount = surface === "mobile" ? 6 : 12;
  }
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
  const strumming: ChordSection = {
    id: `demo-${sectionIndex}-strumming`,
    type: "chord",
    bpm: -1,
    repetitions: 1,
    data: [
      {
        id: `demo-${sectionIndex}-sequence`,
        strummingPattern: DEMO_PATTERN,
        bpm: -1,
        repetitions: 1,
        data: ["G", "", "C", "", "Em", "", "D", ""],
      },
    ],
  };
  // Existing editor focus IDs include sectionIndex. Reserve a distinct index
  // for each demo, including the outgoing crossfade and mobile neighbors.
  return Array.from({ length: sectionIndex + 1 }, (_, index) => ({
    id: `demo-${sectionIndex}-section-${index}`,
    title: "Verse",
    data:
      index === sectionIndex
        ? [feature === "colors" || feature === "loop" ? strumming : tab]
        : [],
  }));
}

let audibleDemoStore: ReturnType<typeof createTabStore> | null = null;

function createSession(
  sectionIndex: number,
  feature: FeatureId,
  parentStore: ReturnType<typeof createTabStore>,
  surface: "desktop" | "mobile",
) {
  const store = createTabStore(
    {
      tabData: createDemoData(sectionIndex, feature, surface),
      bpm: 120,
      editing: feature !== "loop",
      looping: feature === "loop" || feature === "autoscroll",
      showPlaybackModal: feature === "loop",
      playbackSpeed: feature === "speed" ? 0.75 : 1,
      chordDisplayMode:
        feature === "colors" || feature === "loop" ? "color" : "text",
      chords: CHORD_NAMES.map((name, index) => ({
        id: `demo-chord-${index}`,
        name,
        color: getColorForChordName(name) ?? "#46A758",
        frets: FRETS[index] ?? [],
      })),
      strummingPatterns: [DEMO_PATTERN],
      viewportLabel: "desktop",
    },
    () => {
      // This session has no progress slider. Leave the homepage player's DOM alone.
    },
  );
  let enabled = false;
  let loadingInstrument: ReturnType<typeof ensureSoundfontPlayer> | null = null;
  const emptyInstruments = store.getState().instruments;
  const ensureAudioSystemReady = store.getState().ensureAudioSystemReady;
  store.setState({
    ensureAudioSystemReady: async () => {
      if (!enabled) return null;
      parentStore.getState().pauseAudio();
      if (audibleDemoStore && audibleDemoStore !== store)
        audibleDemoStore.getState().pauseAudio();
      audibleDemoStore = store;
      let state = store.getState();
      if (!state.audioContext || state.audioContext.state === "closed") {
        const audioContext = new AudioContext();
        const masterVolumeGainNode = audioContext.createGain();
        masterVolumeGainNode.connect(audioContext.destination);
        store.setState({
          audioContext,
          masterVolumeGainNode,
          currentInstrument: null,
          instruments: emptyInstruments,
        });
        loadingInstrument = null;
        state = store.getState();
      }
      const { audioContext, masterVolumeGainNode, currentInstrumentName } =
        state;
      if (!audioContext || !masterVolumeGainNode) return null;
      // Resume within the user gesture; load the real guitar only on demand.
      if (audioContext.state === "suspended") await audioContext.resume();
      if (!state.currentInstrument) {
        loadingInstrument ??= ensureSoundfontPlayer(
          audioContext,
          currentInstrumentName,
          masterVolumeGainNode,
        );
        try {
          const player = await loadingInstrument;
          if (
            !enabled ||
            audibleDemoStore !== store ||
            audioContext.state === "closed"
          ) {
            if (audioContext.state !== "closed") await audioContext.close();
            return null;
          }
          store.setState({
            currentInstrument: player,
            instruments: {
              ...emptyInstruments,
              [currentInstrumentName]: player,
            },
          });
        } catch (error) {
          loadingInstrument = null;
          throw error;
        }
      }
      if (!enabled || audibleDemoStore !== store) return null;
      return ensureAudioSystemReady();
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
    createSession(sectionIndex, feature, parentStore, surface),
  );

  useEffect(() => {
    session.store.setState({ color, theme });
  }, [session, color, theme]);
  useEffect(() => {
    session.setEnabled(active);
    return () => {
      session.setEnabled(false);
      session.store.getState().pauseAudio();
      const context = session.store.getState().audioContext;
      if (context && context.state !== "closed")
        void context.close().catch(() => undefined);
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
