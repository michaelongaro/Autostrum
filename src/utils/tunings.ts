import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";

export type Tuning = {
  name: string;
  notes: string;
  simpleNotes: string;
};

export const toString = (
  tuning: number[],
  options?: {
    pad: number;
  }
) => {
  // parse("") returns [36] which is a C, and we instead just want to return "     "
  // so that the tab has empty notes instead of C's.
  if (tuning.length === 1 && tuning[0] === 36) return "     ";

  return tuning
    .map((midi) =>
      midiToNoteName(midi, { pitchClass: true, sharps: true }).padEnd(
        options?.pad ?? 0,
        " "
      )
    )
    .reverse()
    .join(" ");
};

export const parse = (notes: string) => {
  return notes
    .split(" ")
    .map((name) => get(name).midi ?? (get(name).chroma ?? 0) + 12 * 3)
    .reverse();
};

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

export default tunings;
