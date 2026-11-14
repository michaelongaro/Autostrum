// Run with: node scripts/verifyDraftEditorChanges.mjs
// Exercise the real store subscription, undo/redo, and draft coordinator.
import assert from "node:assert/strict";
import "./lib/registerTypeScript.mjs";

const { createTabStore } = await import("../src/stores/TabStore.ts");
const { documentChanged, getTabDocument, emptyTabDocument } =
  await import("../src/utils/drafts/tabDraftState.ts");
const { isDefaultTabDocument } =
  await import("../src/utils/drafts/draftDocument.ts");
const { DraftSession } = await import("../src/utils/drafts/DraftSession.ts");
const { newRecoveryRecord, recoveryKey } =
  await import("../src/utils/drafts/draftStorage.ts");

const pristine = emptyTabDocument();
const store = createTabStore({ ...pristine, editing: true }, () => {});
const local = new Map();
const requests = [];
const session = new DraftSession({
  record: newRecoveryRecord("owner", getTabDocument(store.getState())),
  hasRecovery: false,
  needsSave: false,
  debounceMs: 60_000,
  save: async (input) => {
    requests.push(input);
    return {
      revision: isDefaultTabDocument(input.document)
        ? 0
        : input.expectedRevision + 1,
      updatedAt: new Date(),
    };
  },
  write: (record) => {
    local.set(recoveryKey(record), structuredClone(record));
    return true;
  },
  remove: (record) => local.delete(recoveryKey(record)),
});
session.start();
const unsubscribe = store.subscribe((next, previous) => {
  if (documentChanged(next, previous)) session.update(getTabDocument(next));
});

try {
  store.getState().setViewportLabel("desktop");
  store.getState().setEditing(false);
  store.getState().setEditing(true);
  store.getState().setDescription("");
  // An absent progression must not make every unrelated UI update an edit.
  const withoutProgression = { ...store.getState(), sectionProgression: [] };
  assert.equal(
    documentChanged(withoutProgression, {
      ...withoutProgression,
      editing: false,
    }),
    false,
  );
  await session.flush();
  assert.equal(requests.length, 0);
  assert.equal(local.size, 0);

  store.getState().setTitle("A new idea");
  await Promise.resolve();
  assert.equal(local.size, 1, "actual typing immediately creates recovery");
  store.getState().undo();
  await session.flush();
  assert.equal(
    requests.length,
    0,
    "undo before autosave never reaches the account",
  );
  assert.equal(local.size, 0);
  store.getState().redo();
  await session.flush();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].document.title, "A new idea");

  store.getState().setSectionProgression(
    store.getState().sectionProgression.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      startSeconds: 10,
      endSeconds: 20,
    })),
    { recordHistory: false },
  );
  await session.flush();
  assert.equal(requests.length, 1, "playback timing updates do not autosave");

  store.getState().setTitle("");
  await session.flush();
  assert.equal(requests.length, 2);
  assert.equal(
    local.size,
    0,
    "resetting a saved tab removes its browser draft",
  );

  store.getState().setTabData((sections) => {
    sections.push({ id: crypto.randomUUID(), title: "Section 2", data: [] });
  });
  assert.equal(local.size, 1, "an added empty section is still authored work");
  store.getState().setTabData((sections) => {
    sections.splice(1, 1);
  });
  await session.flush();
  assert.equal(requests.length, 2);
  assert.equal(local.size, 0);
  console.log(
    "PASS: real editor subscription ignores defaults/UI/timings, saves edits, and handles undo/redo and section resets",
  );
} finally {
  unsubscribe();
  session.dispose();
}
