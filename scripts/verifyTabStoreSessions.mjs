// Run with: node scripts/verifyTabStoreSessions.mjs
// Exercise production stores and histories without a browser or database.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    let url;
    if (specifier.startsWith("~/")) {
      url = new URL(specifier.slice(2), sourceRoot);
    } else if (specifier.startsWith(".")) {
      url = new URL(specifier, context.parentURL);
    }
    if (url?.href.startsWith(sourceRoot.href)) {
      for (const suffix of ["", ".ts", ".tsx", ".js"]) {
        const candidate = new URL(url.href + suffix);
        if (existsSync(candidate)) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot.href) && /\.tsx?$/.test(url)) {
      const { outputText } = ts.transpileModule(
        readFileSync(new URL(url), "utf8"),
        {
          fileName: new URL(url).pathname,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
          },
        },
      );
      return { format: "module", source: outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { createTabStore, getTabStore } =
  await import("../src/stores/TabStore.ts");
const { getHoveredChordLocationValue } =
  await import("../src/utils/hoveredChordLocation.ts");
const globalDocument = getTabStore();
const hoveredChord = { sectionIndex: 0, subSectionIndex: 0, chordIndex: 0 };
globalDocument.setHoveredChordLocation(hoveredChord);
const first = createTabStore({ editing: true, title: "First demo" }, () => {});
const second = createTabStore(
  { editing: true, title: "Second demo" },
  () => {},
);

first.getState().setHoveredChordLocation(null);
assert.equal(getHoveredChordLocationValue(), hoveredChord);
first.getState().setTitle("First edit");
await Promise.resolve();
second.getState().setTitle("Second edit");
await Promise.resolve();
assert.equal(first.getState().canUndo, true);
assert.equal(second.getState().canUndo, true);
assert.equal(
  getTabStore(),
  globalDocument,
  "Demo edits leave the global store untouched",
);

first.getState().undo();
assert.equal(first.getState().title, "First demo");
assert.equal(first.getState().canUndo, false);
assert.equal(first.getState().canRedo, true);
assert.equal(second.getState().title, "Second edit");
assert.equal(second.getState().canUndo, true);
assert.equal(second.getState().canRedo, false);
assert.equal(getHoveredChordLocationValue(), hoveredChord);
first.getState().redo();
assert.equal(first.getState().title, "First edit");

first.getState().resetStoreToInitValues();
assert.equal(first.getState().canUndo, false);
assert.equal(first.getState().canRedo, false);
second.getState().undo();
assert.equal(second.getState().title, "Second demo");
assert.equal(
  second.getState().canRedo,
  true,
  "Resetting one store preserves another store's history",
);
assert.equal(getTabStore(), globalDocument);
assert.equal(getHoveredChordLocationValue(), hoveredChord);
globalDocument.setHoveredChordLocation(null);
console.log(
  "PASS: independent demo edits, undo/redo, reset, and global-store isolation",
);

for (const scenario of [
  { name: "full tab", start: 0, end: -1, index: 57, delay: 0, editorIndex: 57 },
  {
    name: "narrowed loop",
    start: 20,
    end: 39,
    index: 5,
    delay: 0,
    editorIndex: 25,
  },
  {
    name: "artificial loop copy",
    start: 20,
    end: 25,
    index: 19,
    delay: 2,
    editorIndex: 23,
  },
  {
    name: "loop-delay spacer",
    start: 20,
    end: 25,
    index: 7,
    delay: 2,
    editorIndex: 25,
  },
  {
    name: "loop through tab end",
    start: 92,
    end: -1,
    index: 3,
    delay: 0,
    editorIndex: 95,
  },
]) {
  const store = createTabStore({ loopDelay: scenario.delay }, () => {});
  const committedMetadata = {
    ...store.getState().audioMetadata,
    startLoopIndex: scenario.start,
    endLoopIndex: scenario.end,
    fullTabMetadataLength: 100,
  };
  store.getState().setAudioMetadata(committedMetadata);
  store.getState().setCurrentChordIndex(scenario.index);
  store.getState().enterPlaybackLoopRangeEditor();
  assert.equal(
    store.getState().currentChordIndex,
    scenario.editorIndex,
    scenario.name,
  );

  // Scroll elsewhere and change the draft before cancelling. A repeated entry
  // must not replace the position captured at the beginning of this session.
  store.getState().setCurrentChordIndex(70);
  store.getState().setDraftLoopRange({ startIndex: 60, endIndex: 80 });
  store.getState().enterPlaybackLoopRangeEditor();
  store.getState().cancelPlaybackLoopRangeEditor();
  assert.equal(
    store.getState().currentChordIndex,
    scenario.index,
    scenario.name,
  );
  assert.deepEqual(
    store.getState().audioMetadata,
    committedMetadata,
    scenario.name,
  );
  assert.equal(store.getState().draftLoopStartIndex, null);
  assert.equal(store.getState().draftLoopEndIndex, null);

  // Each new edit session captures its own origin; cancelling twice is harmless.
  store.getState().setCurrentChordIndex(2);
  store.getState().cancelPlaybackLoopRangeEditor();
  assert.equal(store.getState().currentChordIndex, 2);
  store.getState().enterPlaybackLoopRangeEditor();
  store.getState().setCurrentChordIndex(50);
  store.getState().cancelPlaybackLoopRangeEditor();
  assert.equal(store.getState().currentChordIndex, 2);
}

first.getState().setCurrentChordIndex(12);
first.getState().enterPlaybackLoopRangeEditor();
second.getState().setCurrentChordIndex(24);
second.getState().enterPlaybackLoopRangeEditor();
first.getState().cancelPlaybackLoopRangeEditor();
second.getState().cancelPlaybackLoopRangeEditor();
assert.equal(first.getState().currentChordIndex, 12);
assert.equal(second.getState().currentChordIndex, 24);

first.getState().enterPlaybackLoopRangeEditor();
first.getState().setAudioMetadata({
  ...first.getState().audioMetadata,
  location: { sectionIndex: 1 },
});
first.getState().cancelPlaybackLoopRangeEditor();
assert.equal(
  first.getState().currentChordIndex,
  0,
  "Switching sections discards the position from the previous playback scope",
);

first.getState().setCurrentChordIndex(8);
first.getState().enterPlaybackLoopRangeEditor();
first.getState().resetPlaybackModalSession();
first.getState().setCurrentChordIndex(4);
first.getState().enterPlaybackLoopRangeEditor();
first.getState().cancelPlaybackLoopRangeEditor();
assert.equal(first.getState().currentChordIndex, 4);
console.log(
  "PASS: loop-editor Return restores each session's playback position and discards drafts",
);
