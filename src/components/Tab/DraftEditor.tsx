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
import { Button } from "~/components/ui/button";
import type { Tab } from "~/generated/browser";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { getTabStore, subscribeTabStore } from "~/stores/TabStore";
import { api, type RouterOutputs } from "~/utils/api";
import { DraftSession, errorCode } from "~/utils/drafts/DraftSession";
import {
  getActiveDraft,
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
import { clearTabForSignIn, readTabForSignIn } from "~/utils/tabSignInHandoff";

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
  if (!isLoaded || !router.isReady)
    return (
      <p className="p-6" role="status">
        Loading editor…
      </p>
    );
  return (
    <DraftEditorSession
      key={`${userId ?? "guest"}:${router.asPath}`}
      ownerId={userId ?? null}
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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let navigating = false;
    let unsubscribe: (() => void) | undefined;
    const sourceTabId = fetchedTab?.id ?? null;
    const route = sourceTabId ? `/tab/${sourceTabId}/edit` : "/create";

    async function initialize() {
      setLoadError(null);
      setReady(false);
      hydratePublishedTab(fetchedTab);
      getTabStore().setEditing(true);
      if (!ownerId) {
        setReady(true);
        return;
      }

      const local = readRecoveryRecords(ownerId);
      const requestedId =
        typeof router.query.draft === "string" ? router.query.draft : undefined;
      const requestedWriter =
        typeof router.query.recovery === "string"
          ? router.query.recovery
          : undefined;
      if (
        requestedId &&
        !recoveryRecordSchema.shape.id.safeParse(requestedId).success
      )
        throw new Error("This draft link is invalid.");

      // Visiting /create always starts fresh. Only an explicit draft link or
      // an edit route can resume an existing account draft.
      const active = requestedId || sourceTabId ? getActiveDraft(route) : null;
      const signInTab =
        !requestedId && sourceTabId === null ? readTabForSignIn() : null;
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

      if (!requestedId && !recovered && sourceTabId !== null)
        recovered = local.records.find(
          (record) => record.sourceTabId === sourceTabId,
        );

      let cloud: RouterOutputs["draft"]["get"] = null;
      let cloudUnavailable = false;
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
      }
      if (cancelled) return;

      if (requestedId && !recovered && !cloud)
        throw new Error(
          "This private draft is unavailable. Sign in to its owner account or open Drafts from My Tabs to find a recovery copy.",
        );

      let record = newRecoveryRecord(
        ownerId,
        signInTab?.document ?? getTabDocument(),
        sourceTabId,
        fetchedTab?.updatedAt.toISOString() ?? null,
      );
      let needsSave = !!signInTab;
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
            "A newer account version exists. Your local edits are preserved on this device.";
        } else if (
          !cloud &&
          !cloudUnavailable &&
          ownerId &&
          record.revision > 0
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
          } else {
            conflict =
              "This draft was published or discarded in another session. Your remaining edits are preserved on this device.";
          }
        }
      }

      if (record.sourceTabId !== sourceTabId) {
        throw new Error(
          "This draft belongs to a different tab. Open it from the Drafts dialog on My Tabs.",
        );
      }
      if (
        hasRecovery &&
        sourceTabId !== null &&
        record.baseUpdatedAt !== fetchedTab?.updatedAt.toISOString()
      ) {
        conflict =
          "The published tab has changed since this draft began. Your edits are preserved on this device.";
      }

      applying.current = true;
      applyTabDocument(record.document);
      applying.current = false;
      const session = new DraftSession({
        record,
        needsSave,
        hasRecovery,
        recovered: record.id === recovered?.id ? recovered : undefined,
        save: saveDraft,
        onState: (state) => {
          if (signInTab && state.status === "saved")
            clearTabForSignIn(signInTab);
        },
        onPersist: (snapshot) => {
          setActiveDraft(route, snapshot);
          if (signInTab) clearTabForSignIn(signInTab);
        },
      });
      sessionRef.current = session;
      session.start();
      if (conflict) session.block(conflict);
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
    if (!ownerId)
      return () => {
        cancelled = true;
      };
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

  if (loadError)
    return (
      <div
        className="flex w-full flex-col items-start gap-3 rounded-xl border bg-background p-6"
        role="alert"
      >
        <p>This tab could not be opened. Please try again.</p>
        <div className="flex gap-3">
          <Button onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/profile/tabs/filters">My tabs</Link>
          </Button>
        </div>
      </div>
    );
  if (!ready)
    return (
      <p className="p-6" role="status">
        Loading editor…
      </p>
    );

  if (!ownerId) return children;

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
              "The draft or published tab changed in another session. Your edits are preserved on this device.",
            );
        },
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}
