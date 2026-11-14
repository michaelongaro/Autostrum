import { ensureSectionProgression } from "~/utils/sectionProgression";
import type { TabDocument } from "~/utils/tabDocument";
import { DEFAULT_TUNING } from "~/utils/tunings";

const defaultMetadata = {
  title: "",
  artistId: null,
  artistName: undefined,
  artistIsVerified: false,
  description: null,
  genre: "",
  tuning: DEFAULT_TUNING,
  bpm: 75,
  capo: 0,
  key: null,
  difficulty: 1,
} satisfies Partial<TabDocument>;

export function emptyTabDocument(): TabDocument {
  const tabData = [{ id: crypto.randomUUID(), title: "Section 1", data: [] }];
  return {
    ...defaultMetadata,
    chords: [],
    strummingPatterns: [],
    sectionProgression: ensureSectionProgression(tabData, []),
    tabData,
  };
}

function draftMetadata(document: TabDocument) {
  return {
    title: document.title,
    artistId: document.artistId,
    artistName: document.artistName || undefined,
    artistIsVerified: document.artistIsVerified ?? false,
    description: document.description || null,
    genre: document.genre,
    tuning: document.tuning,
    bpm: document.bpm,
    capo: document.capo,
    key: document.key,
    difficulty: document.difficulty,
  };
}

/** Defaults are scaffolding, not a draft. Incomplete user edits still count. */
export function isDefaultTabDocument(document: TabDocument): boolean {
  if (
    JSON.stringify(draftMetadata(document)) !==
      JSON.stringify(defaultMetadata) ||
    document.chords.length > 0 ||
    document.strummingPatterns.length > 0 ||
    document.tabData.length !== 1
  )
    return false;

  const section = document.tabData[0]!;
  if (section.title !== "Section 1" || section.data.length > 0) return false;

  const progression = document.sectionProgression;
  return (
    progression.length === 0 ||
    (progression.length === 1 &&
      progression[0]!.sectionId === section.id &&
      progression[0]!.title === section.title &&
      progression[0]!.repetitions === 1)
  );
}

/** Playback timings and generated progression IDs are not authored edits. */
export function serializeDraftDocument(document: TabDocument): string {
  if (isDefaultTabDocument(document)) return "default";
  return JSON.stringify({
    ...draftMetadata(document),
    chords: document.chords,
    strummingPatterns: document.strummingPatterns,
    tabData: document.tabData,
    sectionProgression: ensureSectionProgression(
      document.tabData,
      document.sectionProgression,
    ).map(({ sectionId, title, repetitions }) => ({
      sectionId,
      title,
      repetitions,
    })),
  });
}
