// Run with: node scripts/verifyEditorHistory.mjs
// Uses the production history implementation without adding a test framework.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import ts from "typescript";

async function importTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}

const { createEditorHistory } = await importTypeScript(
  "../src/utils/createEditorHistory.ts",
);
const { getEditorHistoryShortcut } = await importTypeScript(
  "../src/utils/editorHistoryShortcuts.ts",
);
const tick = () => Promise.resolve();
let checks = 0;

async function check(name, run) {
  await run();
  checks++;
  console.log(`PASS: ${name}`);
}

function setup(options = {}) {
  let status;
  const history = createEditorHistory({
    equals: isDeepStrictEqual,
    onChange: (next) => {
      status = next;
    },
    ...options,
  });
  return { history, status: () => status ?? history.availability() };
}

await check(
  "compound edits undo and redo atomically, including their references",
  async () => {
    const { history, status } = setup();
    const original = { chords: ["C"], section: ["C", "C"] };
    const intermediate = { chords: ["C"], section: ["", ""] };
    const deleted = { chords: [], section: intermediate.section };
    history.record(original, intermediate);
    history.record(intermediate, deleted);
    assert.equal(history.undo(deleted), original);
    assert.deepEqual(status(), { canUndo: false, canRedo: true });
    assert.equal(history.redo(original), deleted);
    assert.deepEqual(status(), { canUndo: true, canRedo: false });
    await tick();
  },
);

await check("continuous typing in one field is one action", async () => {
  const { history } = setup();
  const field = {};
  history.groupInput(field);
  history.record("", "C");
  await tick();
  history.groupInput(field);
  history.record("C", "Chorus");
  await tick();
  assert.equal(history.undo("Chorus"), "");
  assert.equal(history.redo(""), "Chorus");
});

await check(
  "different fields, pauses, focus changes, and structural actions split typing",
  async () => {
    let now = 0;
    const { history } = setup({ now: () => now });
    const title = {};
    const description = {};
    history.groupInput(title);
    history.record(0, 1);
    await tick();
    history.groupInput(description);
    history.record(1, 2);
    await tick();
    now += 1001;
    history.groupInput(description);
    history.record(2, 3);
    await tick();
    history.breakGroup();
    history.groupInput(description);
    history.record(3, 4);
    await tick();
    history.record(4, 5);
    await tick();
    for (let value = 5; value > 0; value--)
      assert.equal(history.undo(value), value - 1);
  },
);

await check("a new edit after undo clears redo", async () => {
  const { history } = setup();
  history.record("A", "B");
  await tick();
  history.record("B", "C");
  assert.equal(history.undo("C"), "B");
  history.record("B", "D");
  assert.equal(history.redo("D"), undefined);
  assert.equal(history.undo("D"), "B");
  assert.equal(history.undo("B"), "A");
});

await check(
  "no-op edits neither consume an undo step nor clear redo",
  async () => {
    const { history, status } = setup();
    history.record({ title: "" }, { title: "" });
    assert.equal(status().canUndo, false);
    history.record({ title: "" }, { title: "Verse" });
    const original = history.undo({ title: "Verse" });
    history.record(original, { ...original });
    assert.equal(status().canUndo, false);
    assert.equal(status().canRedo, true);
    await tick();
  },
);

await check("history retains only the latest 100 actions", async () => {
  const { history } = setup();
  for (let value = 0; value < 125; value++) {
    history.record(value, value + 1);
    await tick();
  }
  for (let value = 125; value > 25; value--)
    assert.equal(history.undo(value), value - 1);
  assert.equal(history.undo(25), undefined);
  for (let value = 25; value < 125; value++)
    assert.equal(history.redo(value), value + 1);
  assert.equal(history.redo(125), undefined);
});

await check(
  "clearing a session cancels pending batches and discards undo and redo",
  async () => {
    const { history, status } = setup();
    history.record("old", "edited");
    history.clear();
    history.record("new", "new edit");
    await tick();
    assert.equal(history.undo("new edit"), "new");
    assert.equal(history.undo("new"), undefined);
    history.clear();
    assert.deepEqual(status(), { canUndo: false, canRedo: false });
    assert.equal(history.redo("new"), undefined);
  },
);

await check("dialog draft history is isolated from the document", async () => {
  const document = setup().history;
  const draft = setup().history;
  document.record("original tab", "edited tab");
  draft.record("C", "Cm");
  await tick();
  assert.equal(draft.undo("Cm"), "C");
  draft.clear();
  assert.equal(document.undo("edited tab"), "original tab");
});

await check(
  "Ctrl/Cmd shortcuts include Shift+Z and Y and exclude Alt/composition/plain keys",
  () => {
    const event = {
      key: "z",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    };
    assert.equal(getEditorHistoryShortcut(event), "undo");
    assert.equal(
      getEditorHistoryShortcut({ ...event, ctrlKey: false, metaKey: true }),
      "undo",
    );
    assert.equal(
      getEditorHistoryShortcut({ ...event, key: "Z", shiftKey: true }),
      "redo",
    );
    assert.equal(getEditorHistoryShortcut({ ...event, key: "y" }), "redo");
    assert.equal(getEditorHistoryShortcut({ ...event, altKey: true }), null);
    assert.equal(
      getEditorHistoryShortcut({ ...event, isComposing: true }),
      null,
    );
    assert.equal(getEditorHistoryShortcut({ ...event, ctrlKey: false }), null);
  },
);

await check("typing and deleting form separate undo steps", async () => {
  const { history } = setup();
  const field = {};
  history.groupInput(field, "insertText");
  history.record("", "Verse");
  await tick();
  history.groupInput(field, "deleteContentBackward");
  history.record("Verse", "Vers");
  await tick();
  assert.equal(history.undo("Vers"), "Verse");
  assert.equal(history.undo("Verse"), "");
});

await check(
  "a compound action returning to its starting value leaves no empty step",
  async () => {
    const { history, status } = setup();
    history.record("A", "B");
    history.record("B", "A");
    assert.equal(status().canUndo, false);
    history.record("A", "C");
    await tick();
    assert.equal(history.undo("C"), "A");
    assert.equal(history.undo("A"), undefined);
  },
);

console.log(`All ${checks} editor history checks passed.`);
