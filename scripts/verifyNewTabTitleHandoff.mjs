// Run: node scripts/verifyNewTabTitleHandoff.mjs
// No shared database or browser session is used.
import assert from "node:assert/strict";
import "./lib/registerTypeScript.mjs";

const { saveNewTabTitle, readNewTabTitle, clearNewTabTitle } =
  await import("../src/utils/newTabTitleHandoff.ts");
const { emptyTabDocument } =
  await import("../src/utils/drafts/draftDocument.ts");
const { newRecoveryRecord } =
  await import("../src/utils/drafts/draftStorage.ts");
const { DraftSession } = await import("../src/utils/drafts/DraftSession.ts");

const originalWindow = globalThis.window;
const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
};

try {
  assert.equal(readNewTabTitle(), null);
  saveNewTabTitle("  Wish You Were Here  ");
  const snapshot = readNewTabTitle();
  assert.equal(snapshot.title, "Wish You Were Here");

  // The initial prefilled document must be persisted even before the user types.
  const requests = [];
  const copies = [];
  const session = new DraftSession({
    record: newRecoveryRecord("owner", {
      ...emptyTabDocument(),
      title: snapshot.title,
    }),
    needsSave: true,
    hasRecovery: false,
    write: (record) => {
      copies.push(structuredClone(record));
      return true;
    },
    save: async (input) => {
      requests.push(input);
      return { revision: 1, updatedAt: new Date() };
    },
  });
  try {
    session.start();
    clearNewTabTitle(snapshot);
    assert.equal(readNewTabTitle(), null, "handoff is consumed once");
    assert.equal(copies[0].document.title, "Wish You Were Here");
    await session.flush();
    assert.equal(requests[0].document.title, "Wish You Were Here");
  } finally {
    session.dispose();
  }

  saveNewTabTitle("A newer song");
  clearNewTabTitle(snapshot);
  assert.equal(readNewTabTitle().title, "A newer song");
  saveNewTabTitle("x".repeat(80));
  assert.equal(readNewTabTitle().title.length, 50);
  saveNewTabTitle("   ");
  assert.equal(readNewTabTitle(), null);

  globalThis.window.localStorage = {
    getItem() {
      throw new Error("Storage blocked");
    },
    setItem() {
      throw new Error("Storage full");
    },
    removeItem() {
      throw new Error("Storage blocked");
    },
  };
  assert.doesNotThrow(() => saveNewTabTitle("Still opens create"));
  assert.equal(readNewTabTitle(), null);
  assert.doesNotThrow(() => clearNewTabTitle(snapshot));
  console.log(
    "PASS: one-time song title handoff, initial draft persistence, title limit, newer handoff preservation, and unavailable storage",
  );
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
}
