import type { DraftReference, TabDocument } from "~/utils/tabDocument";
import {
  newRecoveryRecord,
  recoveryKey,
  removeRecoveryRecord,
  removeUnchangedRecoveryRecord,
  writeRecoveryRecord,
  type RecoveryRecord,
} from "./draftStorage";

export interface SaveDraftInput {
  id: string;
  mutationId: string;
  expectedRevision: number;
  sourceTabId: number | null;
  baseUpdatedAt: Date | null;
  document: TabDocument;
}
export interface DraftSaveState {
  status:
    "idle" | "saving" | "saved" | "local" | "error" | "conflict" | "published";
  message: string;
  localSaved: boolean;
  updatedAt: string | null;
}

export function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("data" in error))
    return undefined;
  const data = error.data;
  return typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof data.code === "string"
    ? data.code
    : undefined;
}

interface SessionOptions {
  record: RecoveryRecord;
  needsSave: boolean;
  hasRecovery: boolean;
  save: (
    input: SaveDraftInput,
  ) => Promise<{ revision: number; updatedAt: Date }>;
  onState?: (state: DraftSaveState) => void;
  onPersist?: (record: RecoveryRecord) => void;
  recovered?: RecoveryRecord;
  write?: typeof writeRecoveryRecord;
  remove?: typeof removeRecoveryRecord;
  retire?: typeof removeUnchangedRecoveryRecord;
  debounceMs?: number;
  retryMs?: number;
}

/** One writer, one recovery key, one request at a time. No React or route state. */
export class DraftSession {
  record: RecoveryRecord;
  private dirty: boolean;
  private localSaved = false;
  private blocked = false;
  private disposed = false;
  private published = false;
  private serialized: string;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private maxTimer: ReturnType<typeof setTimeout> | undefined;
  private inFlight: Promise<void> | null = null;
  private retryCount = 0;
  private recovered: RecoveryRecord | undefined;
  private state: DraftSaveState;

  constructor(private readonly options: SessionOptions) {
    this.record = options.record;
    this.dirty = options.needsSave;
    this.serialized = JSON.stringify(this.record.document);
    this.recovered = options.recovered;
    this.state = {
      status: "idle",
      message: "Your edits will be saved privately.",
      localSaved: false,
      updatedAt: null,
    };
  }

  start() {
    if (this.options.hasRecovery || this.dirty) this.persist();
    if (this.dirty) this.schedule();
    this.report(
      this.record.synced ? "saved" : this.localSaved ? "local" : "idle",
    );
  }

  update(document: TabDocument) {
    if (this.disposed || this.published) return;
    const serialized = JSON.stringify(document);
    if (serialized === this.serialized) return;
    this.serialized = serialized;
    this.record = {
      ...this.record,
      document,
      mutationId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    this.dirty = true;
    this.persist();
    if (this.blocked) this.report("conflict", this.state.message);
    else this.report("saving");
    this.schedule();
  }

  private persist() {
    this.localSaved = (this.options.write ?? writeRecoveryRecord)(this.record);
    if (this.localSaved) {
      this.options.onPersist?.(this.record);
      if (
        this.recovered &&
        recoveryKey(this.recovered) !== recoveryKey(this.record)
      ) {
        (this.options.retire ?? removeUnchangedRecoveryRecord)(this.recovered);
        this.recovered = undefined;
      }
    }
  }

  private report(status: DraftSaveState["status"], message?: string) {
    const messages = {
      idle: "Your edits will be saved privately.",
      saving: "Saving private draft…",
      saved: "Private draft saved to your account.",
      local: "Saved on this device. Waiting to sync to your account.",
      error:
        "Account sync failed. Your recovery copy is saved on this device; autosave will retry.",
      conflict:
        "Another session changed this draft. Choose a version before syncing.",
      published: "Published successfully.",
    };
    this.state = {
      status,
      message:
        !this.localSaved && this.dirty && status !== "saved"
          ? "Browser recovery is unavailable. Keep this page open until your draft syncs."
          : (message ?? messages[status]),
      localSaved: this.localSaved,
      updatedAt: this.record.updatedAt,
    };
    if (!this.disposed) this.options.onState?.(this.state);
  }

  private clearTimers() {
    clearTimeout(this.timer);
    clearTimeout(this.maxTimer);
    this.timer = undefined;
    this.maxTimer = undefined;
  }

  private schedule() {
    if (this.disposed || this.blocked || this.published) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flush();
    }, this.options.debounceMs ?? 1200);
    this.maxTimer ??= setTimeout(() => {
      void this.flush();
    }, 5000);
  }

  async flush(): Promise<void> {
    this.clearTimers();
    if (this.inFlight) {
      await this.inFlight;
      if (
        this.dirty &&
        !this.blocked &&
        !this.disposed &&
        this.state.status !== "error"
      )
        await this.flush();
      return;
    }
    if (!this.dirty || this.blocked || this.disposed || this.published) return;
    this.inFlight = this.savePending().finally(() => {
      this.inFlight = null;
    });
    await this.inFlight;
  }

  private async savePending() {
    while (this.dirty && !this.blocked && !this.disposed) {
      const snapshot = this.record;
      this.report("saving");
      try {
        const result = await this.options.save({
          id: snapshot.id,
          mutationId: snapshot.mutationId,
          expectedRevision: snapshot.revision,
          sourceTabId: snapshot.sourceTabId,
          baseUpdatedAt: snapshot.baseUpdatedAt
            ? new Date(snapshot.baseUpdatedAt)
            : null,
          document: snapshot.document,
        });
        this.retryCount = 0;
        this.dirty = this.record.mutationId !== snapshot.mutationId;
        this.record = {
          ...this.record,
          revision: result.revision,
          synced: !this.dirty,
        };
        this.persist();
        this.report(this.dirty ? "saving" : "saved");
      } catch (error) {
        const code = errorCode(error);
        if (code === "CONFLICT" || code === "NOT_FOUND") {
          this.block(
            "This draft changed or was removed in another session. Your work is preserved on this device.",
          );
        } else {
          this.report("error");
          if (!this.disposed) {
            const delay =
              this.options.retryMs ??
              Math.min(30_000, 2000 * 2 ** this.retryCount++);
            this.timer = setTimeout(() => {
              void this.flush();
            }, delay);
          }
        }
        return;
      }
    }
  }

  block(message: string) {
    this.blocked = true;
    this.clearTimers();
    this.report("conflict", message);
  }

  retry() {
    if (this.dirty) this.persist();
    this.report(this.state.status);
    void this.flush();
  }

  async preparePublication(): Promise<DraftReference | undefined> {
    await this.flush();
    if (this.dirty || this.blocked || this.disposed || this.published) {
      throw new Error(
        "Sync your private draft or resolve its recovery conflict before publishing.",
      );
    }
    return this.record.revision > 0
      ? { id: this.record.id, revision: this.record.revision }
      : undefined;
  }

  completePublication(tab: { id: number; updatedAt: Date }) {
    this.clearTimers();
    (this.options.remove ?? removeRecoveryRecord)(this.record);
    this.dirty = false;
    this.localSaved = false;
    if (this.record.sourceTabId === null) {
      this.published = true;
      this.report("published");
    } else {
      this.record = newRecoveryRecord(
        this.record.ownerId,
        this.record.document,
        tab.id,
        tab.updatedAt.toISOString(),
      );
      this.options.onPersist?.(this.record);
      this.report(
        "idle",
        "Changes published. Further edits will be saved as a private draft.",
      );
    }
  }

  needsUnloadWarning() {
    return this.dirty && !this.localSaved;
  }
  dispose() {
    this.disposed = true;
    this.clearTimers();
  }
}
