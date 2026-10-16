export const NORMAL_STRUM_SPREAD_MIN = 0;
export const NORMAL_STRUM_SPREAD_MAX = 0.15;
export const ARPEGGIO_STRUM_SPREAD_MIN = 0.16;
export const ARPEGGIO_STRUM_SPREAD_MAX = 0.3;

/** Auto total-spread curve endpoints (seconds) mapped from BPM 0 → 400. */
const NORMAL_AUTO_AT_0_BPM = 0.05;
const NORMAL_AUTO_AT_400_BPM = 0;
const ARPEGGIO_AUTO_AT_0_BPM = 0.21;
const ARPEGGIO_AUTO_AT_400_BPM = 0.16;

const QUICK_STRUM_FACTOR = 0.75;

/** Valid chord-effect strings, including optional arpeggio `~` on v/^ only. */
export const CHORD_EFFECTS_WITH_STRUM_REGEX = /^([v^]~?|s)(>|\.|>\.|\.>)?$/;
export const CHORD_EFFECTS_ACCENT_STACCATO_REGEX = /^(>|\.|>\.|\.>)$/;
export const CHORD_EFFECTS_REST_REGEX = /^r$/;

export function isValidChordEffectsInput(value: string): boolean {
  return (
    value === "" ||
    CHORD_EFFECTS_WITH_STRUM_REGEX.test(value) ||
    CHORD_EFFECTS_ACCENT_STACCATO_REGEX.test(value) ||
    CHORD_EFFECTS_REST_REGEX.test(value)
  );
}

export function isStrumEffect(effects: string | undefined | null): boolean {
  if (!effects) return false;
  return effects.includes("v") || effects.includes("^");
}

export function isArpeggiatedStrum(
  effects: string | undefined | null,
): boolean {
  return isStrumEffect(effects) && Boolean(effects?.includes("~"));
}

/**
 * Chord-effect characters that affect per-note audio (accent, staccato, strum
 * attack, slap, etc.). Excludes `~`, which on chord effects means arpeggiated
 * strum — fret vibrato `~` is parsed from the note string separately.
 */
export function chordEffectCharsForNoteAudio(chordEffects: string): string[] {
  return chordEffects.split("").filter((char) => char !== "~");
}

export function getStrumDirection(
  effects: string | undefined | null,
): "v" | "^" | null {
  if (!effects) return null;
  if (effects.includes("v")) return "v";
  if (effects.includes("^")) return "^";
  return null;
}

export function getStrumDisplayName(effects: string): string {
  const direction = getStrumDirection(effects);
  if (!direction) return "Strum";

  const base = direction === "v" ? "Downstrum" : "Upstrum";
  return isArpeggiatedStrum(effects) ? `Arpeggiated ${base}` : base;
}

/** Preserve ~ / > / . modifiers when changing strum direction or slap. */
export function setStrumDirectionInEffects(
  current: string,
  direction: "v" | "^" | "s",
): string {
  if (direction === "s") {
    const modifiers = current.replace(/^[v^s]~?/, "");
    return `s${modifiers}`;
  }

  const arpeggiated = current.includes("~") && !current.startsWith("s");
  const modifiers = current.replace(/^[v^s]~?/, "");
  return `${direction}${arpeggiated ? "~" : ""}${modifiers}`;
}

export function toggleArpeggioInEffects(current: string): string {
  const direction = getStrumDirection(current);
  if (!direction) return current;

  const modifiers = current.replace(/^[v^]~?/, "");
  const nextArpeggiated = !current.includes("~");
  return `${direction}${nextArpeggiated ? "~" : ""}${modifiers}`;
}

export function getStrumSpreadBounds(arpeggiated: boolean): {
  min: number;
  max: number;
} {
  return arpeggiated
    ? { min: ARPEGGIO_STRUM_SPREAD_MIN, max: ARPEGGIO_STRUM_SPREAD_MAX }
    : { min: NORMAL_STRUM_SPREAD_MIN, max: NORMAL_STRUM_SPREAD_MAX };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function remapStrumSpreadForType(
  seconds: number,
  arpeggiated: boolean,
): number {
  const { min, max } = getStrumSpreadBounds(arpeggiated);

  if (arpeggiated) {
    if (seconds >= ARPEGGIO_STRUM_SPREAD_MIN) {
      return clamp(seconds, min, max);
    }
    const t = clamp(seconds / NORMAL_STRUM_SPREAD_MAX, 0, 1);
    return min + t * (max - min);
  }

  if (seconds <= NORMAL_STRUM_SPREAD_MAX) {
    return clamp(seconds, min, max);
  }

  const span = ARPEGGIO_STRUM_SPREAD_MAX - ARPEGGIO_STRUM_SPREAD_MIN;
  const t =
    span === 0 ? 0 : clamp((seconds - ARPEGGIO_STRUM_SPREAD_MIN) / span, 0, 1);
  return min + t * (max - min);
}

export function calculateAutomaticStrumSpreadSeconds(
  bpm: number,
  arpeggiated: boolean,
  strumQuickly: boolean,
): number {
  const clampedBpm = Math.max(0, Math.min(400, bpm));
  const t = clampedBpm / 400;

  const raw = arpeggiated
    ? ARPEGGIO_AUTO_AT_0_BPM +
      t * (ARPEGGIO_AUTO_AT_400_BPM - ARPEGGIO_AUTO_AT_0_BPM)
    : NORMAL_AUTO_AT_0_BPM +
      t * (NORMAL_AUTO_AT_400_BPM - NORMAL_AUTO_AT_0_BPM);

  const withQuick = strumQuickly ? raw * QUICK_STRUM_FACTOR : raw;
  const { min, max } = getStrumSpreadBounds(arpeggiated);
  return clamp(withQuick, min, max);
}

export function resolveEffectiveStrumSpreadSeconds({
  effects,
  bpm,
  strumSpreadAuto,
  strumSpreadSeconds,
}: {
  effects: string | undefined | null;
  bpm: number;
  strumSpreadAuto?: boolean | null;
  strumSpreadSeconds?: number | null;
}): number {
  if (!isStrumEffect(effects)) return 0;

  const arpeggiated = isArpeggiatedStrum(effects);
  const strumQuickly =
    Boolean(effects?.includes(">")) || Boolean(effects?.includes("."));
  const auto = strumSpreadAuto ?? true;

  if (auto || strumSpreadSeconds === null || strumSpreadSeconds === undefined) {
    return calculateAutomaticStrumSpreadSeconds(bpm, arpeggiated, strumQuickly);
  }

  return remapStrumSpreadForType(strumSpreadSeconds, arpeggiated);
}

/** Encode for compiled playback column slot [10]. */
export function encodeStrumSpreadForCompile({
  effects,
  strumSpreadAuto,
  strumSpreadSeconds,
}: {
  effects: string;
  strumSpreadAuto?: boolean | null;
  strumSpreadSeconds?: number | null;
}): string {
  if (!isStrumEffect(effects)) return "";

  const auto = strumSpreadAuto ?? true;
  if (auto || strumSpreadSeconds === null || strumSpreadSeconds === undefined) {
    return "auto";
  }

  return String(
    remapStrumSpreadForType(strumSpreadSeconds, isArpeggiatedStrum(effects)),
  );
}

export function parseCompiledStrumSpread(
  value: string | undefined,
): { mode: "auto" } | { mode: "manual"; seconds: number } | { mode: "none" } {
  if (value === undefined || value === "") return { mode: "none" };
  if (value === "auto") return { mode: "auto" };

  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return { mode: "auto" };
  return { mode: "manual", seconds };
}

export function formatStrumSpreadDisplay(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}

export function getStrumSpreadMarkValues(arpeggiated: boolean): number[] {
  return arpeggiated ? [0.16, 0.2, 0.25, 0.3] : [0, 0.05, 0.1, 0.15];
}
