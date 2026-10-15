import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
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
  migrateLegacyDraft,
  newRecoveryRecord,
  readRecoveryRecords,
  removeUnchangedRecoveryRecord,
  writeRecoveryRecord,
  type RecoveryRecord,
} from "~/utils/drafts/draftStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

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

export default function DraftsDialog() {
  const { isLoaded, userId } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="ml-auto shrink-0">
          Drafts
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-5 overflow-y-auto rounded-lg">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>My drafts</DialogTitle>
          <DialogDescription>
            Continue working on your private drafts.
          </DialogDescription>
        </DialogHeader>
        {open &&
          (isLoaded && userId ? (
            <DraftList key={userId} ownerId={userId} />
          ) : (
            <p role="status">
              {isLoaded
                ? "Sign in to view your drafts."
                : "Loading your drafts..."}
            </p>
          ))}
      </DialogContent>
    </Dialog>
  );
}

function DraftList({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const utils = api.useContext();
  const cloud = api.draft.list.useQuery(
    { ownerId },
    {
      retry: 1,
      refetchOnMount: "always",
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
  const [showGuest, setShowGuest] = useState(false);
  const [guestRecords, setGuestRecords] = useState<RecoveryRecord[]>([]);

  useEffect(() => {
    migrateLegacyDraft();
    const refresh = () => {
      setLocal(readRecoveryRecords(ownerId));
      setGuestRecords(readRecoveryRecords(null).records);
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

  function importGuest(record: RecoveryRecord) {
    const copy = newRecoveryRecord(ownerId, record.document);
    if (!writeRecoveryRecord(copy)) {
      setError(
        "Browser storage is unavailable. Your guest draft has been kept; retry when storage is available.",
      );
      return;
    }
    void router.push(draftHref(copy, copy.writerId));
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {guestRecords.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGuest((value) => !value)}
          >
            {showGuest ? "Hide" : "Show"} drafts saved while signed out
          </Button>
        )}
        <Button
          className="ml-auto"
          size="sm"
          onClick={() => void router.push(`/create?new=${crypto.randomUUID()}`)}
        >
          New draft
        </Button>
      </div>
      {(!local.available || local.unreadable > 0) && (
        <p role="alert" className="text-sm">
          Some browser recovery copies could not be read. They have been
          preserved. Retry after browser storage becomes available.
        </p>
      )}
      {cloud.isError && (
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
      {cloud.isLoading && <p role="status">Loading your drafts...</p>}
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
              label={
                draft.synced ? "Saved on this device" : "Local recovery copy"
              }
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
      {showGuest && (
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
      {cloud.isSuccess &&
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
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col items-start gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
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
