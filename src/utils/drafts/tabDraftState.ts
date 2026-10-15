import { getTabStore } from "~/stores/TabStore";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import type { TabDocument } from "~/utils/tabDocument";
import { DEFAULT_TUNING } from "~/utils/tunings";
import { updateElapsedSecondsInSectionProgression } from "~/utils/updateElapsedSecondsInSectionProgression";

export function emptyTabDocument(): TabDocument {
  return {
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
    chords: [],
    strummingPatterns: [],
    sectionProgression: [],
    tabData: [{ id: crypto.randomUUID(), title: "Section 1", data: [] }],
  };
}

export function getTabDocument(store = getTabStore()): TabDocument {
  return {
    title: store.title,
    artistId: store.artistId,
    artistName: store.artistName,
    artistIsVerified: store.artistIsVerified,
    description: store.description,
    genre: store.genre,
    tuning: store.tuning,
    bpm: store.bpm,
    capo: store.capo,
    key: store.key,
    difficulty: store.difficulty,
    chords: store.chords,
    strummingPatterns: store.strummingPatterns,
    sectionProgression: store.sectionProgression,
    tabData: store.tabData,
  };
}

export function documentChanged(
  next: ReturnType<typeof getTabStore>,
  previous: ReturnType<typeof getTabStore>,
) {
  const a = getTabDocument(next);
  const b = getTabDocument(previous);
  return (Object.keys(a) as (keyof TabDocument)[]).some(
    (key) => a[key] !== b[key],
  );
}

export function applyTabDocument(document: TabDocument) {
  const store = getTabStore();
  store.pauseAudio(true);
  store.setTitle(document.title);
  store.setArtistId(document.artistId);
  store.setArtistName(document.artistName);
  store.setArtistIsVerified(document.artistIsVerified ?? false);
  store.setDescription(document.description);
  store.setGenre(document.genre);
  store.setTuning(document.tuning);
  store.setBpm(document.bpm);
  store.setCapo(document.capo);
  store.setKey(document.key);
  store.setDifficulty(document.difficulty);
  store.setChords(document.chords);
  store.setStrummingPatterns(document.strummingPatterns);
  store.setTabData((draft) => {
    draft.splice(0, draft.length, ...document.tabData);
  });
  store.setSectionProgression(document.sectionProgression);
  // Loading a published tab, recovery copy, or account version starts a new
  // history session; hydration itself must not become an undoable edit.
  store.clearEditorHistory();
}

export function hydratePublishedTab(tab?: TabWithArtistMetadata | null) {
  const store = getTabStore();
  store.setId(tab?.id ?? -1);
  store.setCreatedByUserId(tab?.createdByUserId ?? null);
  store.setCreatedAt(tab?.createdAt ?? null);
  store.setUpdatedAt(tab?.updatedAt ?? null);
  store.setOriginalTabData(tab ? structuredClone(tab) : null);
  if (!tab) {
    applyTabDocument(emptyTabDocument());
    return;
  }
  // Published JSON predates the draft format. Keep its existing hydration
  // behavior; strict validation belongs at draft storage/API boundaries.
  const document: TabDocument = {
    ...tab,
    artistName: tab.artistName,
    artistIsVerified: tab.artistIsVerified,
    chords: tab.chords as unknown as TabDocument["chords"],
    strummingPatterns:
      tab.strummingPatterns as unknown as TabDocument["strummingPatterns"],
    tabData: tab.tabData as unknown as TabDocument["tabData"],
    sectionProgression:
      tab.sectionProgression as unknown as TabDocument["sectionProgression"],
  };
  document.sectionProgression =
    updateElapsedSecondsInSectionProgression({
      tabData: document.tabData,
      sectionProgression: document.sectionProgression ?? [],
      baselineBpm: document.bpm,
    }) ?? [];
  applyTabDocument(document);
}
