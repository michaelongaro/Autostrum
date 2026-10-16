// Verify adding a second section grows compiled playback metadata length.
//
// Bug: after the first section compiles (persisting sectionProgression),
// adding another section was ignored by compileFullTab because progression
// still only listed section 1.
//
// Usage:
//   1. npm run dev
//   2. node scripts/verifyAutoCompileNewSection.mjs [baseURL]
//
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts/autocompile-new-section";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function uuid() {
  return crypto.randomUUID();
}

function note(fret = "0") {
  return {
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "",
    thirdString: "",
    fourthString: "",
    fifthString: fret,
    sixthString: "",
    chordEffects: "",
    noteLength: "eighth",
    id: uuid(),
  };
}

function tabSubsection(columns) {
  return {
    id: uuid(),
    type: "tab",
    bpm: -1,
    repetitions: 1,
    baseNoteLength: "eighth",
    data: columns,
  };
}

const draft = {
  title: "AutoCompile new section verify",
  artistId: null,
  description: null,
  genre: "rock",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 120,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [],
  strummingPatterns: [],
  // Empty progression so the first compile generates+persists defaults for
  // the seeded section only — the exact bug precondition.
  sectionProgression: [],
  tabData: [
    {
      id: uuid(),
      title: "Section 1",
      data: [tabSubsection([note("1"), note("2"), note("3"), note("4")])],
    },
  ],
};

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1100, height: 900 } })
).newPage();

await page.addInitScript((data) => {
  localStorage.setItem("autostrum-tabData", JSON.stringify(data));
}, draft);

await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });

async function readStoreSnapshot() {
  return page.evaluate(() => {
    const getStore = window.__AUTOSTRUM_GET_TAB_STORE__;
    if (!getStore) return { error: "store probe missing" };
    const state = getStore();
    return {
      sectionCount: state.tabData.length,
      sectionIds: state.tabData.map((s) => s.id),
      progressionCount: state.sectionProgression.length,
      progressionSectionIds: state.sectionProgression.map((p) => p.sectionId),
      fullTabMetadataLength: state.audioMetadata.fullTabMetadataLength,
      metadataLength: state.currentlyPlayingMetadata?.length ?? 0,
      editing: state.editing,
    };
  });
}

async function waitForCompile(predicate, label, timeoutMs = 8000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await readStoreSnapshot();
    if (!last.error && predicate(last)) return last;
    await page.waitForTimeout(200);
  }
  throw new Error(
    `${label} timed out. Last snapshot: ${JSON.stringify(last, null, 2)}`,
  );
}

// First compile (editing debounce 1000ms) should persist progression for section 1
const afterFirst = await waitForCompile(
  (s) =>
    s.editing === true &&
    s.sectionCount === 1 &&
    s.progressionCount === 1 &&
    s.fullTabMetadataLength > 0,
  "first-section compile",
);

console.log("afterFirst", afterFirst);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "after-first-section-compile.png"),
});

const lengthAfterFirst = afterFirst.fullTabMetadataLength;

// Add a second section via the UI button
await page.getByRole("button", { name: "Add section" }).click();
await page.waitForTimeout(300);

const afterAddSection = await readStoreSnapshot();
assert.equal(afterAddSection.sectionCount, 2, "tabData has 2 sections");
console.log("afterAddSection", afterAddSection);

// Populate section 2 with a tab block + notes so it contributes metadata.
// (New sections start empty — empty sections add 0 to metadata length.)
await page.evaluate(() => {
  const getStore = window.__AUTOSTRUM_GET_TAB_STORE__;
  const state = getStore();
  const mkId = () => crypto.randomUUID();
  state.setTabData((draft) => {
    const section = draft[1];
    if (!section) return;
    const columns = [];
    for (let i = 0; i < 4; i++) {
      columns.push({
        type: "note",
        palmMute: "",
        firstString: "",
        secondString: "",
        thirdString: "",
        fourthString: "",
        fifthString: String(i + 1),
        sixthString: "",
        chordEffects: "",
        noteLength: "eighth",
        id: mkId(),
      });
    }
    section.data.push({
      id: mkId(),
      type: "tab",
      bpm: -1,
      repetitions: 1,
      baseNoteLength: "eighth",
      data: columns,
    });
  });
});

const afterSecond = await waitForCompile(
  (s) =>
    s.sectionCount === 2 &&
    s.progressionCount === 2 &&
    s.progressionSectionIds[1] === s.sectionIds[1] &&
    s.fullTabMetadataLength > lengthAfterFirst,
  "second-section compile grows metadata",
  10000,
);

console.log("afterSecond", afterSecond);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "after-second-section-compile.png"),
});

assert.equal(afterSecond.progressionCount, 2);
assert.ok(
  afterSecond.fullTabMetadataLength > lengthAfterFirst,
  `metadata grew (${lengthAfterFirst} -> ${afterSecond.fullTabMetadataLength})`,
);

// Intentional omission: removing section 2 from progression must not be
// undone on the next note edit.
await page.evaluate(() => {
  const getStore = window.__AUTOSTRUM_GET_TAB_STORE__;
  const state = getStore();
  state.setSectionProgression(state.sectionProgression.slice(0, 1));
  state.setTabData((draft) => {
    const col = draft[0]?.data[0]?.data?.[0];
    if (col && col.type === "note") {
      col.fifthString = col.fifthString === "9" ? "8" : "9";
    }
  });
});

const afterOmit = await waitForCompile(
  (s) =>
    s.progressionCount === 1 &&
    s.sectionCount === 2 &&
    s.fullTabMetadataLength === lengthAfterFirst,
  "intentional omission preserved and metadata shrinks",
  10000,
);

console.log("afterOmit", afterOmit);
assert.equal(
  afterOmit.progressionCount,
  1,
  "user-removed progression entry must not be re-appended",
);
assert.equal(
  afterOmit.fullTabMetadataLength,
  lengthAfterFirst,
  `metadata should shrink back to first-section length (got ${afterOmit.fullTabMetadataLength}, expected ${lengthAfterFirst})`,
);

console.log("\nALL AUTOCOMPILE NEW-SECTION CHECKS PASSED");
await browser.close();
