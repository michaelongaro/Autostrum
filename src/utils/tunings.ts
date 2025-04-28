import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";

export type Tuning = {
  name: string;
  notes: string;
  simpleNotes: string;
};

function toString(
  tuning: number[],
  options?: {
    pad: number;
  },
) {
  // parse("") returns [36] which is a C, and we instead just want to return "     "
  // so that the tab has empty notes instead of C's.
  if (tuning.length === 1 && tuning[0] === 36) return "     ";

  let equidistantTuning = "";

  const baseTunings = tuning
    .map((midi) =>
      midiToNoteName(midi, { pitchClass: true, sharps: true }).padEnd(
        options?.pad ?? 0,
        " ",
      ),
    )
    .reverse();

  for (const note of baseTunings) {
    equidistantTuning += note.length === 1 ? `${note}  ` : `${note} `;
  }

  return equidistantTuning;
}

function parse(notes: string) {
  return notes
    .split(" ")
    .map((name) => get(name).midi ?? (get(name).chroma ?? 0) + 12 * 3)
    .reverse();
}

const tunings: Tuning[] = [
  {
    name: "Standard",
    notes: "E2 A2 D3 G3 B3 E4",
  },
  {
    name: "Open A",
    notes: "E2 A2 C#3 E3 A3 E4",
  },
  {
    name: "Open B",
    notes: "B1 F#2 B2 F#3 B3 D#4",
  },
  {
    name: "Open C",
    notes: "C2 G2 C3 G3 C4 E4",
  },
  {
    name: "Open D",
    notes: "D2 A2 D3 F#3 A3 D4",
  },
  {
    name: "Open E",
    notes: "E2 B2 E3 G#3 B3 E4",
  },
  {
    name: "Open F",
    notes: "C2 F2 C3 F3 A3 F4",
  },
  {
    name: "Open G",
    notes: "D2 G2 D3 G3 B3 D4",
  },
  {
    name: "Drop A",
    notes: "A1 E2 A2 D3 F#3 B3",
  },
  {
    name: "Drop A#",
    notes: "A#1 F2 A#2 D#3 G3 C4",
  },
  {
    name: "Drop B",
    notes: "B1 F#2 B2 E3 G#3 C#4",
  },
  {
    name: "Drop C",
    notes: "C2 G2 C3 F3 A3 D4",
  },
  {
    name: "Drop C#",
    notes: "C#2 G#2 C#3 F#3 A#3 D#4",
  },
  {
    name: "Drop D",
    notes: "D2 A2 D3 G3 B3 E4",
  },
  {
    name: "Drop D#",
    notes: "D#2 A#2 D#3 G#3 C4 F4",
  },
  {
    name: "Drop E",
    notes: "E2 B2 E3 A3 C#4 F#4",
  },
  {
    name: "Drop F",
    notes: "F2 C3 F3 A#3 D4 G4",
  },
  {
    name: "Drop F#",
    notes: "F#2 C#3 F#3 B3 D#4 G#4",
  },
  {
    name: "Drop G",
    notes: "G1 D2 G2 C3 E3 A3",
  },
  {
    name: "Drop G#",
    notes: "G#1 D#2 G#2 C#3 F3 A#3",
  },
  {
    name: "Math Rock",
    notes: "F2 A2 C3 G3 C4 E4",
  },
  {
    name: "Rondeña",
    notes: "D2 A2 D3 F#3 B3 E4",
  },
  {
    name: "Irish",
    notes: "D2 A2 D3 G3 A3 D4",
  },
].map((tuning) => ({
  ...tuning,
  simpleNotes: toString(parse(tuning.notes), { pad: 2 }),
}));

const tuningNotesToName = {
  "e2 a2 d3 g3 b3 e4": "Standard",
  "e2 a2 c#3 e3 a3 e4": "Open A",
  "b1 f#2 b2 f#3 b3 d#4": "Open B",
  "c2 g2 c3 g3 c4 e4": "Open C",
  "d2 a2 d3 f#3 a3 d4": "Open D",
  "e2 b2 e3 g#3 b3 e4": "Open E",
  "c2 f2 c3 f3 a3 f4": "Open F",
  "d2 g2 d3 g3 b3 d4": "Open G",
  "a1 e2 a2 d3 f#3 b3": "Drop A",
  "a#1 f2 a#2 d#3 g3 c4": "Drop A#",
  "b1 f#2 b2 e3 g#3 c#4": "Drop B",
  "c2 g2 c3 f3 a3 d4": "Drop C",
  "c#2 g#2 c#3 f#3 a#3 d#4": "Drop C#",
  "d2 a2 d3 g3 b3 e4": "Drop D",
  "d#2 a#2 d#3 g#3 c4 f4": "Drop D#",
  "e2 b2 e3 a3 c#4 f#4": "Drop E",
  "f2 c3 f3 a#3 d4 g4": "Drop F",
  "f#2 c#3 f#3 b3 d#4 g#4": "Drop F#",
  "g1 d2 g2 c3 e3 a3": "Drop G",
  "g#1 d#2 g#2 c#3 f3 a#3": "Drop G#",
  "f2 a2 c3 g3 c4 e4": "Math Rock",
  "d2 a2 d3 f#3 b3 e4": "Rondeña",
  "d2 a2 d3 g3 a3 d4": "Irish",
};

const tuningNotes = [
  "e2 a2 d3 g3 b3 e4",
  "e2 a2 c#3 e3 a3 e4",
  "b1 f#2 b2 f#3 b3 d#4",
  "c2 g2 c3 g3 c4 e4",
  "d2 a2 d3 f#3 a3 d4",
  "e2 b2 e3 g#3 b3 e4",
  "c2 f2 c3 f3 a3 f4",
  "d2 g2 d3 g3 b3 d4",
  "a1 e2 a2 d3 f#3 b3",
  "a#1 f2 a#2 d#3 g3 c4",
  "b1 f#2 b2 e3 g#3 c#4",
  "c2 g2 c3 f3 a3 d4",
  "c#2 g#2 c#3 f#3 a#3 d#4",
  "d2 a2 d3 g3 b3 e4",
  "d#2 a#2 d#3 g#3 c4 f4",
  "e2 b2 e3 a3 c#4 f#4",
  "f2 c3 f3 a#3 d4 g4",
  "f#2 c#3 f#3 b3 d#4 g#4",
  "g1 d2 g2 c3 e3 a3",
  "g#1 d#2 g#2 c#3 f3 a#3",
  "f2 a2 c3 g3 c4 e4",
  "d2 a2 d3 f#3 b3 e4",
  "d2 a2 d3 g3 a3 d4",
];

export { toString, parse, tunings, tuningNotes, tuningNotesToName };
