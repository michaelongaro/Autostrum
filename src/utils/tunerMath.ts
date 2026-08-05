/** Pure pitch/frequency helpers shared by the tuner hook and UI. */

export function midiFromFrequency(frequency: number) {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

export function frequencyFromMidi(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function centsBetweenFrequencies(a: number, b: number) {
  return 1200 * Math.log2(a / b);
}

export function isSingleOctaveJump(a: number, b: number) {
  return Math.abs(a - b) === 12 && a % 12 === b % 12;
}

export function formatNoteLabel(note: string) {
  const normalized = note.trim();
  if (!normalized) return "";

  return `${normalized[0]?.toUpperCase() ?? ""}${normalized.slice(1)}`;
}
