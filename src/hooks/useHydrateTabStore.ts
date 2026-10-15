import { useEffect } from "react";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { hydratePublishedTab } from "~/utils/drafts/tabDraftState";

/** Public views hydrate only published data. Draft recovery belongs to DraftEditor. */
export function useHydrateTabStore({
  fetchedTab,
}: {
  fetchedTab?: TabWithArtistMetadata | null;
}) {
  const id = fetchedTab?.id;
  const updatedAt = fetchedTab?.updatedAt.getTime();
  useEffect(() => {
    hydratePublishedTab(fetchedTab);
    // The serialized page props may be parsed again during a parent render.
    // The published version, rather than object identity, determines hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, updatedAt]);
}
