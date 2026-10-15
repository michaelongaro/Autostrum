import { z } from "zod";
import { tabDocumentSchema, type TabDocument } from "~/utils/tabDocument";

export const DRAFT_STORAGE_PREFIX = "autostrum:drafts:v1:";
export const DRAFTS_CHANGED_EVENT = "autostrum:drafts-changed";
export const LEGACY_DRAFT_KEY = "autostrum-tabData";

export const recoveryRecordSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  writerId: z.string().uuid(),
  ownerId: z.string().nullable(),
  sourceTabId: z.number().int().positive().nullable(),
  baseUpdatedAt: z.string().datetime().nullable(),
  revision: z.number().int().min(0),
  mutationId: z.string().uuid(),
  updatedAt: z.string().datetime(),
  synced: z.boolean(),
  document: tabDocumentSchema,
});
export type RecoveryRecord = Omit<
  z.infer<typeof recoveryRecordSchema>,
  "document"
> & { document: TabDocument };

function ownerPrefix(ownerId: string | null) {
  return `${DRAFT_STORAGE_PREFIX}${encodeURIComponent(ownerId ?? "guest")}:`;
}

export function recoveryKey(
  record: Pick<RecoveryRecord, "id" | "writerId" | "ownerId">,
) {
  return `${ownerPrefix(record.ownerId)}${record.id}:${record.writerId}`;
}

function notifyDraftsChanged() {
  window.dispatchEvent(new Event(DRAFTS_CHANGED_EVENT));
}

export function writeRecoveryRecord(record: RecoveryRecord): boolean {
  try {
    window.localStorage.setItem(recoveryKey(record), JSON.stringify(record));
    notifyDraftsChanged();
    return true;
  } catch {
    return false;
  }
}

export function readRecoveryRecords(ownerId: string | null) {
  const records: RecoveryRecord[] = [];
  let unreadable = 0;
  try {
    const prefix = ownerPrefix(ownerId);
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const raw: unknown = JSON.parse(
          window.localStorage.getItem(key) ?? "null",
        );
        const record = recoveryRecordSchema.parse(raw);
        if (record.ownerId !== ownerId || recoveryKey(record) !== key)
          throw new Error("Invalid draft key");
        records.push(record);
      } catch {
        // Leave damaged/unknown records intact so an export can still recover them.
        unreadable++;
      }
    }
    records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (ownerId === null) {
      const legacy = window.localStorage.getItem(LEGACY_DRAFT_KEY);
      if (legacy) {
        try {
          tabDocumentSchema.parse(JSON.parse(legacy) as unknown);
        } catch {
          unreadable++;
        }
      }
    }
    return { records, unreadable, available: true };
  } catch {
    return { records, unreadable, available: false };
  }
}

export function removeRecoveryRecord(record: RecoveryRecord) {
  try {
    window.localStorage.removeItem(recoveryKey(record));
    notifyDraftsChanged();
    return true;
  } catch {
    return false;
  }
}

export function removeUnchangedRecoveryRecord(record: RecoveryRecord) {
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(recoveryKey(record)) ?? "null",
    );
    const current = recoveryRecordSchema.safeParse(raw);
    if (current.success && current.data.mutationId === record.mutationId)
      removeRecoveryRecord(record);
  } catch {
    /* Keep the original whenever its identity cannot be verified. */
  }
}

export function setActiveDraft(route: string, record: RecoveryRecord) {
  try {
    window.sessionStorage.setItem(
      `autostrum:active-draft:${route}`,
      JSON.stringify({
        id: record.id,
        ownerId: record.ownerId,
        writerId: record.writerId,
      }),
    );
  } catch {
    /* Recovery also works through the drafts library. */
  }
}

export function getActiveDraft(
  route: string,
): Pick<RecoveryRecord, "id" | "ownerId" | "writerId"> | null {
  try {
    const value: unknown = JSON.parse(
      window.sessionStorage.getItem(`autostrum:active-draft:${route}`) ??
        "null",
    );
    return recoveryRecordSchema
      .pick({ id: true, ownerId: true, writerId: true })
      .parse(value);
  } catch {
    return null;
  }
}

export function newRecoveryRecord(
  ownerId: string | null,
  document: TabDocument,
  sourceTabId: number | null = null,
  baseUpdatedAt: string | null = null,
): RecoveryRecord {
  return {
    version: 1,
    id: crypto.randomUUID(),
    writerId: crypto.randomUUID(),
    ownerId,
    sourceTabId,
    baseUpdatedAt,
    revision: 0,
    mutationId: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    synced: false,
    document,
  };
}

/** The old single snapshot has no owner metadata, so migrate it only as a guest. */
export function migrateLegacyDraft() {
  try {
    const raw = window.localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!raw) return null;
    const document = tabDocumentSchema.parse(JSON.parse(raw) as unknown);
    const record = newRecoveryRecord(null, document);
    if (writeRecoveryRecord(record)) {
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
      return record;
    }
  } catch {
    /* Preserve the original if parsing or storage fails. */
  }
  return null;
}

export function downloadRecovery(
  document: unknown,
  filename = "autostrum-draft.json",
) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
  );
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportRecoveryRecords(ownerId: string | null) {
  const raw: Record<string, string | null> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (
        key?.startsWith(ownerPrefix(ownerId)) ||
        (ownerId === null && key === LEGACY_DRAFT_KEY)
      ) {
        raw[key] = window.localStorage.getItem(key);
      }
    }
    downloadRecovery(raw, "autostrum-recovery-backup.json");
  } catch {
    return false;
  }
  return true;
}
