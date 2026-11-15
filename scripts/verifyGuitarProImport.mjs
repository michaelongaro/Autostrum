// Run: node scripts/verifyGuitarProImport.mjs
import "./lib/registerTypeScript.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { midi, model, Settings } from "@coderline/alphatab/core";
const { readGuitarProScore } =
  await import("../src/utils/guitarPro/readScore.ts");
const { convertScore, getImportTracks, getMeasureOrder } =
  await import("../src/utils/guitarPro/convertScore.ts");
const { MAX_GUITAR_PRO_BYTES, validateGuitarProFile } =
  await import("../src/utils/guitarPro/types.ts");
const { tabDocumentSchema } = await import("../src/utils/tabDocument.ts");
const { createTabStore } = await import("../src/stores/TabStore.ts");
const { recoverPendingPalmMuteEdit } =
  await import("../src/utils/palmMuteEditing.ts");
const { parse: playbackTuning } = await import("../src/utils/tunings.ts");
const { tabNoteToArray } = await import("../src/utils/tabNoteHelpers.ts");

function load(name = "guitarpro5-notes.gp5") {
  return readGuitarProScore(
    new Uint8Array(
      readFileSync(
        new URL(`../tests/fixtures/guitar-pro/${name}`, import.meta.url),
      ),
    ),
    name,
  );
}
function convert(score) {
  return convertScore(score, getImportTracks(score)[0].id, "test.gp5");
}
function columns(document) {
  return document.tabData.flatMap((s) => s.data.flatMap((sub) => sub.data));
}
const keys = [
  "firstString",
  "secondString",
  "thirdString",
  "fourthString",
  "fifthString",
  "sixthString",
];

for (const name of [
  "guitarpro3-notes.gp3",
  "guitarpro4-notes.gp4",
  "guitarpro5-notes.gp5",
  "guitarpro6-notes.gpx",
  "guitarpro7-notes.gp",
  "guitarpro8-beat-tempo-change.gp",
]) {
  const result = convert(load(name));
  assert.ok(tabDocumentSchema.safeParse(result.document).success);
  assert.equal(result.document.tuning, "e2 a2 d3 g3 b3 e4");
  const notes = columns(result.document).filter((c) => c.type === "note");
  assert.ok(notes.some((c) => keys.some((key) => c[key] === "1")));
  if (!name.includes("guitarpro8")) {
    assert.equal(
      notes[0].sixthString,
      "1",
      "low string must stay on the bottom row",
    );
    assert.equal(notes[0].firstString, "");
    assert.equal(notes[0].noteLength, "whole");
  } else
    assert.ok(
      columns(result.document).some(
        (c) => c.type === "measureLine" && c.bpmAfterLine === 60,
      ),
    );
  console.log(
    `PASS ${name}: parse, tuning, string order, rhythm and document validation`,
  );
}

// Distinct frets on all strings catch a reversal even when the standard tuning's
// outer string labels are both E. Check the array/tuning used by audio as well.
for (const name of [
  "guitarpro3-notes.gp3",
  "guitarpro4-notes.gp4",
  "guitarpro5-notes.gp5",
  "guitarpro6-notes.gpx",
  "guitarpro7-notes.gp",
  "guitarpro8-beat-tempo-change.gp",
]) {
  const score = load(name);
  const staff = score.tracks[0].staves[0];
  staff.capo = 2;
  staff.stringTuning.tunings = [64, 59, 55, 50, 45, 38]; // Drop D
  const beat = staff.bars[0].voices[0].beats[0];
  beat.notes.length = 0;
  for (let string = 1; string <= 6; string++) {
    const note = new model.Note();
    note.string = string;
    note.fret = string;
    beat.addNote(note);
  }
  const { document } = convert(score);
  const imported = columns(document).find((c) => c.type === "note");
  assert.deepEqual(
    keys.map((key) => imported[key]),
    ["6", "5", "4", "3", "2", "1"],
    "rows must run from high E at the top to low D at the bottom",
  );
  const pitches = playbackTuning(document.tuning);
  const compiled = tabNoteToArray(imported);
  for (const source of beat.notes) {
    const row = 6 - source.string;
    assert.equal(
      Number(compiled[row + 1]) + pitches[row] + document.capo,
      source.realValueWithoutHarmonic,
      "import must preserve the source note's sounding pitch",
    );
  }
  console.log(
    `PASS ${name}: all six rows and playback pitches match source strings in Drop D with capo`,
  );
}

for (const name of [
  "repeat-close-alternate-endings",
  "repeat-close-multi",
  "repeat-close-without-start-at-beginning",
]) {
  const score = load(`guitarpro5-${name}.gp5`);
  const generator = new midi.MidiFileGenerator(
    score,
    new Settings(),
    new Proxy({}, { get: () => () => {} }),
  );
  generator.generate();
  assert.deepEqual(
    getMeasureOrder(score.masterBars),
    generator.tickLookup.masterBars.map((item) => item.masterBar.index),
  );
  const result = convert(score);
  assert.equal(result.measures, generator.tickLookup.masterBars.length);
  const ids = columns(result.document).map((column) => column.id);
  assert.equal(
    new Set(ids).size,
    ids.length,
    "expanded repeats need fresh column IDs",
  );
  console.log(`PASS ${name}: matches alphaTab playback order`);
}

{
  const result = convert(load("guitarpro7-effects.gp"));
  const notes = columns(result.document).filter((c) => c.type === "note");
  assert.ok(notes.some((c) => keys.some((key) => c[key] === "x")));
  assert.ok(notes.some((c) => keys.some((key) => c[key].endsWith("~"))));
  assert.ok(result.warnings.some((w) => w.includes("Bend")));
  assert.ok(result.warnings.some((w) => w.includes("Harmonics")));
  for (const section of result.document.tabData)
    for (const sub of section.data)
      assert.equal(
        recoverPendingPalmMuteEdit(
          sub.data.map((c) => (c.type === "note" ? c.palmMute : null)),
        ),
        null,
      );
  assert.ok(
    notes
      .filter((c) => keys.every((key) => !c[key]))
      .every((c) => c.chordEffects === "r"),
  );
  console.log(
    "PASS effects: dead notes, vibrato, fallback report, closed palm-mute runs and silent rests",
  );
}

{
  const score = load();
  const staff = score.tracks[0].staves[0];
  staff.capo = 3;
  score.artist = "  Imported Artist  ";
  assert.equal(convert(score).document.artistName, "Imported Artist");
  assert.equal(convert(score).document.artistId, null);
  staff.stringTuning.tunings = [64, 59, 55, 50, 45, 38];
  assert.equal(convert(score).document.tuning, "d2 a2 d3 g3 b3 e4");
  assert.equal(convert(score).document.capo, 3);
  staff.bars[0].voices[0].beats[0].notes[0].fret = 30;
  const result = convert(score);
  const first = columns(result.document).find((c) => c.type === "note");
  assert.equal(first.sixthString, "");
  assert.ok(
    keys.some((key) => first[key]),
    "high frets should move to a playable string",
  );
  assert.ok(result.warnings.some((w) => w.includes("Frets outside")));
  staff.isPercussion = true;
  assert.equal(getImportTracks(score).length, 0);
  assert.throws(
    () => convertScore(score, "0:0", "test.gp5"),
    /fretted instrument/,
  );
  console.log(
    "PASS custom tuning, capo, high-fret revoicing and percussion exclusion",
  );
}

{
  const score = load();
  const beat = score.tracks[0].staves[0].bars[0].voices[0].beats[0];
  beat.duration = model.Duration.Eighth;
  beat.tupletNumerator = 3;
  beat.tupletDenominator = 2;
  score.finish(new Settings());
  assert.ok(convert(score).warnings.some((w) => w.includes("Tuplets")));
  const repeated = load("guitarpro5-repeat-close-multi.gp5");
  repeated.masterBars[1].repeatCount = 1000000;
  assert.throws(
    () => getMeasureOrder(repeated.masterBars),
    /too many measures/,
  );
  console.log(
    "PASS unsupported rhythms report timing changes; repeat expansion is bounded",
  );
}

{
  const score = load();
  const staff = score.tracks[0].staves[0];
  staff.stringTuning.tunings = [64, 59, 55, 50];
  const fourString = convert(score);
  assert.equal(columns(fourString.document)[0].fourthString, "1");
  assert.equal(fourString.document.tuning.split(" ").length, 6);
  staff.stringTuning.tunings = [64, 59, 55, 50, 45, 40, 35];
  staff.bars[0].voices[0].beats[0].notes[0].fret = 7;
  const sevenString = convert(score);
  assert.equal(
    columns(sevenString.document)[0].sixthString,
    "2",
    "low B + 7 must revoice to low E + 2",
  );
  const secondStaff = load().tracks[0].staves[0];
  secondStaff.bars[0].voices[0].beats[0].notes[0].fret = 9;
  score.tracks[0].addStaff(secondStaff);
  const tracks = getImportTracks(score);
  assert.equal(tracks.length, 2);
  assert.equal(
    columns(convertScore(score, tracks[1].id, "test.gp5").document)[0]
      .sixthString,
    "9",
  );
  console.log(
    "PASS four/seven-string adaptation and selecting an independent staff",
  );
}

for (const file of [
  { name: "x.pdf", size: 10 },
  { name: "x.gtp", size: 10 },
  { name: "x.gp5", size: 0 },
  { name: "x.gp", size: MAX_GUITAR_PRO_BYTES + 1 },
])
  assert.throws(() => validateGuitarProFile(file));
validateGuitarProFile({ name: "TAB.GP5", size: 10 });
assert.throws(
  () => readGuitarProScore(new TextEncoder().encode("not a score"), "x.gp5"),
  /could not be read/,
);
assert.throws(
  () => readGuitarProScore(new Uint8Array([80, 75, 3, 4]), "x.gp"),
  /could not be read/,
);
console.log(
  "PASS invalid extensions, empty/oversized files, uppercase extensions and corrupt bytes",
);

{
  const store = createTabStore({ editing: true }, () => {});
  store.getState().setTitle("My existing draft");
  await Promise.resolve();
  store.getState().clearEditorHistory();
  const original = store.getState().tabData;
  const { document } = convert(load());
  store.getState().importDocument({
    ...document,
    artistName: undefined,
    artistIsVerified: false,
  });
  assert.equal(store.getState().title, document.title);
  assert.deepEqual(store.getState().tabData, document.tabData);
  assert.ok(store.getState().canUndo);
  store.getState().undo();
  assert.equal(store.getState().title, "My existing draft");
  assert.deepEqual(store.getState().tabData, original);
  assert.equal(
    store.getState().canUndo,
    false,
    "import must be a single action",
  );
  store.getState().redo();
  assert.deepEqual(store.getState().tabData, document.tabData);
  console.log(
    "PASS import replaces the document as one undoable action; redo restores it",
  );
}
console.log("Guitar Pro import checks passed.");
