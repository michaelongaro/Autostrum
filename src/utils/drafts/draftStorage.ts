import { z } from "zod";
import { tabDocumentSchema, type TabDocument } from "~/utils/tabDocument";

export const DRAFT_STORAGE_PREFIX = "autostrum:drafts:v1:";
export const DRAFTS_CHANGED_EVENT = "autostrum:drafts-changed";

export const recoveryRecordSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  writerId: z.string().uuid(),
  ownerId: z.string().min(1),
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

function ownerPrefix(ownerId: string) {
  return `${DRAFT_STORAGE_PREFIX}${encodeURIComponent(ownerId)}:`;
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
  if (!record.ownerId) return false;
  try {
    window.localStorage.setItem(recoveryKey(record), JSON.stringify(record));
    notifyDraftsChanged();
    return true;
  } catch {
    return false;
  }
}

export function readRecoveryRecords(ownerId: string) {
  const records: RecoveryRecord[] = [];
  let unreadable = 0;
  if (!ownerId) return { records, unreadable, available: true };
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
        // Leave damaged/unknown records intact so they remain available for recovery.
        unreadable++;
      }
    }
    records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
  ownerId: string,
  document: TabDocument,
  sourceTabId: number | null = null,
  baseUpdatedAt: string | null = null,
): RecoveryRecord {
  if (!ownerId) throw new Error("An account is required to save a draft.");
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
