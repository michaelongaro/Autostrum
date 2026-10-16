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
