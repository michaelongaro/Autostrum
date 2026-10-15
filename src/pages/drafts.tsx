import { useAuth } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { api, type RouterOutputs } from "~/utils/api";
import {
  DRAFTS_CHANGED_EVENT,
  exportRecoveryRecords,
  migrateLegacyDraft,
  newRecoveryRecord,
  readRecoveryRecords,
  recoveryRecordSchema,
  removeUnchangedRecoveryRecord,
  writeRecoveryRecord,
  type RecoveryRecord,
} from "~/utils/drafts/draftStorage";
import { tabDocumentSchema } from "~/utils/tabDocument";

type CloudDraft = RouterOutputs["draft"]["list"][number];
type DiscardTarget =
  | { kind: "cloud"; draft: CloudDraft }
  | { kind: "local"; draft: RecoveryRecord };

function draftHref(
  draft: { id: string; sourceTabId: number | null },
  writerId?: string,
  copy = false,
) {
  const path =
    draft.sourceTabId !== null && !copy
      ? `/tab/${draft.sourceTabId}/edit`
      : "/create";
  const query = new URLSearchParams({ draft: draft.id });
  if (writerId) query.set("recovery", writerId);
  if (copy) query.set("copy", "1");
  return `${path}?${query.toString()}`;
}

export default function Drafts() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const ownerId = isLoaded ? (userId ?? null) : null;
  const utils = api.useContext();
  const cloud = api.draft.list.useQuery(
    { ownerId: ownerId ?? "guest" },
    {
      enabled: isLoaded && !!userId,
      retry: 1,
    },
  );
  const discard = api.draft.discard.useMutation();
  const [local, setLocal] = useState<ReturnType<typeof readRecoveryRecords>>({
    records: [],
    unreadable: 0,
    available: true,
  });
  const [target, setTarget] = useState<DiscardTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showGuest, setShowGuest] = useState(false);
  const [guestRecords, setGuestRecords] = useState<RecoveryRecord[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    migrateLegacyDraft();
    const refresh = () => {
      setLocal(readRecoveryRecords(ownerId));
      if (ownerId) setGuestRecords(readRecoveryRecords(null).records);
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
  }, [isLoaded, ownerId]);

  const accountDrafts = userId ? (cloud.data ?? []) : [];
  const recoveryCopies = local.records.filter(
    (record) =>
      !record.synced || !accountDrafts.some((draft) => draft.id === record.id),
  );

  async function discardSelected() {
    if (!target) return;
    setError(null);
    try {
      if (target.kind === "cloud") {
        await discard.mutateAsync({
          id: target.draft.id,
          expectedRevision: target.draft.revision,
        });
        for (const record of readRecoveryRecords(ownerId).records) {
          if (
            record.id === target.draft.id &&
            record.synced &&
            record.revision <= target.draft.revision
          )
            removeUnchangedRecoveryRecord(record);
        }
        await utils.draft.list.invalidate();
      } else {
        const current = readRecoveryRecords(ownerId).records.find(
          (record) =>
            record.id === target.draft.id &&
            record.writerId === target.draft.writerId,
        );
        if (current?.mutationId !== target.draft.mutationId)
          throw new Error(
            "This recovery copy changed in another tab. Refresh before discarding it.",
          );
        removeUnchangedRecoveryRecord(target.draft);
      }
      setTarget(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The draft could not be discarded. Your recovery copies have been kept.",
      );
      void utils.draft.list.invalidate();
      setTarget(null);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      if (file.size > 10_000_000)
        throw new Error("Choose a backup smaller than 10 MB.");
      const value: unknown = JSON.parse(await file.text());
      const values: unknown[] = [value];
      if (typeof value === "object" && value !== null)
        values.push(...Object.values(value as Record<string, unknown>));
      const documents = new Map<
        string,
        ReturnType<typeof tabDocumentSchema.parse>
      >();
      for (const candidate of values) {
        let parsed: unknown = candidate;
        if (typeof candidate === "string") {
          try {
            parsed = JSON.parse(candidate) as unknown;
          } catch {
            continue;
          }
        }
        const record = recoveryRecordSchema.safeParse(parsed);
        const document = tabDocumentSchema.safeParse(
          record.success ? record.data.document : parsed,
        );
        if (document.success)
          documents.set(JSON.stringify(document.data), document.data);
      }
      if (!documents.size)
        throw new Error(
          "No readable Autostrum drafts were found in that backup.",
        );
      let imported = 0;
      for (const document of documents.values()) {
        if (writeRecoveryRecord(newRecoveryRecord(ownerId, document)))
          imported++;
      }
      if (imported !== documents.size)
        throw new Error(
          `${imported} drafts imported. Browser storage is full or unavailable; keep your backup and retry after freeing space.`,
        );
      setNotice(
        `${imported} draft${imported === 1 ? "" : "s"} imported as private recovery copies. Open a copy to continue editing${userId ? " and sync it to your account" : ""}.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The backup could not be imported. Keep the original file and try again.",
      );
    }
  }

  function importGuest(record: RecoveryRecord) {
    const copy = newRecoveryRecord(ownerId, record.document);
    if (!writeRecoveryRecord(copy)) {
      setError(
        "Browser storage is unavailable. Download a backup of the guest draft before continuing.",
      );
      return;
    }
    void router.push(draftHref(copy, copy.writerId));
  }

  return (
    <div className="my-12 flex min-h-[650px] w-full max-w-5xl flex-col gap-6 px-4 md:my-24 md:w-[85%] md:px-0">
      <Head>
        <title>My drafts | Autostrum</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
            <LockKeyhole aria-hidden="true" className="size-6" />
            My drafts
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            Drafts are private. Publishing is always a separate action.
          </p>
        </div>
        <Button
          onClick={() => void router.push(`/create?new=${crypto.randomUUID()}`)}
        >
          New draft
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInput.current?.click()}
        >
          Import backup
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import draft backup"
          onChange={importBackup}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!exportRecoveryRecords(ownerId))
              setError("Browser backups could not be read.");
          }}
        >
          Export browser backups
        </Button>
        {userId && guestRecords.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGuest((value) => !value)}
          >
            {showGuest ? "Hide" : "Show"} drafts saved while signed out
          </Button>
        )}
      </div>
      {!userId && isLoaded && (
        <p className="rounded-lg border bg-background p-4 text-sm">
          These drafts are saved in this browser. Sign in while editing a draft
          to sync it to your account and continue on another device.
        </p>
      )}
      {(!local.available || local.unreadable > 0) && (
        <p role="alert" className="text-sm">
          Some browser recovery copies could not be read. They have been
          preserved. Export browser backups to keep the original data.
        </p>
      )}
      {cloud.isError && userId && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-4 text-sm"
        >
          Account drafts could not be loaded. Browser recovery copies are still
          available.
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void cloud.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {(!isLoaded || (userId && cloud.isLoading)) && (
        <p role="status">Loading your drafts…</p>
      )}
      {accountDrafts.length > 0 && (
        <section aria-label="Account drafts" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Saved to your account</h2>
          {accountDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              title={draft.title}
              date={draft.updatedAt.toISOString()}
              label={
                draft.sourceTabId
                  ? "Private changes to a published tab"
                  : "Private draft"
              }
            >
              <Button size="sm" asChild>
                <Link href={draftHref(draft)}>Continue editing</Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href={draftHref(draft, undefined, true)}>
                  Recover as new tab
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTarget({ kind: "cloud", draft })}
              >
                Discard
              </Button>
            </DraftCard>
          ))}
        </section>
      )}
      {recoveryCopies.length > 0 && (
        <section
          aria-label="Browser recovery copies"
          className="flex flex-col gap-3"
        >
          <h2 className="text-lg font-semibold">On this device</h2>
          <p className="text-sm text-foreground/70">
            Recovery copies keep work safe through connection problems and
            interrupted sessions.
          </p>
          {recoveryCopies.map((draft) => (
            <DraftCard
              key={`${draft.id}:${draft.writerId}`}
              title={draft.document.title}
              date={draft.updatedAt}
              label={draft.synced ? "Browser backup" : "Local recovery copy"}
            >
              <Button size="sm" asChild>
                <Link href={draftHref(draft, draft.writerId)}>
                  Recover draft
                </Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href={draftHref(draft, draft.writerId, true)}>
                  Recover as new tab
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTarget({ kind: "local", draft })}
              >
                Discard copy
              </Button>
            </DraftCard>
          ))}
        </section>
      )}
      {showGuest && userId && (
        <section aria-label="Guest drafts" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Saved while signed out</h2>
          {guestRecords.map((draft) => (
            <DraftCard
              key={`${draft.id}:${draft.writerId}`}
              title={draft.document.title}
              date={draft.updatedAt}
              label="Guest draft on this device"
            >
              <Button size="sm" onClick={() => importGuest(draft)}>
                Copy to my drafts
              </Button>
            </DraftCard>
          ))}
        </section>
      )}
      {isLoaded &&
        (!userId || cloud.isSuccess) &&
        accountDrafts.length === 0 &&
        recoveryCopies.length === 0 && (
          <div className="rounded-xl border bg-background p-8 text-center">
            <p className="font-semibold">No drafts yet</p>
            <p className="mt-2 text-sm text-foreground/70">
              Start a tab and your edits will be saved automatically, even
              before you add a title.
            </p>
          </div>
        )}
      <AlertDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open && !discard.isLoading) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Discard{" "}
              {target?.kind === "local"
                ? "this recovery copy"
                : "this private draft"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.kind === "local"
                ? "This removes the selected browser copy. Account drafts and other recovery copies are kept."
                : "This removes the account draft and its synced browser copies. Unsynced recovery copies and the published tab are kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="secondary"
              disabled={discard.isLoading}
              onClick={() => setTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={discard.isLoading}
              onClick={discardSelected}
            >
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DraftCard({
  title,
  date,
  label,
  children,
}: {
  title: string;
  date: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-background p-4">
      <div className="min-w-0 flex-1">
        <h3 className="break-words font-semibold">
          {title || "Untitled draft"}
        </h3>
        <p className="mt-1 text-sm text-foreground/60">
          {label} ·{" "}
          <time dateTime={date}>{new Date(date).toLocaleString()}</time>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </article>
  );
}
