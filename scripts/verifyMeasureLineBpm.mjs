/**
 * Verifies sticky measure-line BPM resolution + display gating.
 * Run: node scripts/verifyMeasureLineBpm.mjs
 */

function getBpmForChord(chordBpm, baselineBpm, subSectionBpm) {
  if (chordBpm !== -1) return chordBpm;
  if (subSectionBpm && subSectionBpm !== -1) return subSectionBpm;
  return baselineBpm;
}

function applyStickyMeasureLineBpm(currentBpm, bpmAfterLine) {
  return bpmAfterLine !== null ? bpmAfterLine : currentBpm;
}

function getMeasureLineBpmDisplay({
  columns,
  measureLineIndex,
  subSectionBpm,
  baselineBpm,
}) {
  let currentBpm = getBpmForChord(subSectionBpm, baselineBpm);

  for (let i = 0; i < measureLineIndex; i++) {
    const column = columns[i];
    if (column?.type === "measureLine" && column.bpmAfterLine !== null) {
      currentBpm = column.bpmAfterLine;
    }
  }

  const bpmBefore = currentBpm;
  const measureLine = columns[measureLineIndex];
  const bpmAfter =
    measureLine?.type === "measureLine" && measureLine.bpmAfterLine !== null
      ? measureLine.bpmAfterLine
      : bpmBefore;

  return {
    show: bpmBefore !== bpmAfter,
    bpm: bpmAfter,
    bpmBefore,
    bpmAfter,
  };
}

function resolveNoteBpms(columns, subSectionBpm, baselineBpm) {
  let currentBpm = getBpmForChord(subSectionBpm, baselineBpm);
  const noteBpms = [];

  for (const column of columns) {
    if (column.type === "measureLine") {
      currentBpm = applyStickyMeasureLineBpm(currentBpm, column.bpmAfterLine);
      continue;
    }
    noteBpms.push(currentBpm);
  }

  return noteBpms;
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}: expected ${e}, got ${a}`);
  }
}

const baselineBpm = 75;
const subSectionBpm = -1; // inherit tab BPM

// note, measure(120), note, measure(null), note, measure(140), note
const columns = [
  { type: "note", id: "n0" },
  { type: "measureLine", bpmAfterLine: 120, id: "m0" },
  { type: "note", id: "n1" },
  { type: "measureLine", bpmAfterLine: null, id: "m1" },
  { type: "note", id: "n2" },
  { type: "measureLine", bpmAfterLine: 140, id: "m2" },
  { type: "note", id: "n3" },
];

// Sticky: null measure line keeps 120 (does NOT revert to 75)
assertEqual(
  resolveNoteBpms(columns, subSectionBpm, baselineBpm),
  [75, 120, 120, 140],
  "sticky note BPM walk",
);

assertEqual(
  getMeasureLineBpmDisplay({
    columns,
    measureLineIndex: 1,
    subSectionBpm,
    baselineBpm,
  }),
  { show: true, bpm: 120, bpmBefore: 75, bpmAfter: 120 },
  "display at first tempo change",
);

assertEqual(
  getMeasureLineBpmDisplay({
    columns,
    measureLineIndex: 3,
    subSectionBpm,
    baselineBpm,
  }),
  { show: false, bpm: 120, bpmBefore: 120, bpmAfter: 120 },
  "no display when sticky null keeps same BPM",
);

assertEqual(
  getMeasureLineBpmDisplay({
    columns,
    measureLineIndex: 5,
    subSectionBpm,
    baselineBpm,
  }),
  { show: true, bpm: 140, bpmBefore: 120, bpmAfter: 140 },
  "display at second tempo change",
);

// Explicit same-as-current should also hide
const sameAsCurrent = [
  { type: "note", id: "n0" },
  { type: "measureLine", bpmAfterLine: 75, id: "m0" },
  { type: "note", id: "n1" },
];
assertEqual(
  getMeasureLineBpmDisplay({
    columns: sameAsCurrent,
    measureLineIndex: 1,
    subSectionBpm,
    baselineBpm,
  }),
  { show: false, bpm: 75, bpmBefore: 75, bpmAfter: 75 },
  "no display when bpmAfterLine equals current",
);

// Subsection BPM baseline
assertEqual(
  resolveNoteBpms(
    [
      { type: "note", id: "n0" },
      { type: "measureLine", bpmAfterLine: 90, id: "m0" },
      { type: "note", id: "n1" },
      { type: "measureLine", bpmAfterLine: null, id: "m1" },
      { type: "note", id: "n2" },
    ],
    100,
    baselineBpm,
  ),
  [100, 90, 90],
  "sticky with subsection baseline",
);

console.log("verifyMeasureLineBpm: all assertions passed");
