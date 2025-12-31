import { useEffect, useRef } from "react";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { useTabStore, type Section } from "~/stores/TabStore";
import { tuningNotes } from "~/utils/tunings";

export interface LocalStorageTabData {
  title: string;
  artistId: number | null;
  artistName?: string;
  artistIsVerified?: boolean;
  description: string | null;
  genre: string;
  tuning: string;
  bpm: number;
  capo: number;
  key: string | null;
  difficulty: number;
  chords: unknown[];
  strummingPatterns: unknown[];
  tabData: Section[];
  sectionProgression: unknown[];
}

interface UseHydrateTabStoreOptions {
  fetchedTab?: TabWithArtistMetadata | null;
  setCustomTuning?: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Hook to hydrate the TabStore from either localStorage (draft recovery) or fetched tab data.
 *
 * Priority:
 * 1. If localStorage has draft data AND we're on the /create page (no tab), restore from localStorage
 * 2. Otherwise, hydrate from the fetched tab data
 * 3. If neither, initialize with default empty state (/create page)
 *
 * This hook should be called at the page level (create.tsx, edit.tsx, [title].tsx)
 * to ensure the store is hydrated before any child components render.
 */
export function useHydrateTabStore({
  fetchedTab,
  setCustomTuning,
}: UseHydrateTabStoreOptions) {
  const {
    setId,
    setCreatedByUserId,
    setCreatedAt,
    setUpdatedAt,
    setTitle,
    setArtistId,
    setArtistName,
    setArtistIsVerified,
    setDescription,
    setGenre,
    setTuning,
    setBpm,
    setCapo,
    setKey,
    setDifficulty,
    setChords,
    setStrummingPatterns,
    setSectionProgression,
    setTabData,
    setEditing,
    setOriginalTabData,
  } = useTabStore((state) => ({
    setId: state.setId,
    setCreatedByUserId: state.setCreatedByUserId,
    setCreatedAt: state.setCreatedAt,
    setUpdatedAt: state.setUpdatedAt,
    setTitle: state.setTitle,
    setArtistId: state.setArtistId,
    setArtistName: state.setArtistName,
    setArtistIsVerified: state.setArtistIsVerified,
    setDescription: state.setDescription,
    setGenre: state.setGenre,
    setTuning: state.setTuning,
    setBpm: state.setBpm,
    setCapo: state.setCapo,
    setKey: state.setKey,
    setDifficulty: state.setDifficulty,
    setChords: state.setChords,
    setStrummingPatterns: state.setStrummingPatterns,
    setSectionProgression: state.setSectionProgression,
    setTabData: state.setTabData,
    setEditing: state.setEditing,
    setOriginalTabData: state.setOriginalTabData,
  }));

  useEffect(() => {
    const localStorageTabData = localStorage.getItem("autostrum-tabData");

    const shouldRestoreFromLocalStorage = !fetchedTab && localStorageTabData;

    const tab = shouldRestoreFromLocalStorage
      ? (JSON.parse(localStorageTabData as string) as LocalStorageTabData)
      : fetchedTab;

    if (!tab) return;

    if (!shouldRestoreFromLocalStorage && fetchedTab) {
      setOriginalTabData(structuredClone(fetchedTab));
    }

    if (tab) {
      if (!shouldRestoreFromLocalStorage) {
        // @ts-expect-error asdf
        setId(tab.id);
        // @ts-expect-error asdf
        setCreatedByUserId(tab.createdByUserId);
        // @ts-expect-error asdf
        setCreatedAt(tab.createdAt);
        // @ts-expect-error asdf
        setUpdatedAt(tab.updatedAt);
      }

      setTitle(tab.title);
      setArtistId(tab.artistId);
      setArtistName(tab.artistName);
      setArtistIsVerified(tab.artistIsVerified);
      setDescription(tab.description);
      setGenre(tab.genre);
      setTuning(tab.tuning);
      setBpm(tab.bpm);
      setCapo(tab.capo);
      setKey(tab.key);
      setDifficulty(tab.difficulty);

      // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
      setChords(tab.chords);
      // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
      setStrummingPatterns(tab.strummingPatterns);
      setTabData((draft) => {
        // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
        draft.splice(0, draft.length, ...tab.tabData);
      });
      // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
      setSectionProgression(tab.sectionProgression ?? []);

      // Set custom tuning if applicable
      if (setCustomTuning) {
        setCustomTuning(tuningNotes.includes(tab.tuning) ? null : tab.tuning);
      }

      localStorage.removeItem("autostrum-tabData");
    }
  }, [
    fetchedTab,
    setCustomTuning,
    setId,
    setCreatedByUserId,
    setCreatedAt,
    setUpdatedAt,
    setTitle,
    setArtistId,
    setArtistName,
    setArtistIsVerified,
    setDescription,
    setGenre,
    setTuning,
    setBpm,
    setCapo,
    setKey,
    setDifficulty,
    setChords,
    setStrummingPatterns,
    setSectionProgression,
    setTabData,
    setEditing,
    setOriginalTabData,
  ]);
}
