// Run: node scripts/verifyGuitarProImport.mjs
import "./lib/registerTypeScript.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { exporter, midi, model, Settings } from "@coderline/alphatab/core";
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
const { compileChord } =
  await import("../src/utils/chordCompilationHelpers.ts");

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

// Small scores with real alphaTab timing and tie resolution, independent of the
// bundled file fixtures, make attacks, continuations and rests unambiguous.
function sustainScore(measures) {
  const score = new model.Score();
  const track = new model.Track();
  const staff = new model.Staff();
  score.addTrack(track);
  track.addStaff(staff);
  staff.stringTuning.tunings = [64, 59, 55, 50, 45, 40];
  for (const voices of measures) {
    score.addMasterBar(new model.MasterBar());
    const bar = new model.Bar();
    staff.addBar(bar);
    for (const beats of voices) {
      const voice = new model.Voice();
      bar.addVoice(voice);
      for (const { duration, notes = [], ...effects } of beats) {
        const beat = new model.Beat();
        Object.assign(beat, { duration, ...effects });
        voice.addBeat(beat);
        for (const properties of notes) {
          const note = new model.Note();
          Object.assign(note, properties);
          beat.addNote(note);
        }
      }
    }
  }
  score.finish(new Settings());
  return score;
}

function noteColumns(score) {
  return columns(convert(score).document).filter((c) => c.type === "note");
}

function assertSustain(column) {
  assert.ok(keys.every((key) => column[key] === ""));
  assert.equal(column.chordEffects, "", "a sustain must not stop the strings");
  assert.equal(column.palmMute, "");
}

{
  const chord = [
    { string: 1, fret: 2 },
    { string: 3, fret: 3 },
    { string: 6, fret: 4 },
  ];
  const strokes = [
    { brushType: model.BrushType.BrushDown, brushDuration: 361 },
    { brushType: model.BrushType.BrushUp, brushDuration: 60 },
    { brushType: model.BrushType.ArpeggioDown, brushDuration: 111 },
    {
      brushType: model.BrushType.ArpeggioUp,
      brushDuration: 720,
      pickStroke: model.PickStroke.Down,
    },
    { pickStroke: model.PickStroke.Down },
    { pickStroke: model.PickStroke.Up },
    { brushType: model.BrushType.ArpeggioDown },
    { pickStroke: model.PickStroke.Up, notes: [chord[0]] },
  ];
  const score = sustainScore(
    [strokes.slice(0, 4), strokes.slice(4)].map((measure) => [
      measure.map((stroke) => ({
        duration: model.Duration.Quarter,
        notes: chord,
        ...stroke,
      })),
    ]),
  );
  score.masterBars[0].tempoAutomations.push(
    model.Automation.buildTempoAutomation(false, 0, 120, 2),
    model.Automation.buildTempoAutomation(false, 0.5, 90, 2),
  );

  const bytes = new exporter.Gp7Exporter().export(score);
  const parsed = readGuitarProScore(bytes, "strums.gp");
  const result = convert(parsed);
  const notes = columns(result.document).filter((c) => c.type === "note");
  assert.deepEqual(
    notes.map((note) => note.chordEffects),
    ["v", "^", "v~", "^~", "v", "^", "v~", ""],
  );
  assert.deepEqual(
    notes.map((note) => note.strumSpreadAuto),
    [false, false, false, false, true, true, true, false],
  );
  assert.ok(
    result.warnings.some((warning) =>
      /without a defined duration/.test(warning),
    ),
  );

  const attacks = [];
  const handler = new Proxy(
    {
      addNote(_track, start, _length, key) {
        attacks.push({ start, key });
      },
    },
    { get: (handler, key) => handler[key] ?? (() => {}) },
  );
  new midi.MidiFileGenerator(parsed, new Settings(), handler).generate();
  for (const [i, tempo] of [120, 120, 90, 90].entries()) {
    const midiAttacks = attacks
      .slice(i * chord.length, (i + 1) * chord.length)
      .sort((a, b) => a.start - b.start);
    const spreadTicks = midiAttacks.at(-1).start - midiAttacks[0].start;
    const spread = Number(tabNoteToArray(notes[i])[10]);
    assert.ok(Math.abs(spread - (spreadTicks * 60) / (960 * tempo)) < 1e-9);
    assert.deepEqual(
      midiAttacks.map((attack) => attack.key),
      i % 2 === 0 ? [42, 53, 68] : [68, 53, 42],
    );
  }
  assert.deepEqual(
    notes.slice(4).map((note) => tabNoteToArray(note)[10]),
    ["auto", "auto", "auto", ""],
  );
  console.log(
    "PASS strums: GP file bytes preserve direction, arpeggiation and MIDI attack spread through audio compilation",
  );
}

{
  const score = sustainScore([
    [
      [
        {
          duration: model.Duration.Whole,
          notes: [
            { string: 6, fret: 3, isPalmMute: true },
            { string: 1, fret: 0 },
          ],
        },
      ],
    ],
  ]);
  const imported = convert(score);
  const note = columns(imported.document).find(
    (column) => column.type === "note",
  );
  assert.deepEqual(note.palmMuteSettings, { strings: [0] });
  assert.ok(
    !imported.warnings.some((warning) => /Partial palm muting/.test(warning)),
  );
  const parsed = tabDocumentSchema.parse(imported.document);
  const persisted = columns(parsed).find((column) => column.type === "note");
  assert.deepEqual(persisted.palmMuteSettings, { strings: [0] });
  assert.deepEqual(JSON.parse(tabNoteToArray(persisted)[11]), {
    depth: 0.55,
    strings: [0],
  });
  const invalid = structuredClone(imported.document);
  columns(invalid).find((column) => column.type === "note").palmMuteSettings = {
    depth: 2,
  };
  assert.equal(tabDocumentSchema.safeParse(invalid).success, false);
  const strum = {
    palmMute: "-",
    palmMuteSettings: { depth: 0.3, strings: [4, 5] },
    strum: "v",
    noteLength: "eighth",
  };
  const args = {
    chordIdx: 0,
    bpm: 120,
    strummingPattern: { strums: [strum] },
    chords: [{ name: "E", frets: ["0", "0", "1", "2", "2", "0"] }],
  };
  const chord = compileChord({ ...args, chordName: "E" });
  assert.equal(chord[7], "v");
  assert.equal(chord[8], "eighth");
  assert.deepEqual(JSON.parse(chord[11]), { depth: 0.3, strings: [4, 5] });
  const empty = compileChord({ ...args, chordName: "" });
  assert.equal(empty[0], "-");
  assert.ok(empty.slice(1, 7).every((value) => value === ""));
  assert.equal(empty[8], "eighth");
  assert.deepEqual(JSON.parse(empty[11]), { depth: 0.3, strings: [4, 5] });
  console.log(
    "PASS selective palm muting: source string coverage survives document validation and audio compilation",
  );
}

{
  const score = sustainScore([
    [
      [
        { duration: model.Duration.Quarter, notes: [{ string: 6, fret: 5 }] },
        {
          duration: model.Duration.Quarter,
          notes: [
            { string: 6, fret: 5, isTieDestination: true, isPalmMute: true },
          ],
          brushType: model.BrushType.BrushDown,
        },
        {
          duration: model.Duration.Quarter,
          notes: [{ string: 6, fret: 5, isTieDestination: true }],
        },
        { duration: model.Duration.Quarter },
      ],
    ],
  ]);
  const notes = noteColumns(score);
  assert.equal(notes.length, 4);
  assert.equal(notes[0].firstString, "5");
  assertSustain(notes[1]);
  assertSustain(notes[2]);
  assert.equal(
    notes[3].chordEffects,
    "r",
    "a true rest must still silence playback",
  );
  assert.ok(
    convert(score).warnings.every((w) => !/picked again|shortened/.test(w)),
  );
  console.log(
    "PASS tie chains: one attack, empty continuations, no copied effects and a true rest",
  );
}

{
  const score = sustainScore([
    [[{ duration: model.Duration.Whole, notes: [{ string: 6, fret: 5 }] }]],
    [
      [
        {
          duration: model.Duration.Half,
          notes: [{ string: 6, fret: 5, isTieDestination: true }],
        },
        {
          duration: model.Duration.Quarter,
          notes: [{ string: 6, fret: 5, isTieDestination: true }],
        },
        { duration: model.Duration.Quarter, notes: [{ string: 6, fret: 5 }] },
      ],
    ],
  ]);
  const notes = noteColumns(score);
  assert.deepEqual(
    notes.map((c) => c.noteLength),
    ["whole", "half", "quarter", "quarter"],
  );
  assert.equal(notes[0].firstString, "5");
  assertSustain(notes[1]);
  assertSustain(notes[2]);
  assert.equal(
    notes[3].firstString,
    "5",
    "an untied repeated pitch needs a fresh attack",
  );
  console.log(
    "PASS cross-measure ties preserve timing and untied repeated notes still pick",
  );
}

{
  const score = sustainScore([
    [
      [
        { duration: model.Duration.Half, notes: [{ string: 1, fret: 3 }] },
        { duration: model.Duration.Half },
      ],
      [
        { duration: model.Duration.Eighth },
        { duration: model.Duration.Eighth, notes: [{ string: 6, fret: 7 }] },
        { duration: model.Duration.Quarter },
        { duration: model.Duration.Half },
      ],
    ],
  ]);
  const notes = noteColumns(score);
  assert.deepEqual(
    notes.map((c) => c.noteLength),
    ["eighth", "eighth", "quarter", "half"],
  );
  assert.equal(notes[0].sixthString, "3");
  assert.equal(notes[1].firstString, "7");
  assert.equal(
    notes[1].sixthString,
    "",
    "another voice must not replay the held bass",
  );
  assertSustain(notes[2]);
  assert.equal(
    notes[3].chordEffects,
    "r",
    "rest only once every voice has finished",
  );
  assert.ok(convert(score).warnings.every((w) => !w.includes("shortened")));
  console.log(
    "PASS independent voices: onsets pick once, intervening rests allow sustained strings to ring",
  );
}

{
  const score = sustainScore([
    [
      [
        {
          duration: model.Duration.Quarter,
          notes: [
            { string: 1, fret: 3 },
            { string: 6, fret: 5 },
          ],
        },
        {
          duration: model.Duration.Quarter,
          notes: [
            { string: 1, fret: 3, isTieDestination: true, isPalmMute: true },
            { string: 6, fret: 7 },
          ],
        },
        { duration: model.Duration.Half },
      ],
    ],
  ]);
  const notes = noteColumns(score);
  assert.equal(notes[1].sixthString, "");
  assert.equal(notes[1].firstString, "7");
  assert.equal(
    notes[1].palmMute,
    "",
    "a tied note's mute must not affect new attacks",
  );
  console.log(
    "PASS mixed chords import new attacks while leaving tied strings empty",
  );
}

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
  console.log(
    "PASS effects: dead notes, vibrato, fallback report and closed palm-mute runs",
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

// Read capo settings from actual GP file bytes, then apply the resulting
// document to an editor with a different capo (including resetting it to zero).
for (const capo of [0, 3, 12, 22]) {
  const score = load();
  score.tracks[0].staves[0].capo = capo;
  const bytes = new exporter.Gp7Exporter().export(score);
  const parsed = readGuitarProScore(bytes, "capo.gp");
  assert.equal(parsed.tracks[0].staves[0].capo, capo);
  const { document } = convert(parsed);
  assert.equal(document.capo, capo);
  assert.equal(
    columns(document)[0].sixthString,
    "1",
    "capo must not shift written frets",
  );
  const store = createTabStore({ editing: true }, () => {});
  store.getState().setCapo(7);
  await Promise.resolve();
  store.getState().clearEditorHistory();
  store.getState().importDocument(document);
  assert.equal(
    store.getState().capo,
    capo,
    "import must set the file's capo on the tab",
  );
  store.getState().undo();
  assert.equal(store.getState().capo, 7);
  store.getState().redo();
  assert.equal(store.getState().capo, capo);
}
console.log(
  "PASS capo: GP file bytes preserve frets and capo through parsing, conversion, editor import, undo and redo",
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
