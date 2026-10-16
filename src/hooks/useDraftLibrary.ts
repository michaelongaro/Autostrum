import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import {
  DRAFTS_CHANGED_EVENT,
  readRecoveryRecords,
} from "~/utils/drafts/draftStorage";

export default function useDraftLibrary(ownerId: string) {
  const cloud = api.draft.list.useQuery(
    { ownerId },
    { retry: 1, refetchOnMount: "always" },
  );
  const [local, setLocal] = useState<ReturnType<typeof readRecoveryRecords>>({
    records: [],
    unreadable: 0,
    available: true,
  });

  useEffect(() => {
    const refresh = () => {
      setLocal(readRecoveryRecords(ownerId));
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(DRAFTS_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(DRAFTS_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [ownerId]);

  const accountDrafts = cloud.data ?? [];
  const accountIds = new Set(accountDrafts.map((draft) => draft.id));
  const recoveryCopies = local.records.filter(
    (record) => !record.synced || !accountIds.has(record.id),
  );

  return {
    cloud,
    local,
    accountDrafts,
    recoveryCopies,
    hasDrafts: accountDrafts.length > 0 || recoveryCopies.length > 0,
  };
}
