import { useEffect, useMemo } from "react";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { useTabStoreApi } from "~/stores/TabStore";
import {
  applyTabDocument,
  preparePublishedTab,
} from "~/utils/drafts/tabDraftState";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";

export function useHydrateTabStore(tab: TabWithArtistMetadata) {
  const store = useTabStoreApi();
  const { document, identity } = useMemo(() => preparePublishedTab(tab), [tab]);
  useEffect(() => {
    applyTabDocument(document, identity);
  }, [document, identity]);

  return useMemo(() => {
    const initialState = {
      ...store.getInitialState(),
      ...document,
      ...identity,
      artistIsVerified: document.artistIsVerified ?? false,
      tabIsEffectivelyEmpty: tabIsEffectivelyEmpty(document.tabData),
    };
    const updatedAt = identity.updatedAt?.getTime();

    // Render the same tab during SSR and while the shared session switches
    // routes. Playback actions and subscriptions still belong to that session.
    return {
      getInitialState: () => initialState,
      getState: () => {
        const state = store.getState();
        return state.id === identity.id &&
          state.updatedAt?.getTime() === updatedAt
          ? state
          : initialState;
      },
      subscribe: store.subscribe,
    };
  }, [document, identity, store]);
}
