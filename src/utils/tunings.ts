import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";

export type Tuning = {
  name: string;
  notes: string;
  simpleNotes: string;
};

export const DEFAULT_TUNING = "e2 a2 d3 g3 b3 e4";
const DEFAULT_TUNING_NOTES = DEFAULT_TUNING.split(" ");
const DEFAULT_TUNING_MIDI = DEFAULT_TUNING_NOTES.map(
  (note) => get(note).midi ?? 40,
);

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
  return normalizeTuningValue(notes)
    .split(" ")
    .map((name, index) => get(name).midi ?? DEFAULT_TUNING_MIDI[index] ?? 40)
    .reverse();
}

const NOTE_ONLY_TOKEN_REGEX = /^(?<note>[A-G](?:#)?)(?<octave>[0-8])?$/i;
const STANDARD_TUNING_MIDI = DEFAULT_TUNING_MIDI;
const STRING_MIDI_RANGES: [number, number][] = [
  [28, 52],
  [33, 57],
  [38, 62],
  [43, 67],
  [47, 71],
  [52, 76],
];

function getMidiCandidatesForString({
  note,
  stringIndex,
}: {
  note: string;
  stringIndex: number;
}) {
  const [minMidi, maxMidi] = STRING_MIDI_RANGES[stringIndex] ?? [0, 127];
  const candidates: number[] = [];

  for (let octave = 0; octave <= 8; octave++) {
    const midi = get(`${note}${octave}`).midi;
    if (midi === null) continue;

    if (midi >= minMidi && midi <= maxMidi) {
      candidates.push(midi);
    }
  }

  return candidates;
}

function normalizeCustomTuningInput(input: string) {
  const tokens = input.trim().split(/\s+/).filter(Boolean);

  if (tokens.length !== 6) return null;

  const parsed: { note: string; octave: number | undefined }[] = [];
  for (const token of tokens) {
    const match = token.match(NOTE_ONLY_TOKEN_REGEX);
    if (!match?.groups?.note) return null;
    parsed.push({
      note: match.groups.note.toUpperCase(),
      octave:
        match.groups.octave !== undefined
          ? Number(match.groups.octave)
          : undefined,
    });
  }

  // Collect valid MIDI candidates for each string position
  const candidatesPerString: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const { note, octave } = parsed[i]!;
    if (octave !== undefined) {
      // User provided an explicit octave — trust it without range-checking.
      const midi = get(`${note}${octave}`).midi;
      if (midi === null) return null;
      candidatesPerString.push([midi]);
    } else {
      const candidates = getMidiCandidatesForString({ note, stringIndex: i });
      if (candidates.length === 0) return null;
      candidatesPerString.push(candidates);
    }
  }

  // DP to find the best non-descending combination.
  // Cost = shift-consistency penalty: (shift_i - shift_{i-1})^2, where
  // shift_i = candidateMidi - standardMidi for that string position.
  // This keeps all strings in the same register rather than greedily
  // snapping each string to the nearest standard-tuning value.
  // Tie-break: prefer lower register (more typical for guitar).
  type DPEntry = {
    cost: number;
    sumMidi: number;
    shift: number;
    prevIdx: number;
  };

  const SHIFT_WEIGHT = 1000;
  const dp: DPEntry[][] = [];

  dp[0] = candidatesPerString[0]!.map((midi) => ({
    cost: 0,
    sumMidi: midi,
    shift: midi - (STANDARD_TUNING_MIDI[0] ?? 0),
    prevIdx: -1,
  }));

  for (let s = 1; s < 6; s++) {
    const candidates = candidatesPerString[s]!;
    const prevCandidates = candidatesPerString[s - 1]!;

    dp[s] = candidates.map((midi) => {
      const currentShift = midi - (STANDARD_TUNING_MIDI[s] ?? 0);
      let best: DPEntry = {
        cost: Infinity,
        sumMidi: Infinity,
        shift: currentShift,
        prevIdx: -1,
      };

      for (let pi = 0; pi < prevCandidates.length; pi++) {
        if (midi < prevCandidates[pi]!) continue;
        const prev = dp[s - 1]![pi]!;
        if (prev.cost === Infinity) continue;

        const shiftDiff = currentShift - prev.shift;
        const newCost = prev.cost + shiftDiff * shiftDiff * SHIFT_WEIGHT;
        const newSumMidi = prev.sumMidi + midi;

        if (
          newCost < best.cost ||
          (newCost === best.cost && newSumMidi < best.sumMidi)
        ) {
          best = {
            cost: newCost,
            sumMidi: newSumMidi,
            shift: currentShift,
            prevIdx: pi,
          };
        }
      }

      return best;
    });
  }

  let bestIdx = -1;
  let bestCost = Infinity;
  let bestSum = Infinity;

  for (let i = 0; i < dp[5]!.length; i++) {
    const entry = dp[5]![i]!;
    if (
      entry.cost < bestCost ||
      (entry.cost === bestCost && entry.sumMidi < bestSum)
    ) {
      bestCost = entry.cost;
      bestSum = entry.sumMidi;
      bestIdx = i;
    }
  }

  if (bestIdx === -1 || bestCost === Infinity) return null;

  // Backtrack to recover chosen candidate indices
  const chosen: number[] = new Array(6);
  chosen[5] = bestIdx;
  for (let s = 5; s > 0; s--) {
    chosen[s - 1] = dp[s]![chosen[s]!]!.prevIdx;
  }

  if (chosen.some((idx, s) => s > 0 && idx === -1)) return null;

  return chosen.map((ci, s) =>
    midiToNoteName(candidatesPerString[s]![ci]!, {
      sharps: true,
    }).toLowerCase(),
  );
}

function normalizeTuningValue(input: string | null | undefined) {
  const normalized = normalizeCustomTuningInput(input ?? "");

  return (normalized ?? DEFAULT_TUNING_NOTES).join(" ");
}

function getDisplayTuningNotes(input: string | null | undefined) {
  return normalizeTuningValue(input).split(" ");
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

export {
  toString,
  parse,
  tunings,
  tuningNotes,
  tuningNotesToName,
  getDisplayTuningNotes,
  normalizeCustomTuningInput,
  normalizeTuningValue,
};
