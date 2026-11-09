/** Direct regression checks for production PM editing, deletion, and reordering.
 * Run: node scripts/verifyPalmMuteNodeFlows.mjs
 */
import "./lib/registerTypeScript.mjs";
import assert from "node:assert/strict";
import { produce } from "immer";
const {
  recoverPendingPalmMuteEdit,
  applyTabPalmMuteValues,
  editPalmMuteNode,
  finishPalmMuteEdit,
  getPalmMuteOpacities,
  getTabPalmMuteValues,
  removePalmMuteEndpoint,
} = await import("../src/utils/palmMuteEditing.ts");
const { reorderTabColumns } = await import("../src/utils/reorderTabColumns.ts");
const { canDeleteTabNote, deleteTabNote } =
  await import("../src/utils/tabColumnDeletion.ts");
const { createTabNote, createTabMeasureLine } =
  await import("../src/utils/tabNoteHelpers.ts");

let checks = 0;
const columns = (values) =>
  values.map((value, i) => ({
    ...(value === null
      ? createTabMeasureLine({ bpmAfterLine: 120 })
      : createTabNote({ palmMute: value, firstString: String(i) })),
    id: String(i),
  }));
const pm = (cols) =>
  cols.map((col) =>
    col.type === "note" ? col.palmMute : col.isInPalmMuteSection,
  );
function valid(cols) {
  let inside = false;
  for (const col of cols) {
    if (col.type === "measureLine")
      assert.equal(col.isInPalmMuteSection, inside);
    else if (col.palmMute === "start") {
      assert.equal(inside, false);
      inside = true;
    } else if (col.palmMute === "end") {
      assert.equal(inside, true);
      inside = false;
    } else assert.equal(col.palmMute, inside ? "-" : "");
  }
  assert.equal(inside, false, "no hanging PM endpoint");
  checks++;
}
function click(state, index) {
  return editPalmMuteNode(state.values, state.pending, index);
}
function editFixture(values) {
  return { values, pending: null };
}

// New range, cancellation, disabled targets, deletion, and movement in both editors.
for (const values of [
  ["", "", "", "", "", ""],
  ["", "", null, "", "", ""],
]) {
  let state = click(editFixture(values), 1);
  assert.equal(state.pending.prevValue, "");
  assert.deepEqual(
    click(state, 0),
    state,
    "cannot place an end before its start",
  );
  assert.deepEqual(click(state, 1).values, values, "cancel new start");
  assert.deepEqual(
    finishPalmMuteEdit(state.values, state.pending),
    values,
    "leave unfinished addition",
  );
  state = click(state, 4);
  assert.equal(state.pending, null);
  assert.equal(state.values[1], "start");
  assert.equal(state.values[4], "end");
  const complete = state.values;
  for (const endpoint of [1, 4]) {
    const removing = click(state, endpoint);
    assert.deepEqual(
      click(removing, endpoint).values,
      complete,
      "cancel endpoint removal",
    );
    assert.deepEqual(
      finishPalmMuteEdit(removing.values, removing.pending),
      values,
      "leave pending removal",
    );
    assert.deepEqual(
      click(removing, endpoint === 1 ? 4 : 1).values,
      values,
      "remove by clicking pair",
    );
  }
  const shortened = click(click(state, 4), 3);
  assert.equal(shortened.values[3], "end");
  assert.equal(shortened.values[4], "");
  const expanded = click(click(shortened, 1), 0);
  assert.equal(expanded.values[0], "start");
  assert.equal(expanded.values[1], "-");
  const cols = columns(values);
  applyTabPalmMuteValues(cols, expanded.values);
  valid(cols);
}

const multi = [
  "start",
  "-",
  "end",
  "",
  "start",
  "-",
  "end",
  "",
  "start",
  "-",
  "end",
];
for (const endpoint of [4, 6]) {
  const expected = [
    "start",
    "-",
    "end",
    "",
    "",
    "",
    "",
    "",
    "start",
    "-",
    "end",
  ];
  assert.deepEqual(
    removePalmMuteEndpoint(multi, endpoint),
    expected,
    "delete only the selected middle range",
  );
  const removing = click(editFixture(multi), endpoint);
  assert.deepEqual(
    click(removing, endpoint === 4 ? 2 : 8),
    removing,
    "cannot remove an unrelated pair",
  );
  assert.deepEqual(
    finishPalmMuteEdit(removing.values, removing.pending),
    expected,
  );
}

// Undo/redo restores pending additions/removals as editable, cancellable endpoints.
for (const values of [
  ["", "start", "", ""],
  ["", "", "end", ""],
]) {
  const pending = recoverPendingPalmMuteEdit(values);
  assert.ok(pending);
  assert.deepEqual(finishPalmMuteEdit(values, pending), ["", "", "", ""]);
  assert.deepEqual(
    editPalmMuteNode(values, pending, pending.columnIndex).values,
    ["", "", "", ""],
  );
  const result = editPalmMuteNode(
    values,
    pending,
    pending.currentValue === "end" ? 0 : 3,
  );
  assert.equal(result.pending, null);
  const staff = columns(result.values);
  applyTabPalmMuteValues(staff, result.values);
  valid(staff);
}
assert.equal(recoverPendingPalmMuteEdit(multi), null);

// Measure-line moves into and out of PM coverage preserve BPM and note data.
const measured = columns(["", "start", "-", null, "end", "", "", ""]);
applyTabPalmMuteValues(measured, getTabPalmMuteValues(measured));
const movedBar = reorderTabColumns(measured, "3", "6");
assert.equal(movedBar.find((col) => col.id === "3").isInPalmMuteSection, false);
assert.equal(movedBar.find((col) => col.id === "3").bpmAfterLine, 120);
valid(movedBar);
valid(reorderTabColumns(movedBar, "3", "2"));
assert.deepEqual(
  pm(reorderTabColumns(columns(["", "start", "-", "end", "", ""]), "1", "0")),
  ["start", "-", "-", "end", "", ""],
);
assert.deepEqual(
  pm(reorderTabColumns(columns(["", "start", "-", "end", "", ""]), "1", "2")),
  ["", "", "start", "end", "", ""],
);
assert.deepEqual(
  pm(reorderTabColumns(columns(["", "start", "-", "end", "", ""]), "1", "4")),
  ["", "", "", "", "", ""],
);
assert.deepEqual(pm(reorderTabColumns(columns(multi), "4", "1")), [
  "start",
  "-",
  "-",
  "end",
  "",
  "",
  "",
  "",
  "start",
  "-",
  "end",
]);

// Invalid drops must be a true no-op, including within Immer transactions.
for (const source of [
  ["", null, "", ""],
  ["", null, "", null, ""],
]) {
  const cols = columns(source);
  for (const target of [cols[0].id, cols.at(-1).id]) {
    const result = produce(cols, (draft) =>
      reorderTabColumns(draft, "1", target),
    );
    assert.equal(
      result,
      cols,
      "invalid edge drop does not commit a reordered draft",
    );
  }
  assert.equal(reorderTabColumns(cols, "missing", "0"), cols);
  assert.equal(reorderTabColumns(cols, "0", "missing"), cols);
}
const adjacent = columns(["", null, "", null, ""]);
assert.equal(
  reorderTabColumns(adjacent, "1", "2"),
  adjacent,
  "adjacent bars rejected",
);
assert.equal(
  deleteTabNote(adjacent, 2),
  adjacent,
  "deleting sole note between bars rejected",
);
assert.equal(canDeleteTabNote(adjacent, 0), false);
assert.equal(canDeleteTabNote(adjacent, 4), false);
const acrossBar = columns(["", "start", "-", null, "end", ""]);
applyTabPalmMuteValues(acrossBar, getTabPalmMuteValues(acrossBar));
assert.deepEqual(pm(deleteTabNote(acrossBar, 4)), ["", "", "", false, ""]);

// Exhaust every legal drag, endpoint edit, and deletion over generated multi-range staffs.
function* staffs(size, bars, prefix = [], inside = false) {
  const i = prefix.length;
  if (i === size) {
    if (!inside) yield prefix;
    return;
  }
  if (bars.includes(i)) {
    yield* staffs(size, bars, [...prefix, null], inside);
    return;
  }
  if (inside) {
    yield* staffs(size, bars, [...prefix, "end"], false);
    yield* staffs(size, bars, [...prefix, "-"], true);
  } else {
    yield* staffs(size, bars, [...prefix, ""], false);
    yield* staffs(size, bars, [...prefix, "start"], true);
  }
}
for (const bars of [[], [2], [2, 5]]) {
  for (const values of staffs(8, bars)) {
    const cols = columns(values);
    applyTabPalmMuteValues(cols, values);
    const snapshot = structuredClone(cols);
    for (let from = 0; from < cols.length; from++) {
      const deleted = deleteTabNote(cols, from);
      valid(deleted);
      for (let to = 0; to < cols.length; to++) {
        const result = reorderTabColumns(cols, String(from), String(to));
        valid(result);
        assert.equal(result.length, cols.length);
        assert.equal(new Set(result.map((col) => col.id)).size, cols.length);
        assert.ok(
          result.every(
            (col, i) =>
              col.type !== "measureLine" ||
              (i > 0 &&
                i < result.length - 1 &&
                result[i - 1].type !== "measureLine"),
          ),
        );
        for (const col of result) {
          const { palmMute, isInPalmMuteSection, ...data } = col;
          const {
            palmMute: oldPM,
            isInPalmMuteSection: oldCoverage,
            ...oldData
          } = snapshot.find((original) => original.id === col.id);
          assert.deepEqual(
            data,
            oldData,
            "reordering preserves musical metadata",
          );
        }
      }
      if (values[from] === null || values[from] === "-") continue;
      const editing = click(editFixture(values), from);
      for (let to = 0; to < cols.length; to++) {
        const completed = click(editing, to);
        const final = finishPalmMuteEdit(completed.values, completed.pending);
        const updated = columns(values);
        applyTabPalmMuteValues(updated, final);
        valid(updated);
        if (getPalmMuteOpacities(editing.values, editing.pending)[to] !== "1")
          assert.deepEqual(completed, editing);
      }
    }
    assert.deepEqual(cols, snapshot, "helpers do not mutate their inputs");
  }
}
// Real store integration: invalid drops do not create history entries, and
// undo/redo snapshots can resume the two-click PM edit across a measure line.
const { createTabStore } = await import("../src/stores/TabStore.ts");
const store = createTabStore(
  {
    editing: true,
    tabData: [
      {
        id: "section",
        title: "Fixture",
        data: [
          {
            id: "tab",
            type: "tab",
            bpm: 120,
            baseNoteLength: "quarter",
            repetitions: 1,
            data: columns(["", "", null, "", ""]),
          },
        ],
      },
    ],
  },
  () => {},
);
const storeColumns = () => store.getState().tabData[0].data[0].data;
store.getState().setTabData((draft) => {
  draft[0].data[0].data = reorderTabColumns(draft[0].data[0].data, "2", "0");
});
assert.equal(
  store.getState().canUndo,
  false,
  "invalid drop leaves store history untouched",
);
let pending = null;
for (const index of [0, 4]) {
  const result = editPalmMuteNode(
    getTabPalmMuteValues(storeColumns()),
    pending,
    index,
  );
  store
    .getState()
    .setTabData((draft) =>
      applyTabPalmMuteValues(draft[0].data[0].data, result.values),
    );
  pending = result.pending;
  await Promise.resolve();
}
valid(storeColumns());
store.getState().undo();
const recovered = recoverPendingPalmMuteEdit(
  getTabPalmMuteValues(storeColumns()),
);
assert.equal(recovered.columnIndex, 0);
assert.equal(recovered.currentValue, "start");
store.getState().redo();
valid(storeColumns());

console.log(
  `All palm-mute flow, deletion, and reorder checks passed (${checks} invariant checks).`,
);
