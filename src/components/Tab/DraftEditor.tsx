import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { Tab } from "~/generated/browser";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { getTabStore, subscribeTabStore } from "~/stores/TabStore";
import { api, type RouterOutputs } from "~/utils/api";
import {
  DraftSession,
  errorCode,
  type DraftSaveState,
} from "~/utils/drafts/DraftSession";
import {
  downloadRecovery,
  getActiveDraft,
  migrateLegacyDraft,
  newRecoveryRecord,
  readRecoveryRecords,
  recoveryRecordSchema,
  setActiveDraft,
  type RecoveryRecord,
} from "~/utils/drafts/draftStorage";
import {
  applyTabDocument,
  documentChanged,
  getTabDocument,
  hydratePublishedTab,
} from "~/utils/drafts/tabDraftState";
import { tabDocumentSchema, type DraftReference } from "~/utils/tabDocument";

interface DraftActions {
  preparePublication: () => Promise<DraftReference | undefined>;
  completePublication: (tab: Tab) => void;
  publicationFailed: (error: unknown) => void;
}
const DraftContext = createContext<DraftActions | null>(null);
export const useDraftActions = () => useContext(DraftContext);

function cloudRecord(
  draft: NonNullable<RouterOutputs["draft"]["get"]>,
): RecoveryRecord {
  return {
    version: 1,
    id: draft.id,
    writerId: crypto.randomUUID(),
    ownerId: draft.ownerId,
    sourceTabId: draft.sourceTabId,
    baseUpdatedAt: draft.baseUpdatedAt?.toISOString() ?? null,
    revision: draft.revision,
    mutationId: draft.lastMutationId,
    updatedAt: draft.updatedAt.toISOString(),
    synced: true,
    document: draft.document,
  };
}

export default function DraftEditor({
  fetchedTab,
  children,
}: {
  fetchedTab?: TabWithArtistMetadata;
  children: ReactNode;
}) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  if (!router.isReady)
    return (
      <p className="p-6" role="status">
        Loading private drafts…
      </p>
    );
  return (
    <DraftEditorSession
      key={`${isLoaded ? (userId ?? "guest") : "guest"}:${router.asPath}`}
      ownerId={isLoaded ? (userId ?? null) : null}
      fetchedTab={fetchedTab}
    >
      {children}
    </DraftEditorSession>
  );
}

function DraftEditorSession({
  ownerId,
  fetchedTab,
  children,
}: {
  ownerId: string | null;
  fetchedTab?: TabWithArtistMetadata;
  children: ReactNode;
}) {
  const router = useRouter();
  const utils = api.useContext();
  const { mutateAsync: saveDraft } = api.draft.save.useMutation({
    retry: false,
  });
  const sessionRef = useRef<DraftSession | null>(null);
  const applying = useRef(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [availableDraftCount, setAvailableDraftCount] = useState(0);
  const [saveState, setSaveState] = useState<DraftSaveState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let navigating = false;
    let unsubscribe: (() => void) | undefined;
    const sourceTabId = fetchedTab?.id ?? null;
    const route = sourceTabId
      ? `/tab/${sourceTabId}/edit`
      : `/create${typeof router.query.new === "string" ? `:new:${router.query.new}` : ""}`;

    async function initialize() {
      setLoadError(null);
      setReady(false);
      hydratePublishedTab(fetchedTab);
      getTabStore().setEditing(true);
      const migrated = migrateLegacyDraft();

      const local = readRecoveryRecords(ownerId);
      setAvailableDraftCount(local.records.length);
      if (!local.available || local.unreadable)
        setWarning(
          "Some browser recovery data could not be read. Existing copies have been kept; you can export them from My drafts.",
        );
      const requestedId =
        typeof router.query.draft === "string" ? router.query.draft : undefined;
      const requestedWriter =
        typeof router.query.recovery === "string"
          ? router.query.recovery
          : undefined;
      const makeCopy = router.query.copy === "1";
      if (
        requestedId &&
        !recoveryRecordSchema.shape.id.safeParse(requestedId).success
      )
        throw new Error("This draft link is invalid.");

      const active = getActiveDraft(route);
      let recovered = requestedId
        ? (local.records.find(
            (record) =>
              record.id === requestedId &&
              (!requestedWriter || record.writerId === requestedWriter),
          ) ??
          local.records.find(
            (record) =>
              record.id === requestedId &&
              active?.ownerId === ownerId &&
              record.writerId === active.writerId,
          ) ??
          local.records.find((record) => record.id === requestedId))
        : active?.ownerId === ownerId
          ? local.records.find(
              (record) =>
                record.id === active.id && record.writerId === active.writerId,
            )
          : undefined;

      // Only the guest draft active in this browser tab follows a sign-in redirect.
      // A signed-out account draft is never handed to another account or a guest.
      let guestHandoff = false;
      if (
        !requestedId &&
        !recovered &&
        ownerId &&
        active?.ownerId === null &&
        sourceTabId === null
      ) {
        recovered = readRecoveryRecords(null).records.find(
          (record) =>
            record.id === active.id && record.writerId === active.writerId,
        );
        guestHandoff = !!recovered;
      }
      if (
        !requestedId &&
        !recovered &&
        ownerId === null &&
        migrated &&
        !router.query.new
      )
        recovered = migrated;
      if (!requestedId && !recovered && sourceTabId !== null)
        recovered = local.records.find(
          (record) => record.sourceTabId === sourceTabId,
        );

      let cloud: RouterOutputs["draft"]["get"] = null;
      let cloudUnavailable = false;
      if (ownerId && !guestHandoff) {
        try {
          const id = requestedId ?? recovered?.id;
          cloud = id
            ? await utils.draft.get.fetch({ id, ownerId })
            : sourceTabId
              ? await utils.draft.forTab.fetch({ sourceTabId, ownerId })
              : null;
        } catch {
          cloudUnavailable = true;
          if (requestedId && !recovered)
            throw new Error(
              "Your account draft could not be loaded. Reconnect and retry; your saved draft has not been changed.",
            );
          setWarning(
            "Account drafts are temporarily unavailable. Browser recovery will keep saving your edits while account sync retries.",
          );
        }
      }
      if (cancelled) return;

      if (requestedId && !recovered && !cloud)
        throw new Error(
          "This private draft is unavailable. Sign in to its owner account or open My drafts to find a recovery copy.",
        );

      let record = newRecoveryRecord(
        ownerId,
        getTabDocument(),
        sourceTabId,
        fetchedTab?.updatedAt.toISOString() ?? null,
      );
      let needsSave = false;
      let conflict: string | null = null;
      let hasRecovery = !!recovered || !!cloud;
      const sameDocument =
        recovered && cloud
          ? JSON.stringify(tabDocumentSchema.parse(recovered.document)) ===
            JSON.stringify(cloud.document)
          : false;

      if (cloud && (!recovered || recovered.synced || sameDocument)) {
        record = cloudRecord(cloud);
      } else if (recovered) {
        record = { ...recovered, writerId: crypto.randomUUID() };
        needsSave = !recovered.synced;
        if (cloud && cloud.revision !== recovered.revision) {
          conflict =
            "A newer account version exists. Your local edits are preserved. Load the account version or recover these edits as a separate draft.";
        } else if (
          !cloud &&
          !cloudUnavailable &&
          ownerId &&
          record.revision > 0 &&
          !makeCopy
        ) {
          if (record.synced) {
            // A completed/discarded draft must not silently reappear after reload.
            record = newRecoveryRecord(
              ownerId,
              getTabDocument(),
              sourceTabId,
              fetchedTab?.updatedAt.toISOString() ?? null,
            );
            hasRecovery = false;
            needsSave = false;
            setWarning(
              "That draft was already published or discarded. Other recovery copies remain available in My drafts.",
            );
          } else {
            conflict =
              "This draft was published or discarded in another session. Recover your remaining edits as a separate draft.";
          }
        }
      }

      if (
        guestHandoff ||
        makeCopy ||
        (record.sourceTabId !== null && sourceTabId === null && hasRecovery)
      ) {
        record = newRecoveryRecord(ownerId, record.document);
        needsSave = true;
        conflict = null;
      } else if (sourceTabId !== null && record.sourceTabId !== sourceTabId) {
        throw new Error(
          "This draft belongs to a different tab. Open it from My drafts.",
        );
      }
      if (
        hasRecovery &&
        sourceTabId !== null &&
        record.baseUpdatedAt !== fetchedTab?.updatedAt.toISOString()
      ) {
        conflict =
          "The published tab has changed since this draft began. Your draft is preserved; recover it as a new tab to keep both versions.";
      }

      applying.current = true;
      applyTabDocument(record.document);
      applying.current = false;
      const session = new DraftSession({
        record,
        needsSave,
        hasRecovery,
        recovered:
          record.id === recovered?.id || guestHandoff ? recovered : undefined,
        save: ownerId ? saveDraft : null,
        onState: (state) => {
          if (!cancelled)
            setSaveState((previous) =>
              previous?.status === state.status &&
              previous.message === state.message &&
              previous.localSaved === state.localSaved
                ? previous
                : state,
            );
        },
        onPersist: (snapshot) => setActiveDraft(route, snapshot),
      });
      sessionRef.current = session;
      session.start();
      if (conflict) session.block(conflict);
      setRestored(hasRecovery);
      unsubscribe = subscribeTabStore((next, previous) => {
        if (!navigating && !applying.current && documentChanged(next, previous))
          session.update(getTabDocument(next));
      });
      setReady(true);
    }

    void initialize().catch((error: unknown) => {
      if (!cancelled)
        setLoadError(
          error instanceof Error
            ? error.message
            : "Draft recovery failed. Your saved copies have been kept.",
        );
    });
    const retry = () => sessionRef.current?.retry();
    const pageHide = () => sessionRef.current?.retry();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (sessionRef.current?.needsUnloadWarning()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const visibilityChange = () => {
      if (document.visibilityState === "hidden") pageHide();
    };
    // The layout resets the global tab store during navigation, sometimes while
    // the outgoing editor is still animating. Never autosave that reset.
    const routeChangeStart = () => {
      navigating = true;
      pageHide();
    };
    const routeChangeError = () => {
      navigating = false;
    };
    router.events.on("routeChangeStart", routeChangeStart);
    router.events.on("routeChangeError", routeChangeError);
    window.addEventListener("online", retry);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      cancelled = true;
      unsubscribe?.();
      sessionRef.current?.dispose();
      router.events.off("routeChangeStart", routeChangeStart);
      router.events.off("routeChangeError", routeChangeError);
      window.removeEventListener("online", retry);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
    // The keyed session owns a fixed account, route, and published base version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  async function loadCloudVersion() {
    const session = sessionRef.current;
    if (!session || !ownerId) return;
    setResolving(true);
    try {
      const draft = await utils.draft.get.fetch({
        id: session.record.id,
        ownerId,
      });
      if (!draft)
        throw new Error(
          "The account draft is no longer available. Recover your edits as a new draft.",
        );
      if (
        fetchedTab &&
        draft.baseUpdatedAt?.getTime() !== fetchedTab.updatedAt.getTime()
      ) {
        throw new Error(
          "This draft is based on an older published tab. Recover it as a new draft, or reopen the published tab from My drafts.",
        );
      }
      applying.current = true;
      applyTabDocument(draft.document);
      applying.current = false;
      session.replaceWithCloud(cloudRecord(draft));
      setWarning(null);
    } catch (error) {
      setWarning(
        error instanceof Error
          ? error.message
          : "The account draft could not be loaded.",
      );
    } finally {
      setResolving(false);
    }
  }

  function recoverAsCopy() {
    const session = sessionRef.current;
    if (!session) return;
    const copy = session.fork();
    void router.push(`/create?draft=${copy.id}&recovery=${copy.writerId}`);
  }

  if (loadError)
    return (
      <div
        className="flex w-full flex-col items-start gap-3 rounded-xl border bg-background p-6"
        role="alert"
      >
        <p>{loadError}</p>
        <div className="flex gap-3">
          <Button onClick={() => setAttempt((value) => value + 1)}>
            Retry recovery
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/drafts">My drafts</Link>
          </Button>
        </div>
      </div>
    );
  if (!ready)
    return (
      <p className="p-6" role="status">
        Recovering your private draft…
      </p>
    );

  return (
    <DraftContext.Provider
      value={{
        preparePublication: async () => {
          const session = sessionRef.current!;
          session.update(getTabDocument());
          return session.preparePublication();
        },
        completePublication: (tab) => {
          sessionRef.current?.completePublication(tab);
          void utils.draft.list.invalidate();
        },
        publicationFailed: (error) => {
          if (errorCode(error) === "CONFLICT")
            sessionRef.current?.block(
              "The draft or published tab changed in another session. Your recovery copy is preserved; recover it as a new draft to keep both versions.",
            );
        },
      }}
    >
      <div className="mb-4 flex w-full flex-col gap-3 px-4 md:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/80 px-4 py-3 text-sm">
          <div
            className="flex min-w-0 items-start gap-2"
            role="status"
            aria-live="polite"
          >
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <div>
              <p>{saveState?.message}</p>
              {restored && (
                <p className="mt-1 text-foreground/60">
                  Draft recovered. Your work stays private until you publish or
                  save changes to the public tab.
                </p>
              )}
              {!restored && availableDraftCount > 0 && (
                <p className="mt-1 text-foreground/60">
                  Saved drafts are available on this device. Open My drafts to
                  recover earlier work.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(saveState?.status === "error" ||
              (saveState &&
                !saveState.localSaved &&
                saveState.status !== "idle")) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => sessionRef.current?.retry()}
              >
                Retry autosave
              </Button>
            )}
            <Button size="sm" variant="secondary" asChild>
              <Link href="/drafts">My drafts</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => downloadRecovery(sessionRef.current?.record)}
            >
              Download backup
            </Button>
          </div>
        </div>
        {saveState?.status === "conflict" && (
          <div
            className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/50 bg-background p-4 text-sm"
            role="alert"
          >
            <p className="w-full">
              Both versions are kept. Choose how to continue:
            </p>
            {ownerId && (
              <Button
                size="sm"
                variant="secondary"
                disabled={resolving}
                onClick={loadCloudVersion}
              >
                Load account version
              </Button>
            )}
            <Button size="sm" disabled={resolving} onClick={recoverAsCopy}>
              Recover my edits as a new draft
            </Button>
          </div>
        )}
        {warning && (
          <p role="alert" className="text-sm text-foreground/75">
            {warning}
          </p>
        )}
      </div>
      {children}
    </DraftContext.Provider>
  );
}
