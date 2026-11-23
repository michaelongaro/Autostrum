import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { getTabStore } from "~/stores/TabStore";
import { initializeEmptyChordSequences } from "~/stores/tab/document";
import { ensureSectionProgression } from "~/utils/sectionProgression";
import type { TabDocument } from "~/utils/tabDocument";
import { normalizeTuningValue } from "~/utils/tunings";
import { updateElapsedSecondsInSectionProgression } from "~/utils/updateElapsedSecondsInSectionProgression";
import { emptyTabDocument } from "./draftDocument";

export { emptyTabDocument } from "./draftDocument";

function storedTabDocument(store: ReturnType<typeof getTabStore>): TabDocument {
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

export function getTabDocument(store = getTabStore()): TabDocument {
  const document = storedTabDocument(store);
  return {
    ...document,
    sectionProgression: ensureSectionProgression(
      document.tabData,
      document.sectionProgression,
    ),
  };
}

export function documentChanged(
  next: ReturnType<typeof getTabStore>,
  previous: ReturnType<typeof getTabStore>,
) {
  // Compare stored fields before normalizing: generating a fallback progression
  // during this check would make unrelated UI updates look like document edits.
  return (Object.keys(storedTabDocument(next)) as (keyof TabDocument)[]).some(
    (key) => next[key] !== previous[key],
  );
}

export function applyTabDocument(
  document: TabDocument,
  identity?: Parameters<ReturnType<typeof getTabStore>["loadDocument"]>[1],
) {
  getTabStore().loadDocument(
    {
      ...document,
      artistName: document.artistName,
      artistIsVerified: document.artistIsVerified ?? false,
    },
    identity,
  );
}

export function preparePublishedTab(tab?: TabWithArtistMetadata | null) {
  const identity = {
    id: tab?.id ?? -1,
    createdByUserId: tab?.createdByUserId ?? null,
    createdAt: tab?.createdAt ?? null,
    updatedAt: tab?.updatedAt ?? null,
    originalTabData: tab ? structuredClone(tab) : null,
  };
  if (!tab) {
    return { document: emptyTabDocument(), identity };
  }
  // Published JSON predates the draft format. Keep its existing hydration
  // behavior; strict validation belongs at draft storage/API boundaries.
  const document: TabDocument = {
    ...tab,
    artistName: tab.artistName,
    artistIsVerified: tab.artistIsVerified,
    tuning: normalizeTuningValue(tab.tuning),
    chords: tab.chords as unknown as TabDocument["chords"],
    strummingPatterns:
      tab.strummingPatterns as unknown as TabDocument["strummingPatterns"],
    tabData: structuredClone(tab.tabData) as unknown as TabDocument["tabData"],
    sectionProgression:
      tab.sectionProgression as unknown as TabDocument["sectionProgression"],
  };
  if (document.tabData.length === 0) {
    document.tabData = [
      { id: `empty-${tab.id}`, title: "Section 1", data: [] },
    ];
  }
  initializeEmptyChordSequences(document);
  document.sectionProgression =
    updateElapsedSecondsInSectionProgression({
      tabData: document.tabData,
      sectionProgression: ensureSectionProgression(
        document.tabData,
        document.sectionProgression,
      ),
      baselineBpm: document.bpm,
    }) ?? [];
  return { document, identity };
}

export function hydratePublishedTab(tab?: TabWithArtistMetadata | null) {
  const { document, identity } = preparePublishedTab(tab);
  applyTabDocument(document, identity);
}
