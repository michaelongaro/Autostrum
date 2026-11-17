// Run: node scripts/verifyZustandArchitecture.mjs
// Production stores and derivations; no database, auth, or sound downloads.
import assert from "node:assert/strict";
import "./lib/registerTypeScript.mjs";

const { createTabStore, getTabStore } =
  await import("../src/stores/TabStore.ts");
const { emptyTabDocument } =
  await import("../src/utils/drafts/draftDocument.ts");
const { createTabNote } = await import("../src/utils/tabNoteHelpers.ts");
const { beamBreaksForTabColumns, beamBreaksAtTabColumn } =
  await import("../src/utils/noteLengthBeaming.ts");
const { beamBreaksForNoteSpans } =
  await import("../src/utils/noteLengthBeamingCore.ts");
const { compileTabPlayback, playbackCompilationInputsChanged } =
  await import("../src/stores/tab/compilation.ts");

const globalBefore = getTabStore();
const first = createTabStore({ editing: true, theme: "dark" }, () => {});
const second = createTabStore({}, () => {});
let sessionNotifications = 0;
let preferenceNotifications = 0;
const unsubscribeSession = first.subscribe(() => sessionNotifications++);
const unsubscribePreferences = first.preferences.subscribe(
  () => preferenceNotifications++,
);
first.preferences.getState().setColor("aqua");
assert.equal(
  sessionNotifications,
  0,
  "Preferences never notify document/transport subscribers",
);
first.getState().setCurrentChordIndex(2);
assert.equal(
  preferenceNotifications,
  1,
  "Playback never notifies preference subscribers",
);
first.preferences.getState().setColor("aqua");
assert.equal(
  preferenceNotifications,
  1,
  "Unchanged preferences do not publish",
);
first.getState().resetStoreToInitValues();
assert.equal(
  first.preferences.getState().theme,
  "dark",
  "Route resets preserve preferences",
);
assert.equal(
  second.preferences.getState().color,
  "maple",
  "Demo preferences are independent",
);
unsubscribeSession();
unsubscribePreferences();

first.getState().setTitle("Undoable old document");
assert.equal(first.getState().canUndo, true);
first.setState({
  audioMetadata: { ...first.getState().audioMetadata, playing: true },
  previewMetadata: { ...first.getState().previewMetadata, playing: true },
  chordBeingEdited: {
    index: 0,
    value: { id: "old", name: "C", color: "#fff", frets: [] },
  },
});
const incoming = {
  ...emptyTabDocument(),
  title: "New document",
  artistName: undefined,
  artistIsVerified: false,
};
const snapshots = [];
const stopLoading = first.subscribe((state) => snapshots.push(state));
first.getState().loadDocument(incoming, { id: 42 });
stopLoading();
assert.equal(
  snapshots.length,
  1,
  "Hydration publishes one complete document, even with existing history/playback",
);
assert.equal(snapshots[0].id, 42);
assert.equal(snapshots[0].title, "New document");
assert.equal(snapshots[0].audioMetadata.playing, false);
assert.equal(snapshots[0].previewMetadata.playing, false);
assert.equal(snapshots[0].chordBeingEdited, null);
assert.equal(snapshots[0].canUndo, false);
assert.equal(snapshots[0].canRedo, false);
first.getState().undo();
assert.equal(
  first.getState().title,
  "New document",
  "Loading is never an undo step",
);
first
  .getState()
  .loadDocument({ ...incoming, tabData: [], sectionProgression: [] });
assert.equal(
  first.getState().tabData.length,
  1,
  "Legacy empty documents keep a valid section",
);
assert.equal(
  first.getState().sectionProgression[0].sectionId,
  first.getState().tabData[0].id,
);
assert.equal(
  getTabStore(),
  globalBefore,
  "Independent loads leave the global session untouched",
);

const columns = Array.from({ length: 128 }, () =>
  createTabNote({ firstString: "0", noteLength: "eighth" }),
);
let arrayReads = 0;
const countedColumns = new Proxy(columns, {
  get(target, key, receiver) {
    if (/^\d+$/.test(String(key))) arrayReads++;
    return Reflect.get(target, key, receiver);
  },
});
const flags = beamBreaksForTabColumns(countedColumns);
assert.deepEqual(flags, beamBreaksForNoteSpans(columns));
arrayReads = 0;
for (let index = 0; index < columns.length; index++) {
  assert.equal(beamBreaksAtTabColumn(countedColumns, index), flags[index]);
}
assert.equal(
  arrayReads,
  0,
  "Mounted-column lookups do not rescan an unchanged array",
);
const changedColumns = columns.map((column, index) =>
  index === 1 ? { ...column, noteLength: "quarter" } : column,
);
assert.notEqual(beamBreaksForTabColumns(changedColumns), flags);
assert.deepEqual(
  beamBreaksForTabColumns(changedColumns),
  beamBreaksForNoteSpans(changedColumns),
);

const section = {
  ...incoming.tabData[0],
  data: [
    {
      id: "tab",
      type: "tab",
      bpm: -1,
      repetitions: 1,
      baseNoteLength: "quarter",
      data: columns,
    },
  ],
};
const editor = createTabStore(
  {
    ...incoming,
    editing: true,
    tabData: [section],
    sectionProgression: [],
    bpm: 120,
  },
  () => {},
);
let compilationNotifications = 0;
const beforeCompile = editor.getState();
const stopCompilation = editor.subscribe(() => compilationNotifications++);
compileTabPlayback(editor);
stopCompilation();
assert.equal(
  compilationNotifications,
  1,
  "Compilation publishes metadata and timing together",
);
assert.ok(editor.getState().currentlyPlayingMetadata.length > 0);
assert.ok(editor.getState().sectionProgression[0].endSeconds > 0);
assert.equal(
  playbackCompilationInputsChanged(editor.getState(), beforeCompile),
  false,
  "Compiler output cannot trigger another compilation",
);
const timingOnly = {
  ...editor.getState(),
  sectionProgression: editor
    .getState()
    .sectionProgression.map((entry) => ({
      ...entry,
      endSeconds: entry.endSeconds + 1,
    })),
};
assert.equal(
  playbackCompilationInputsChanged(timingOnly, editor.getState()),
  false,
);
const repeated = {
  ...editor.getState(),
  sectionProgression: editor
    .getState()
    .sectionProgression.map((entry) => ({
      ...entry,
      repetitions: entry.repetitions + 1,
    })),
};
assert.equal(
  playbackCompilationInputsChanged(repeated, editor.getState()),
  true,
  "User changes still invalidate compilation",
);
editor.getState().setTitle("Keep my history");
compileTabPlayback(editor);
assert.equal(editor.getState().canUndo, true);
editor.getState().undo();
assert.equal(editor.getState().title, incoming.title);

const viewer = createTabStore(
  {
    ...incoming,
    tabData: [section],
    sectionProgression: [],
    visiblePlaybackContainerWidth: 800,
  },
  () => {},
);
let viewNotifications = 0;
const beforeView = viewer.getState();
const stopView = viewer.subscribe(() => viewNotifications++);
compileTabPlayback(viewer);
stopView();
assert.equal(viewNotifications, 1);
assert.ok(viewer.getState().expandedTabData.length > 0);
assert.ok(viewer.getState().playbackMetadata.length > 0);
assert.equal(
  playbackCompilationInputsChanged(viewer.getState(), beforeView),
  false,
);

console.log(
  "PASS: independent preferences, atomic hydration/compilation, history isolation, cached beams, and compilation invalidation",
);
