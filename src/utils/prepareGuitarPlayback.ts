import type {
  GuitarInstrument,
  GuitarSampleRequest,
} from "~/utils/guitarSampleTypes";

// Run before starting the audio clock, never inside the lookahead scheduler.
export async function prepareGuitarColumns(
  instrument: GuitarInstrument | null,
  columns: string[][],
  tuning: number[],
  capo: number,
) {
  if (!instrument?.prepareSamples) return;
  const notes = new Map<string, GuitarSampleRequest>();
  for (const column of columns) {
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      const note = column[stringIndex + 1];
      if (!note) continue;
      const fret = /\d+/.exec(note);
      if (!fret && note !== "x") continue;
      const midi = tuning[stringIndex]! + (fret ? Number(fret[0]) : 0) + capo;
      notes.set(`${stringIndex}:${midi}`, { midi, stringIndex });
      // Arbitrary slides can start up to two frets away from the written note.
      if (/^[\\/]/.test(note)) {
        for (const offset of [-2, 2]) {
          const nearby = { midi: midi + offset, stringIndex };
          notes.set(`${stringIndex}:${nearby.midi}`, nearby);
        }
      }
    }
  }
  await instrument.prepareSamples([...notes.values()]);
}
