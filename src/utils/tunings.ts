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
  // parse("") returns [36], which is a C. Return spaces so that the tab
  // contains empty notes instead.
  if (tuning.length === 1 && tuning[0] === 36) return "     ";

  let equidistantTuning = "";

  const baseTunings = tuning
    .map((midi) =>
      midiToNoteName(midi, {
        pitchClass: true,
        sharps: true,
      }).padEnd(options?.pad ?? 0, " "),
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

const NOTE_ONLY_TOKEN_REGEX =
  /^(?<note>A#?|B|C#?|D#?|E|F#?|G#?)(?<octave>[0-8])?$/i;

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

    if (midi == null) continue;

    if (midi >= minMidi && midi <= maxMidi) {
      candidates.push(midi);
    }
  }

  return candidates;
}

function normalizeCustomTuningInput(input: string) {
  const tokens = input.trim().split(/\s+/).filter(Boolean);

  if (tokens.length !== 6) return null;

  const parsed: {
    note: string;
    octave: number | undefined;
  }[] = [];

  for (const token of tokens) {
    const match = NOTE_ONLY_TOKEN_REGEX.exec(token);

    if (!match?.groups?.note) return null;

    parsed.push({
      note: match.groups.note.toUpperCase(),
      octave:
        match.groups.octave !== undefined
          ? Number(match.groups.octave)
          : undefined,
    });
  }

  const candidatesPerString: number[][] = [];

  for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
    const { note, octave } = parsed[stringIndex]!;

    if (octave !== undefined) {
      const midi = get(`${note}${octave}`).midi;

      if (midi == null) return null;

      candidatesPerString.push([midi]);
      continue;
    }

    const candidates = getMidiCandidatesForString({
      note,
      stringIndex,
    });

    if (candidates.length === 0) return null;

    candidatesPerString.push(candidates);
  }

  type DPEntry = {
    cost: number;
    sumMidi: number;
    shift: number;
    prevIdx: number;
  };

  /*
   * Balance two goals when inferring octaves:
   *
   * 1. Keep each string near the register of standard guitar tuning.
   * 2. Keep the shifts of adjacent strings reasonably consistent.
   *
   * The register cost prevents an octave-lower tuning from winning merely
   * because it has the same shift consistency and a lower MIDI sum.
   */
  const REGISTER_WEIGHT = 1;
  const INTERVAL_WEIGHT = 2;

  const dp: DPEntry[][] = [];

  dp[0] = candidatesPerString[0]!.map((midi) => {
    const shift = midi - (STANDARD_TUNING_MIDI[0] ?? 0);

    return {
      cost: shift * shift * REGISTER_WEIGHT,
      sumMidi: midi,
      shift,
      prevIdx: -1,
    };
  });

  for (let stringIndex = 1; stringIndex < 6; stringIndex++) {
    const candidates = candidatesPerString[stringIndex]!;
    const previousCandidates = candidatesPerString[stringIndex - 1]!;

    dp[stringIndex] = candidates.map((midi) => {
      const currentShift = midi - (STANDARD_TUNING_MIDI[stringIndex] ?? 0);

      let best: DPEntry = {
        cost: Infinity,
        sumMidi: Infinity,
        shift: currentShift,
        prevIdx: -1,
      };

      for (
        let previousIndex = 0;
        previousIndex < previousCandidates.length;
        previousIndex++
      ) {
        const previousMidi = previousCandidates[previousIndex]!;

        // Guitar strings may be tuned in unison, but should not descend.
        if (midi < previousMidi) continue;

        const previous = dp[stringIndex - 1]![previousIndex]!;

        if (!Number.isFinite(previous.cost)) continue;

        const shiftDifference = currentShift - previous.shift;
        const registerCost = currentShift * currentShift * REGISTER_WEIGHT;
        const intervalCost =
          shiftDifference * shiftDifference * INTERVAL_WEIGHT;
        const newCost = previous.cost + registerCost + intervalCost;
        const newSumMidi = previous.sumMidi + midi;

        if (
          newCost < best.cost ||
          (newCost === best.cost && newSumMidi < best.sumMidi)
        ) {
          best = {
            cost: newCost,
            sumMidi: newSumMidi,
            shift: currentShift,
            prevIdx: previousIndex,
          };
        }
      }

      return best;
    });
  }

  let bestIndex = -1;
  let bestCost = Infinity;
  let bestSumMidi = Infinity;

  for (let index = 0; index < dp[5]!.length; index++) {
    const entry = dp[5]![index]!;

    if (
      entry.cost < bestCost ||
      (entry.cost === bestCost && entry.sumMidi < bestSumMidi)
    ) {
      bestCost = entry.cost;
      bestSumMidi = entry.sumMidi;
      bestIndex = index;
    }
  }

  if (bestIndex === -1 || !Number.isFinite(bestCost)) {
    return null;
  }

  const chosenCandidateIndices = Array.from({ length: 6 }, () => -1);

  chosenCandidateIndices[5] = bestIndex;

  for (let stringIndex = 5; stringIndex > 0; stringIndex--) {
    chosenCandidateIndices[stringIndex - 1] =
      dp[stringIndex]![chosenCandidateIndices[stringIndex]!]!.prevIdx;
  }

  if (chosenCandidateIndices.some((index) => index === -1)) {
    return null;
  }

  return chosenCandidateIndices.map((candidateIndex, stringIndex) =>
    midiToNoteName(candidatesPerString[stringIndex]![candidateIndex]!, {
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

function transposeTuningValue(input: string | null | undefined, semitones = 0) {
  const tuningNotes = getDisplayTuningNotes(input);

  if (semitones === 0) {
    return tuningNotes.join(" ");
  }

  return tuningNotes
    .map((note, index) => {
      const midi = get(note).midi ?? DEFAULT_TUNING_MIDI[index] ?? 40;

      return midiToNoteName(midi + semitones, {
        sharps: true,
      }).toLowerCase();
    })
    .join(" ");
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
  transposeTuningValue,
  normalizeCustomTuningInput,
  normalizeTuningValue,
};
