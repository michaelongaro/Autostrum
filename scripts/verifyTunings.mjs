// Run with: node --experimental-strip-types scripts/verifyTunings.mjs
import assert from "node:assert/strict";
import { get } from "@tonaljs/note";
import {
  DEFAULT_TUNING,
  formatTuningInput,
  getDisplayTuningNotes,
  getTuningName,
  isValidScientificTuningNote,
  normalizeCustomTuningInput,
  normalizeTuningValue,
  parse,
  stripTuningOctaves,
  transposeTuningValue,
  toString,
  tuningNotes,
  tuningNotesToName,
  tunings,
} from "../src/utils/tunings.ts";

const E_FLAT_TUNING = "eb2 ab2 db3 gb3 bb3 eb4";

assert.equal(normalizeTuningValue("E A D G B E"), DEFAULT_TUNING);
assert.equal(normalizeTuningValue("Eb Ab Db Gb Bb Eb"), E_FLAT_TUNING);
assert.equal(normalizeTuningValue("E♭ A♭ D♭ G♭ B♭ E♭"), E_FLAT_TUNING);
assert.equal(normalizeTuningValue("E♭2 A♭2 D♭3 G♭3 B♭3 E♭4"), E_FLAT_TUNING);
assert.deepEqual(parse(E_FLAT_TUNING), [63, 58, 54, 49, 44, 39]);
assert.equal(
  toString(parse(E_FLAT_TUNING), { pad: 0, sharps: false })
    .trim()
    .split(/\s+/)
    .join(" "),
  "Eb Ab Db Gb Bb Eb",
);
assert.deepEqual(parse("D#2 G#2 C#3 F#3 A#3 D#4"), parse(E_FLAT_TUNING));

// Every letter may be sharp or flat throughout the advertised octave range.
for (const letter of "ABCDEFG") {
  for (const accidental of ["", "#", "b", "♯", "♭"]) {
    for (let octave = 0; octave <= 8; octave++) {
      const note = `${letter}${accidental}${octave}`;
      const asciiNote = note.replaceAll("♯", "#").replaceAll("♭", "b");
      assert.equal(isValidScientificTuningNote(note), true, note);
      const notes = normalizeCustomTuningInput(Array(6).fill(note).join(" "));
      assert.deepEqual(notes, Array(6).fill(asciiNote.toLowerCase()), note);
      assert.deepEqual(
        parse(Array(6).fill(note).join(" ")),
        Array(6).fill(get(asciiNote).midi),
        note,
      );
    }
  }
}

// Enharmonic notes cross the C/B octave boundary without losing their spelling.
assert.deepEqual(normalizeCustomTuningInput("B#2 Cb3 E#3 Fb4 G8 B8"), [
  "b#2",
  "cb3",
  "e#3",
  "fb4",
  "g8",
  "b8",
]);
assert.deepEqual(parse("B#2 Cb3 E#3 Fb4 G8 B8"), [119, 115, 64, 53, 47, 48]);
const inferredEnharmonics = normalizeCustomTuningInput("B# E# Cb Fb A# B#");
assert.ok(inferredEnharmonics);
assert.deepEqual(
  inferredEnharmonics.map((note) => note.slice(0, -1)),
  ["b#", "e#", "cb", "fb", "a#", "b#"],
);

// Scientific notation supports explicit reentrant string order.
assert.equal(normalizeTuningValue("E4 A2 D3 G3 B3 E2"), "e4 a2 d3 g3 b3 e2");

for (const note of ["H2", "C9", "C-1", "C10", "Cbb4", "Cx4"]) {
  assert.equal(isValidScientificTuningNote(note), false, note);
  assert.equal(normalizeCustomTuningInput(Array(6).fill(note).join(" ")), null);
}
assert.equal(isValidScientificTuningNote("C"), false);
assert.equal(isValidScientificTuningNote("C#"), false);
assert.equal(normalizeCustomTuningInput("E A D G B"), null);
assert.equal(normalizeCustomTuningInput("E A D G B E A"), null);
assert.equal(normalizeCustomTuningInput("E A D G B H"), null);
assert.equal(normalizeTuningValue("invalid"), DEFAULT_TUNING);

assert.equal(transposeTuningValue(E_FLAT_TUNING, 0), E_FLAT_TUNING);
assert.equal(transposeTuningValue(E_FLAT_TUNING, 1), DEFAULT_TUNING);
assert.equal(transposeTuningValue(E_FLAT_TUNING, 2), "f2 bb2 eb3 ab3 c4 f4");
assert.equal(transposeTuningValue(DEFAULT_TUNING, 2), "f#2 b2 e3 a3 c#4 f#4");
assert.equal(formatTuningInput("b bb b# eb2 cb0 e♯8"), "B B♭ B# E♭2 C♭0 E#8");
assert.equal(
  formatTuningInput(stripTuningOctaves(E_FLAT_TUNING)),
  "E♭ A♭ D♭ G♭ B♭ E♭",
);
assert.equal(stripTuningOctaves("b#2 cb3 e#3 fb4 g8 b8"), "b# cb e# fb g b");
assert.ok(stripTuningOctaves(E_FLAT_TUNING).length <= 17);
assert.deepEqual(
  getDisplayTuningNotes(E_FLAT_TUNING),
  E_FLAT_TUNING.split(" "),
);

const eFlatPreset = tunings.find(({ name }) => name === "E♭");
assert.ok(eFlatPreset);
assert.equal(eFlatPreset.notes, E_FLAT_TUNING);
assert.equal(eFlatPreset.simpleNotes, "eb ab db gb bb eb");
assert.ok(tuningNotes.includes(E_FLAT_TUNING));
assert.equal(tuningNotesToName[E_FLAT_TUNING], "E♭");
assert.equal(getTuningName("E♭2 A♭2 D♭3 G♭3 B♭3 E♭4"), "E♭");
assert.equal(getTuningName("eb2 ab2 db3 gb3 bb3 eb4"), "E♭");
assert.equal(getTuningName("invalid"), undefined);
for (const tuning of tunings) {
  assert.equal(normalizeTuningValue(tuning.notes), tuning.notes, tuning.name);
  assert.equal(parse(tuning.notes).length, 6, tuning.name);
}

console.log(
  "Tuning checks passed: accidentals, octaves, inference, MIDI, display, transposition, and presets.",
);
