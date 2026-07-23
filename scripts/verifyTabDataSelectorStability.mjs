/**
 * Verifies that fine-grained tabData selectors stay stable under immer updates.
 * Run: node scripts/verifyTabDataSelectorStability.mjs
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";

function createNote(id, sixth = "") {
  return {
    id,
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "",
    thirdString: "",
    fourthString: "",
    fifthString: "",
    sixthString: sixth,
    chordEffects: "",
    noteLength: "quarter",
  };
}

const useStore = create(
  immer(() => ({
    tabData: [
      {
        id: "s1",
        title: "Section 1",
        data: [
          {
            id: "t1",
            type: "tab",
            bpm: -1,
            repetitions: 1,
            baseNoteLength: "quarter",
            data: [createNote("c0", "0"), createNote("c1"), createNote("c2")],
          },
        ],
      },
      {
        id: "s2",
        title: "Section 2",
        data: [
          {
            id: "t2",
            type: "tab",
            bpm: -1,
            repetitions: 1,
            baseNoteLength: "quarter",
            data: [createNote("c3")],
          },
        ],
      },
    ],
  })),
);

function selectSectionIds(state) {
  return state.tabData.map((s) => s.id);
}

function selectColumn(state, si, ssi, ci) {
  return state.tabData[si]?.data[ssi]?.data[ci];
}

function selectColumnIds(state, si, ssi) {
  const sub = state.tabData[si]?.data[ssi];
  return sub?.type === "tab" ? sub.data.map((c) => c.id) : [];
}

const before = useStore.getState();
const sectionIdsBefore = selectSectionIds(before);
const col0Before = selectColumn(before, 0, 0, 0);
const col1Before = selectColumn(before, 0, 0, 1);
const colIdsBefore = selectColumnIds(before, 0, 0);
const section2Before = before.tabData[1];

useStore.setState((draft) => {
  draft.tabData[0].data[0].data[0].sixthString = "7";
});

const after = useStore.getState();
const sectionIdsAfter = selectSectionIds(after);
const col0After = selectColumn(after, 0, 0, 0);
const col1After = selectColumn(after, 0, 0, 1);
const colIdsAfter = selectColumnIds(after, 0, 0);
const section2After = after.tabData[1];

const checks = [
  [
    "section ID list shallow-equal after note edit",
    shallow(sectionIdsBefore, sectionIdsAfter),
  ],
  ["edited column reference changed", col0Before !== col0After],
  ["sibling column reference stable", col1Before === col1After],
  ["column ID list shallow-equal", shallow(colIdsBefore, colIdsAfter)],
  ["unrelated section reference stable", section2Before === section2After],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  if (!ok) failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("All selector stability checks passed.");
