import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState, type ReactNode } from "react";
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
import useDraftLibrary from "~/hooks/useDraftLibrary";
import { draftHref, formatDraftDate } from "~/utils/drafts/draftPresentation";
import {
  readRecoveryRecords,
  removeUnchangedRecoveryRecord,
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

export default function DraftsDialog() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded || !userId)
    return (
      <Button variant="secondary" className="ml-auto shrink-0" disabled>
        Drafts
      </Button>
    );

  return <AccountDraftsDialog key={userId} ownerId={userId} />;
}

function AccountDraftsDialog({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false);
  const library = useDraftLibrary(ownerId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="ml-auto shrink-0"
          disabled={!library.hasDrafts}
        >
          Drafts
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-5 overflow-y-auto rounded-lg">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>My drafts</DialogTitle>
          <DialogDescription>Continue working on your tabs.</DialogDescription>
        </DialogHeader>
        <DraftList ownerId={ownerId} library={library} />
      </DialogContent>
    </Dialog>
  );
}

function DraftList({
  ownerId,
  library,
}: {
  ownerId: string;
  library: ReturnType<typeof useDraftLibrary>;
}) {
  const utils = api.useContext();
  const { cloud, local, accountDrafts, recoveryCopies } = library;
  const discard = api.draft.discard.useMutation();
  const [target, setTarget] = useState<DiscardTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-0 flex-col gap-4">
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
          {accountDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              title={draft.title}
              date={draft.updatedAt.toISOString()}
            >
              <Button size="sm" asChild>
                <Link href={draftHref(draft)}>Continue editing</Link>
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
          {recoveryCopies.map((draft) => (
            <DraftCard
              key={`${draft.id}:${draft.writerId}`}
              title={draft.document.title}
              date={draft.updatedAt}
            >
              <Button size="sm" asChild>
                <Link href={draftHref(draft, draft.writerId)}>
                  Recover draft
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTarget({ kind: "local", draft })}
              >
                Discard
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
  children,
}: {
  title: string;
  date: string;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col items-start gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <h3 className="break-words font-semibold">
          {title || "Untitled draft"}
        </h3>
        <p className="mt-1 text-sm text-foreground/60">
          <time dateTime={date}>{formatDraftDate(date)}</time>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </article>
  );
}
