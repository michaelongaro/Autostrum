/** Playback indexes run from high E (0) to low E (5), including retuned strings. */
export interface PalmMuteSettings {
  /** 0 = light contact, 1 = firm contact. Omitting it uses the instrument default. */
  depth?: number;
  /** Omitted means all six strings; an empty array means no strings. */
  strings?: number[];
}

export function normalizePalmMuteSettings(value?: PalmMuteSettings) {
  return {
    depth: Number.isFinite(value?.depth)
      ? Math.max(0, Math.min(1, value!.depth!))
      : 0.55,
    strings:
      value?.strings === undefined
        ? [0, 1, 2, 3, 4, 5]
        : [...new Set(value.strings)].filter(
            (index) => Number.isInteger(index) && index >= 0 && index < 6,
          ),
  };
}

/** Optional compiled slot 11. Leave legacy columns exactly as they were. */
export function encodePalmMuteSettings(settings?: PalmMuteSettings): string[] {
  return settings ? [JSON.stringify(normalizePalmMuteSettings(settings))] : [];
}

export function parsePalmMuteSettings(
  value?: string,
): PalmMuteSettings | undefined {
  if (!value) return;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return;
    const settings = parsed as PalmMuteSettings;
    if (settings.depth !== undefined && typeof settings.depth !== "number")
      return;
    if (settings.strings !== undefined && !Array.isArray(settings.strings))
      return;
    return normalizePalmMuteSettings(settings);
  } catch {
    // Legacy/malformed playback metadata must never prevent a note sounding.
    return;
  }
}

/** Synthesis tuning, not a claim of measured behavior for a particular guitar. */
export function palmMuteProfile(
  instrument: string,
  midi: number,
  stringIdx: number,
  depth = 0.55,
  hit = 0,
  accented = false,
) {
  const bass = Math.max(0, Math.min(5, stringIdx)) / 5;
  const nylon = instrument === "acoustic_guitar_nylon";
  const jazz = instrument === "electric_guitar_jazz";
  const electric = instrument.startsWith("electric_");
  // Small reproducible pressure/tone changes, with no pitch or onset jitter.
  const pressure = [0, -0.014, 0.012, -0.006][hit % 4]!;
  const contact = Math.max(0, Math.min(1, depth + pressure));
  const fundamental = 440 * 2 ** ((midi - 69) / 12);
  const decay =
    (0.022 + 0.065 * (1 - contact) ** 1.3) *
    (0.86 + bass * 0.19) *
    (nylon ? 0.92 : jazz ? 1.03 : electric ? 0.96 : 1);
  const color = (nylon ? 0.88 : jazz ? 0.9 : 1) * (accented ? 1.12 : 1);
  const variation = [1, 0.982, 1.012, 0.993][hit % 4]!;
  // Compensate for the short envelope and harmonic losses so a muted pluck
  // sits close to an ordinary note in level. The clean-electric recordings
  // lose more energy through this articulation and need extra makeup gain.
  const makeupGain = instrument === "electric_guitar_clean" ? 3.1 : 1.9;
  return {
    depth: contact,
    decay,
    duration: decay * 6.2,
    attack: (0.0015 + bass * 0.0006) * (nylon ? 1.2 : 1),
    level: (nylon ? 0.94 : 0.98) * variation * makeupGain,
    attackCutoff: Math.min(14000, Math.max(2200, fundamental * 18)) * color,
    bodyCutoff:
      Math.min(6500, Math.max(420, fundamental * (6 - contact * 2))) * color,
    overtoneHz: fundamental * (2.4 + bass * 0.4),
    pickHz: fundamental * (7 + bass),
    overtoneLoss: 8 + contact * 12,
    pickLoss: 14 + contact * 14,
  };
}

export type PalmMuteProfile = ReturnType<typeof palmMuteProfile>;
