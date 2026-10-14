# Meta Steel Guitar — Audio Design Specification

## Overview

A steel-string acoustic guitar multi-sampled string-by-string, with three discrete
velocity layers per note. Every one of the six
strings is captured chromatically across its first 21 frets, so the same pitch is
available from several different strings — each with the timbre and body of that
string's position on the neck. Warm and woody in the low register, bright and
cutting toward the top. Suited to melodic content, fingerpicked and strummed
accompaniment, interactive instruments, and any context that needs a real acoustic
guitar rather than a generic plucked-string tone.

375 samples, 48.7 minutes of source audio, chromatic across E2–C6 (MIDI 40–84).

## String Overview

| String | Open Note | MIDI | Sampled Range | Notes | Samples |
|--------|-----------|------|---------------|-------|---------|
| Low E | E2 | 40 | E2–C4 (MIDI 40–60) | 20 | 60 |
| A | A2 | 45 | A2–F4 (MIDI 45–65) | 21 | 63 |
| D | D3 | 50 | D3–A#4 (MIDI 50–70) | 21 | 63 |
| G | G3 | 55 | G3–D#5 (MIDI 55–75) | 21 | 63 |
| B | B3 | 59 | B3–G5 (MIDI 59–79) | 21 | 63 |
| High E | E4 | 64 | E4–C6 (MIDI 64–84) | 21 | 63 |

Per-string coverage is listed in full under [String Selection](#string-selection);
consult it rather than assuming every pitch in a string's range is present.

## Velocity Layers

Three discrete dynamic layers per note. Measured across all 125 string/note pairs:

| Layer | Dynamic | Mean Peak | Mean Attack Brightness | Mean Duration |
|-------|---------|-----------|------------------------|---------------|
| `Vel01` | Soft (p) | −17.7 dBFS | 1179 Hz | 7.15 s |
| `Vel02` | Medium (mf) | −16.4 dBFS | 1548 Hz | 7.76 s |
| `Vel03` | Hard (f) | −10.4 dBFS | 2282 Hz | 8.47 s |

**The layers are separated more by timbre than by level.** `Vel01` and `Vel02` differ
by only ~1.3 dB in peak amplitude but ~370 Hz in attack brightness; `Vel03` jumps
both level (+6 dB) and brightness (+734 Hz). An implementation that distinguishes
layers by amplitude alone will make `Vel01` and `Vel02` nearly indistinguishable —
the dynamic difference between them lives in the spectral content of the pick
attack, so play the samples unmodified rather than scaling a single layer's gain.

Harder strokes also ring longer: mean sustain grows from 7.15 s at `Vel01` to
8.47 s at `Vel03`.

## Filename Pattern

```
INSGuitarSteel_String{String}_Vel{Layer}_{Note}_01.wav
```

| Field | Values |
|-------|--------|
| String | `StringLowE`, `StringA`, `StringD`, `StringG`, `StringB`, `StringHighE` |
| Layer | `Vel01` (soft), `Vel02` (medium), `Vel03` (hard) |
| Note | Scientific pitch, sharps written `s` — `A2`, `As2`, `Cs3`, `Ds5` |
| Variation | Always `01`; one take per string/note/layer |

Sharps use `s` rather than `#` so filenames stay safe in URLs and object-store paths.

## String Selection

Most pitches exist on more than one string. Higher strings give a brighter, thinner
tone for the same pitch; lower strings give more body and a slower attack. For a
realistic result, choose the string a player would actually use — generally the
lowest string that reaches the pitch without going far up the neck — rather than
always defaulting to one string.

| MIDI | Note | Available On |
|------|------|--------------|
| 40 | E2 | Low E |
| 41 | F2 | Low E |
| 42 | F#2 | Low E |
| 43 | G2 | Low E |
| 44 | G#2 | Low E |
| 45 | A2 | Low E, A |
| 46 | A#2 | Low E, A |
| 47 | B2 | A |
| 48 | C3 | Low E, A |
| 49 | C#3 | Low E, A |
| 50 | D3 | Low E, A, D |
| 51 | D#3 | Low E, A, D |
| 52 | E3 | Low E, A, D |
| 53 | F3 | Low E, A, D |
| 54 | F#3 | Low E, A, D |
| 55 | G3 | Low E, A, D, G |
| 56 | G#3 | Low E, A, D, G |
| 57 | A3 | Low E, A, D, G |
| 58 | A#3 | Low E, A, D, G |
| 59 | B3 | Low E, A, D, G, B |
| 60 | C4 | Low E, A, D, G, B |
| 61 | C#4 | A, D, G, B |
| 62 | D4 | A, D, G, B |
| 63 | D#4 | A, D, G, B |
| 64 | E4 | A, D, G, B, High E |
| 65 | F4 | A, D, G, B, High E |
| 66 | F#4 | D, G, B, High E |
| 67 | G4 | D, G, B, High E |
| 68 | G#4 | D, G, B, High E |
| 69 | A4 | D, G, B, High E |
| 70 | A#4 | D, G, B, High E |
| 71 | B4 | G, B, High E |
| 72 | C5 | G, B, High E |
| 73 | C#5 | G, B, High E |
| 74 | D5 | G, B, High E |
| 75 | D#5 | G, B, High E |
| 76 | E5 | B, High E |
| 77 | F5 | B, High E |
| 78 | F#5 | B, High E |
| 79 | G5 | B, High E |
| 80 | G#5 | High E |
| 81 | A5 | High E |
| 82 | A#5 | High E |
| 83 | B5 | High E |
| 84 | C6 | High E |

## Sample Inventory

125 string/note pairs x 3 velocity layers = 375 samples.

### Low E String — 20 notes, 60 samples

| Note | MIDI | Vel01 (soft) | Vel02 (medium) | Vel03 (hard) |
|------|------|--------------|----------------|--------------|
| E2 | 40 | INSGuitarSteel_StringLowE_Vel01_E2_01.wav | INSGuitarSteel_StringLowE_Vel02_E2_01.wav | INSGuitarSteel_StringLowE_Vel03_E2_01.wav |
| F2 | 41 | INSGuitarSteel_StringLowE_Vel01_F2_01.wav | INSGuitarSteel_StringLowE_Vel02_F2_01.wav | INSGuitarSteel_StringLowE_Vel03_F2_01.wav |
| F#2 | 42 | INSGuitarSteel_StringLowE_Vel01_Fs2_01.wav | INSGuitarSteel_StringLowE_Vel02_Fs2_01.wav | INSGuitarSteel_StringLowE_Vel03_Fs2_01.wav |
| G2 | 43 | INSGuitarSteel_StringLowE_Vel01_G2_01.wav | INSGuitarSteel_StringLowE_Vel02_G2_01.wav | INSGuitarSteel_StringLowE_Vel03_G2_01.wav |
| G#2 | 44 | INSGuitarSteel_StringLowE_Vel01_Gs2_01.wav | INSGuitarSteel_StringLowE_Vel02_Gs2_01.wav | INSGuitarSteel_StringLowE_Vel03_Gs2_01.wav |
| A2 | 45 | INSGuitarSteel_StringLowE_Vel01_A2_01.wav | INSGuitarSteel_StringLowE_Vel02_A2_01.wav | INSGuitarSteel_StringLowE_Vel03_A2_01.wav |
| A#2 | 46 | INSGuitarSteel_StringLowE_Vel01_As2_01.wav | INSGuitarSteel_StringLowE_Vel02_As2_01.wav | INSGuitarSteel_StringLowE_Vel03_As2_01.wav |
| C3 | 48 | INSGuitarSteel_StringLowE_Vel01_C3_01.wav | INSGuitarSteel_StringLowE_Vel02_C3_01.wav | INSGuitarSteel_StringLowE_Vel03_C3_01.wav |
| C#3 | 49 | INSGuitarSteel_StringLowE_Vel01_Cs3_01.wav | INSGuitarSteel_StringLowE_Vel02_Cs3_01.wav | INSGuitarSteel_StringLowE_Vel03_Cs3_01.wav |
| D3 | 50 | INSGuitarSteel_StringLowE_Vel01_D3_01.wav | INSGuitarSteel_StringLowE_Vel02_D3_01.wav | INSGuitarSteel_StringLowE_Vel03_D3_01.wav |
| D#3 | 51 | INSGuitarSteel_StringLowE_Vel01_Ds3_01.wav | INSGuitarSteel_StringLowE_Vel02_Ds3_01.wav | INSGuitarSteel_StringLowE_Vel03_Ds3_01.wav |
| E3 | 52 | INSGuitarSteel_StringLowE_Vel01_E3_01.wav | INSGuitarSteel_StringLowE_Vel02_E3_01.wav | INSGuitarSteel_StringLowE_Vel03_E3_01.wav |
| F3 | 53 | INSGuitarSteel_StringLowE_Vel01_F3_01.wav | INSGuitarSteel_StringLowE_Vel02_F3_01.wav | INSGuitarSteel_StringLowE_Vel03_F3_01.wav |
| F#3 | 54 | INSGuitarSteel_StringLowE_Vel01_Fs3_01.wav | INSGuitarSteel_StringLowE_Vel02_Fs3_01.wav | INSGuitarSteel_StringLowE_Vel03_Fs3_01.wav |
| G3 | 55 | INSGuitarSteel_StringLowE_Vel01_G3_01.wav | INSGuitarSteel_StringLowE_Vel02_G3_01.wav | INSGuitarSteel_StringLowE_Vel03_G3_01.wav |
| G#3 | 56 | INSGuitarSteel_StringLowE_Vel01_Gs3_01.wav | INSGuitarSteel_StringLowE_Vel02_Gs3_01.wav | INSGuitarSteel_StringLowE_Vel03_Gs3_01.wav |
| A3 | 57 | INSGuitarSteel_StringLowE_Vel01_A3_01.wav | INSGuitarSteel_StringLowE_Vel02_A3_01.wav | INSGuitarSteel_StringLowE_Vel03_A3_01.wav |
| A#3 | 58 | INSGuitarSteel_StringLowE_Vel01_As3_01.wav | INSGuitarSteel_StringLowE_Vel02_As3_01.wav | INSGuitarSteel_StringLowE_Vel03_As3_01.wav |
| B3 | 59 | INSGuitarSteel_StringLowE_Vel01_B3_01.wav | INSGuitarSteel_StringLowE_Vel02_B3_01.wav | INSGuitarSteel_StringLowE_Vel03_B3_01.wav |
| C4 | 60 | INSGuitarSteel_StringLowE_Vel01_C4_01.wav | INSGuitarSteel_StringLowE_Vel02_C4_01.wav | INSGuitarSteel_StringLowE_Vel03_C4_01.wav |

### A String — 21 notes, 63 samples

| Note | MIDI | Vel01 (soft) | Vel02 (medium) | Vel03 (hard) |
|------|------|--------------|----------------|--------------|
| A2 | 45 | INSGuitarSteel_StringA_Vel01_A2_01.wav | INSGuitarSteel_StringA_Vel02_A2_01.wav | INSGuitarSteel_StringA_Vel03_A2_01.wav |
| A#2 | 46 | INSGuitarSteel_StringA_Vel01_As2_01.wav | INSGuitarSteel_StringA_Vel02_As2_01.wav | INSGuitarSteel_StringA_Vel03_As2_01.wav |
| B2 | 47 | INSGuitarSteel_StringA_Vel01_B2_01.wav | INSGuitarSteel_StringA_Vel02_B2_01.wav | INSGuitarSteel_StringA_Vel03_B2_01.wav |
| C3 | 48 | INSGuitarSteel_StringA_Vel01_C3_01.wav | INSGuitarSteel_StringA_Vel02_C3_01.wav | INSGuitarSteel_StringA_Vel03_C3_01.wav |
| C#3 | 49 | INSGuitarSteel_StringA_Vel01_Cs3_01.wav | INSGuitarSteel_StringA_Vel02_Cs3_01.wav | INSGuitarSteel_StringA_Vel03_Cs3_01.wav |
| D3 | 50 | INSGuitarSteel_StringA_Vel01_D3_01.wav | INSGuitarSteel_StringA_Vel02_D3_01.wav | INSGuitarSteel_StringA_Vel03_D3_01.wav |
| D#3 | 51 | INSGuitarSteel_StringA_Vel01_Ds3_01.wav | INSGuitarSteel_StringA_Vel02_Ds3_01.wav | INSGuitarSteel_StringA_Vel03_Ds3_01.wav |
| E3 | 52 | INSGuitarSteel_StringA_Vel01_E3_01.wav | INSGuitarSteel_StringA_Vel02_E3_01.wav | INSGuitarSteel_StringA_Vel03_E3_01.wav |
| F3 | 53 | INSGuitarSteel_StringA_Vel01_F3_01.wav | INSGuitarSteel_StringA_Vel02_F3_01.wav | INSGuitarSteel_StringA_Vel03_F3_01.wav |
| F#3 | 54 | INSGuitarSteel_StringA_Vel01_Fs3_01.wav | INSGuitarSteel_StringA_Vel02_Fs3_01.wav | INSGuitarSteel_StringA_Vel03_Fs3_01.wav |
| G3 | 55 | INSGuitarSteel_StringA_Vel01_G3_01.wav | INSGuitarSteel_StringA_Vel02_G3_01.wav | INSGuitarSteel_StringA_Vel03_G3_01.wav |
| G#3 | 56 | INSGuitarSteel_StringA_Vel01_Gs3_01.wav | INSGuitarSteel_StringA_Vel02_Gs3_01.wav | INSGuitarSteel_StringA_Vel03_Gs3_01.wav |
| A3 | 57 | INSGuitarSteel_StringA_Vel01_A3_01.wav | INSGuitarSteel_StringA_Vel02_A3_01.wav | INSGuitarSteel_StringA_Vel03_A3_01.wav |
| A#3 | 58 | INSGuitarSteel_StringA_Vel01_As3_01.wav | INSGuitarSteel_StringA_Vel02_As3_01.wav | INSGuitarSteel_StringA_Vel03_As3_01.wav |
| B3 | 59 | INSGuitarSteel_StringA_Vel01_B3_01.wav | INSGuitarSteel_StringA_Vel02_B3_01.wav | INSGuitarSteel_StringA_Vel03_B3_01.wav |
| C4 | 60 | INSGuitarSteel_StringA_Vel01_C4_01.wav | INSGuitarSteel_StringA_Vel02_C4_01.wav | INSGuitarSteel_StringA_Vel03_C4_01.wav |
| C#4 | 61 | INSGuitarSteel_StringA_Vel01_Cs4_01.wav | INSGuitarSteel_StringA_Vel02_Cs4_01.wav | INSGuitarSteel_StringA_Vel03_Cs4_01.wav |
| D4 | 62 | INSGuitarSteel_StringA_Vel01_D4_01.wav | INSGuitarSteel_StringA_Vel02_D4_01.wav | INSGuitarSteel_StringA_Vel03_D4_01.wav |
| D#4 | 63 | INSGuitarSteel_StringA_Vel01_Ds4_01.wav | INSGuitarSteel_StringA_Vel02_Ds4_01.wav | INSGuitarSteel_StringA_Vel03_Ds4_01.wav |
| E4 | 64 | INSGuitarSteel_StringA_Vel01_E4_01.wav | INSGuitarSteel_StringA_Vel02_E4_01.wav | INSGuitarSteel_StringA_Vel03_E4_01.wav |
| F4 | 65 | INSGuitarSteel_StringA_Vel01_F4_01.wav | INSGuitarSteel_StringA_Vel02_F4_01.wav | INSGuitarSteel_StringA_Vel03_F4_01.wav |

### D String — 21 notes, 63 samples

| Note | MIDI | Vel01 (soft) | Vel02 (medium) | Vel03 (hard) |
|------|------|--------------|----------------|--------------|
| D3 | 50 | INSGuitarSteel_StringD_Vel01_D3_01.wav | INSGuitarSteel_StringD_Vel02_D3_01.wav | INSGuitarSteel_StringD_Vel03_D3_01.wav |
| D#3 | 51 | INSGuitarSteel_StringD_Vel01_Ds3_01.wav | INSGuitarSteel_StringD_Vel02_Ds3_01.wav | INSGuitarSteel_StringD_Vel03_Ds3_01.wav |
| E3 | 52 | INSGuitarSteel_StringD_Vel01_E3_01.wav | INSGuitarSteel_StringD_Vel02_E3_01.wav | INSGuitarSteel_StringD_Vel03_E3_01.wav |
| F3 | 53 | INSGuitarSteel_StringD_Vel01_F3_01.wav | INSGuitarSteel_StringD_Vel02_F3_01.wav | INSGuitarSteel_StringD_Vel03_F3_01.wav |
| F#3 | 54 | INSGuitarSteel_StringD_Vel01_Fs3_01.wav | INSGuitarSteel_StringD_Vel02_Fs3_01.wav | INSGuitarSteel_StringD_Vel03_Fs3_01.wav |
| G3 | 55 | INSGuitarSteel_StringD_Vel01_G3_01.wav | INSGuitarSteel_StringD_Vel02_G3_01.wav | INSGuitarSteel_StringD_Vel03_G3_01.wav |
| G#3 | 56 | INSGuitarSteel_StringD_Vel01_Gs3_01.wav | INSGuitarSteel_StringD_Vel02_Gs3_01.wav | INSGuitarSteel_StringD_Vel03_Gs3_01.wav |
| A3 | 57 | INSGuitarSteel_StringD_Vel01_A3_01.wav | INSGuitarSteel_StringD_Vel02_A3_01.wav | INSGuitarSteel_StringD_Vel03_A3_01.wav |
| A#3 | 58 | INSGuitarSteel_StringD_Vel01_As3_01.wav | INSGuitarSteel_StringD_Vel02_As3_01.wav | INSGuitarSteel_StringD_Vel03_As3_01.wav |
| B3 | 59 | INSGuitarSteel_StringD_Vel01_B3_01.wav | INSGuitarSteel_StringD_Vel02_B3_01.wav | INSGuitarSteel_StringD_Vel03_B3_01.wav |
| C4 | 60 | INSGuitarSteel_StringD_Vel01_C4_01.wav | INSGuitarSteel_StringD_Vel02_C4_01.wav | INSGuitarSteel_StringD_Vel03_C4_01.wav |
| C#4 | 61 | INSGuitarSteel_StringD_Vel01_Cs4_01.wav | INSGuitarSteel_StringD_Vel02_Cs4_01.wav | INSGuitarSteel_StringD_Vel03_Cs4_01.wav |
| D4 | 62 | INSGuitarSteel_StringD_Vel01_D4_01.wav | INSGuitarSteel_StringD_Vel02_D4_01.wav | INSGuitarSteel_StringD_Vel03_D4_01.wav |
| D#4 | 63 | INSGuitarSteel_StringD_Vel01_Ds4_01.wav | INSGuitarSteel_StringD_Vel02_Ds4_01.wav | INSGuitarSteel_StringD_Vel03_Ds4_01.wav |
| E4 | 64 | INSGuitarSteel_StringD_Vel01_E4_01.wav | INSGuitarSteel_StringD_Vel02_E4_01.wav | INSGuitarSteel_StringD_Vel03_E4_01.wav |
| F4 | 65 | INSGuitarSteel_StringD_Vel01_F4_01.wav | INSGuitarSteel_StringD_Vel02_F4_01.wav | INSGuitarSteel_StringD_Vel03_F4_01.wav |
| F#4 | 66 | INSGuitarSteel_StringD_Vel01_Fs4_01.wav | INSGuitarSteel_StringD_Vel02_Fs4_01.wav | INSGuitarSteel_StringD_Vel03_Fs4_01.wav |
| G4 | 67 | INSGuitarSteel_StringD_Vel01_G4_01.wav | INSGuitarSteel_StringD_Vel02_G4_01.wav | INSGuitarSteel_StringD_Vel03_G4_01.wav |
| G#4 | 68 | INSGuitarSteel_StringD_Vel01_Gs4_01.wav | INSGuitarSteel_StringD_Vel02_Gs4_01.wav | INSGuitarSteel_StringD_Vel03_Gs4_01.wav |
| A4 | 69 | INSGuitarSteel_StringD_Vel01_A4_01.wav | INSGuitarSteel_StringD_Vel02_A4_01.wav | INSGuitarSteel_StringD_Vel03_A4_01.wav |
| A#4 | 70 | INSGuitarSteel_StringD_Vel01_As4_01.wav | INSGuitarSteel_StringD_Vel02_As4_01.wav | INSGuitarSteel_StringD_Vel03_As4_01.wav |

### G String — 21 notes, 63 samples

| Note | MIDI | Vel01 (soft) | Vel02 (medium) | Vel03 (hard) |
|------|------|--------------|----------------|--------------|
| G3 | 55 | INSGuitarSteel_StringG_Vel01_G3_01.wav | INSGuitarSteel_StringG_Vel02_G3_01.wav | INSGuitarSteel_StringG_Vel03_G3_01.wav |
| G#3 | 56 | INSGuitarSteel_StringG_Vel01_Gs3_01.wav | INSGuitarSteel_StringG_Vel02_Gs3_01.wav | INSGuitarSteel_StringG_Vel03_Gs3_01.wav |
| A3 | 57 | INSGuitarSteel_StringG_Vel01_A3_01.wav | INSGuitarSteel_StringG_Vel02_A3_01.wav | INSGuitarSteel_StringG_Vel03_A3_01.wav |
| A#3 | 58 | INSGuitarSteel_StringG_Vel01_As3_01.wav | INSGuitarSteel_StringG_Vel02_As3_01.wav | INSGuitarSteel_StringG_Vel03_As3_01.wav |
| B3 | 59 | INSGuitarSteel_StringG_Vel01_B3_01.wav | INSGuitarSteel_StringG_Vel02_B3_01.wav | INSGuitarSteel_StringG_Vel03_B3_01.wav |
| C4 | 60 | INSGuitarSteel_StringG_Vel01_C4_01.wav | INSGuitarSteel_StringG_Vel02_C4_01.wav | INSGuitarSteel_StringG_Vel03_C4_01.wav |
| C#4 | 61 | INSGuitarSteel_StringG_Vel01_Cs4_01.wav | INSGuitarSteel_StringG_Vel02_Cs4_01.wav | INSGuitarSteel_StringG_Vel03_Cs4_01.wav |
| D4 | 62 | INSGuitarSteel_StringG_Vel01_D4_01.wav | INSGuitarSteel_StringG_Vel02_D4_01.wav | INSGuitarSteel_StringG_Vel03_D4_01.wav |
| D#4 | 63 | INSGuitarSteel_StringG_Vel01_Ds4_01.wav | INSGuitarSteel_StringG_Vel02_Ds4_01.wav | INSGuitarSteel_StringG_Vel03_Ds4_01.wav |
| E4 | 64 | INSGuitarSteel_StringG_Vel01_E4_01.wav | INSGuitarSteel_StringG_Vel02_E4_01.wav | INSGuitarSteel_StringG_Vel03_E4_01.wav |
| F4 | 65 | INSGuitarSteel_StringG_Vel01_F4_01.wav | INSGuitarSteel_StringG_Vel02_F4_01.wav | INSGuitarSteel_StringG_Vel03_F4_01.wav |
| F#4 | 66 | INSGuitarSteel_StringG_Vel01_Fs4_01.wav | INSGuitarSteel_StringG_Vel02_Fs4_01.wav | INSGuitarSteel_StringG_Vel03_Fs4_01.wav |
| G4 | 67 | INSGuitarSteel_StringG_Vel01_G4_01.wav | INSGuitarSteel_StringG_Vel02_G4_01.wav | INSGuitarSteel_StringG_Vel03_G4_01.wav |
| G#4 | 68 | INSGuitarSteel_StringG_Vel01_Gs4_01.wav | INSGuitarSteel_StringG_Vel02_Gs4_01.wav | INSGuitarSteel_StringG_Vel03_Gs4_01.wav |
| A4 | 69 | INSGuitarSteel_StringG_Vel01_A4_01.wav | INSGuitarSteel_StringG_Vel02_A4_01.wav | INSGuitarSteel_StringG_Vel03_A4_01.wav |
| A#4 | 70 | INSGuitarSteel_StringG_Vel01_As4_01.wav | INSGuitarSteel_StringG_Vel02_As4_01.wav | INSGuitarSteel_StringG_Vel03_As4_01.wav |
| B4 | 71 | INSGuitarSteel_StringG_Vel01_B4_01.wav | INSGuitarSteel_StringG_Vel02_B4_01.wav | INSGuitarSteel_StringG_Vel03_B4_01.wav |
| C5 | 72 | INSGuitarSteel_StringG_Vel01_C5_01.wav | INSGuitarSteel_StringG_Vel02_C5_01.wav | INSGuitarSteel_StringG_Vel03_C5_01.wav |
| C#5 | 73 | INSGuitarSteel_StringG_Vel01_Cs5_01.wav | INSGuitarSteel_StringG_Vel02_Cs5_01.wav | INSGuitarSteel_StringG_Vel03_Cs5_01.wav |
| D5 | 74 | INSGuitarSteel_StringG_Vel01_D5_01.wav | INSGuitarSteel_StringG_Vel02_D5_01.wav | INSGuitarSteel_StringG_Vel03_D5_01.wav |
| D#5 | 75 | INSGuitarSteel_StringG_Vel01_Ds5_01.wav | INSGuitarSteel_StringG_Vel02_Ds5_01.wav | INSGuitarSteel_StringG_Vel03_Ds5_01.wav |

### B String — 21 notes, 63 samples

| Note | MIDI | Vel01 (soft) | Vel02 (medium) | Vel03 (hard) |
|------|------|--------------|----------------|--------------|
| B3 | 59 | INSGuitarSteel_StringB_Vel01_B3_01.wav | INSGuitarSteel_StringB_Vel02_B3_01.wav | INSGuitarSteel_StringB_Vel03_B3_01.wav |
| C4 | 60 | INSGuitarSteel_StringB_Vel01_C4_01.wav | INSGuitarSteel_StringB_Vel02_C4_01.wav | INSGuitarSteel_StringB_Vel03_C4_01.wav |
| C#4 | 61 | INSGuitarSteel_StringB_Vel01_Cs4_01.wav | INSGuitarSteel_StringB_Vel02_Cs4_01.wav | INSGuitarSteel_StringB_Vel03_Cs4_01.wav |
| D4 | 62 | INSGuitarSteel_StringB_Vel01_D4_01.wav | INSGuitarSteel_StringB_Vel02_D4_01.wav | INSGuitarSteel_StringB_Vel03_D4_01.wav |
| D#4 | 63 | INSGuitarSteel_StringB_Vel01_Ds4_01.wav | INSGuitarSteel_StringB_Vel02_Ds4_01.wav | INSGuitarSteel_StringB_Vel03_Ds4_01.wav |
| E4 | 64 | INSGuitarSteel_StringB_Vel01_E4_01.wav | INSGuitarSteel_StringB_Vel02_E4_01.wav | INSGuitarSteel_StringB_Vel03_E4_01.wav |
| F4 | 65 | INSGuitarSteel_StringB_Vel01_F4_01.wav | INSGuitarSteel_StringB_Vel02_F4_01.wav | INSGuitarSteel_StringB_Vel03_F4_01.wav |
| F#4 | 66 | INSGuitarSteel_StringB_Vel01_Fs4_01.wav | INSGuitarSteel_StringB_Vel02_Fs4_01.wav | INSGuitarSteel_StringB_Vel03_Fs4_01.wav |
| G4 | 67 | INSGuitarSteel_StringB_Vel01_G4_01.wav | INSGuitarSteel_StringB_Vel02_G4_01.wav | INSGuitarSteel_StringB_Vel03_G4_01.wav |
| G#4 | 68 | INSGuitarSteel_StringB_Vel01_Gs4_01.wav | INSGuitarSteel_StringB_Vel02_Gs4_01.wav | INSGuitarSteel_StringB_Vel03_Gs4_01.wav |
| A4 | 69 | INSGuitarSteel_StringB_Vel01_A4_01.wav | INSGuitarSteel_StringB_Vel02_A4_01.wav | INSGuitarSteel_StringB_Vel03_A4_01.wav |
| A#4 | 70 | INSGuitarSteel_StringB_Vel01_As4_01.wav | INSGuitarSteel_StringB_Vel02_As4_01.wav | INSGuitarSteel_StringB_Vel03_As4_01.wav |
| B4 | 71 | INSGuitarSteel_StringB_Vel01_B4_01.wav | INSGuitarSteel_StringB_Vel02_B4_01.wav | INSGuitarSteel_StringB_Vel03_B4_01.wav |
| C5 | 72 | INSGuitarSteel_StringB_Vel01_C5_01.wav | INSGuitarSteel_StringB_Vel02_C5_01.wav | INSGuitarSteel_StringB_Vel03_C5_01.wav |
| C#5 | 73 | INSGuitarSteel_StringB_Vel01_Cs5_01.wav | INSGuitarSteel_StringB_Vel02_Cs5_01.wav | INSGuitarSteel_StringB_Vel03_Cs5_01.wav |
| D5 | 74 | INSGuitarSteel_StringB_Vel01_D5_01.wav | INSGuitarSteel_StringB_Vel02_D5_01.wav | INSGuitarSteel_StringB_Vel03_D5_01.wav |
| D#5 | 75 | INSGuitarSteel_StringB_Vel01_Ds5_01.wav | INSGuitarSteel_StringB_Vel02_Ds5_01.wav | INSGuitarSteel_StringB_Vel03_Ds5_01.wav |
| E5 | 76 | INSGuitarSteel_StringB_Vel01_E5_01.wav | INSGuitarSteel_StringB_Vel02_E5_01.wav | INSGuitarSteel_StringB_Vel03_E5_01.wav |
| F5 | 77 | INSGuitarSteel_StringB_Vel01_F5_01.wav | INSGuitarSteel_StringB_Vel02_F5_01.wav | INSGuitarSteel_StringB_Vel03_F5_01.wav |
| F#5 | 78 | INSGuitarSteel_StringB_Vel01_Fs5_01.wav | INSGuitarSteel_StringB_Vel02_Fs5_01.wav | INSGuitarSteel_StringB_Vel03_Fs5_01.wav |
| G5 | 79 | INSGuitarSteel_StringB_Vel01_G5_01.wav | INSGuitarSteel_StringB_Vel02_G5_01.wav | INSGuitarSteel_StringB_Vel03_G5_01.wav |

### High E String — 21 notes, 63 samples

| Note | MIDI | Vel01 (soft) | Vel02 (medium) | Vel03 (hard) |
|------|------|--------------|----------------|--------------|
| E4 | 64 | INSGuitarSteel_StringHighE_Vel01_E4_01.wav | INSGuitarSteel_StringHighE_Vel02_E4_01.wav | INSGuitarSteel_StringHighE_Vel03_E4_01.wav |
| F4 | 65 | INSGuitarSteel_StringHighE_Vel01_F4_01.wav | INSGuitarSteel_StringHighE_Vel02_F4_01.wav | INSGuitarSteel_StringHighE_Vel03_F4_01.wav |
| F#4 | 66 | INSGuitarSteel_StringHighE_Vel01_Fs4_01.wav | INSGuitarSteel_StringHighE_Vel02_Fs4_01.wav | INSGuitarSteel_StringHighE_Vel03_Fs4_01.wav |
| G4 | 67 | INSGuitarSteel_StringHighE_Vel01_G4_01.wav | INSGuitarSteel_StringHighE_Vel02_G4_01.wav | INSGuitarSteel_StringHighE_Vel03_G4_01.wav |
| G#4 | 68 | INSGuitarSteel_StringHighE_Vel01_Gs4_01.wav | INSGuitarSteel_StringHighE_Vel02_Gs4_01.wav | INSGuitarSteel_StringHighE_Vel03_Gs4_01.wav |
| A4 | 69 | INSGuitarSteel_StringHighE_Vel01_A4_01.wav | INSGuitarSteel_StringHighE_Vel02_A4_01.wav | INSGuitarSteel_StringHighE_Vel03_A4_01.wav |
| A#4 | 70 | INSGuitarSteel_StringHighE_Vel01_As4_01.wav | INSGuitarSteel_StringHighE_Vel02_As4_01.wav | INSGuitarSteel_StringHighE_Vel03_As4_01.wav |
| B4 | 71 | INSGuitarSteel_StringHighE_Vel01_B4_01.wav | INSGuitarSteel_StringHighE_Vel02_B4_01.wav | INSGuitarSteel_StringHighE_Vel03_B4_01.wav |
| C5 | 72 | INSGuitarSteel_StringHighE_Vel01_C5_01.wav | INSGuitarSteel_StringHighE_Vel02_C5_01.wav | INSGuitarSteel_StringHighE_Vel03_C5_01.wav |
| C#5 | 73 | INSGuitarSteel_StringHighE_Vel01_Cs5_01.wav | INSGuitarSteel_StringHighE_Vel02_Cs5_01.wav | INSGuitarSteel_StringHighE_Vel03_Cs5_01.wav |
| D5 | 74 | INSGuitarSteel_StringHighE_Vel01_D5_01.wav | INSGuitarSteel_StringHighE_Vel02_D5_01.wav | INSGuitarSteel_StringHighE_Vel03_D5_01.wav |
| D#5 | 75 | INSGuitarSteel_StringHighE_Vel01_Ds5_01.wav | INSGuitarSteel_StringHighE_Vel02_Ds5_01.wav | INSGuitarSteel_StringHighE_Vel03_Ds5_01.wav |
| E5 | 76 | INSGuitarSteel_StringHighE_Vel01_E5_01.wav | INSGuitarSteel_StringHighE_Vel02_E5_01.wav | INSGuitarSteel_StringHighE_Vel03_E5_01.wav |
| F5 | 77 | INSGuitarSteel_StringHighE_Vel01_F5_01.wav | INSGuitarSteel_StringHighE_Vel02_F5_01.wav | INSGuitarSteel_StringHighE_Vel03_F5_01.wav |
| F#5 | 78 | INSGuitarSteel_StringHighE_Vel01_Fs5_01.wav | INSGuitarSteel_StringHighE_Vel02_Fs5_01.wav | INSGuitarSteel_StringHighE_Vel03_Fs5_01.wav |
| G5 | 79 | INSGuitarSteel_StringHighE_Vel01_G5_01.wav | INSGuitarSteel_StringHighE_Vel02_G5_01.wav | INSGuitarSteel_StringHighE_Vel03_G5_01.wav |
| G#5 | 80 | INSGuitarSteel_StringHighE_Vel01_Gs5_01.wav | INSGuitarSteel_StringHighE_Vel02_Gs5_01.wav | INSGuitarSteel_StringHighE_Vel03_Gs5_01.wav |
| A5 | 81 | INSGuitarSteel_StringHighE_Vel01_A5_01.wav | INSGuitarSteel_StringHighE_Vel02_A5_01.wav | INSGuitarSteel_StringHighE_Vel03_A5_01.wav |
| A#5 | 82 | INSGuitarSteel_StringHighE_Vel01_As5_01.wav | INSGuitarSteel_StringHighE_Vel02_As5_01.wav | INSGuitarSteel_StringHighE_Vel03_As5_01.wav |
| B5 | 83 | INSGuitarSteel_StringHighE_Vel01_B5_01.wav | INSGuitarSteel_StringHighE_Vel02_B5_01.wav | INSGuitarSteel_StringHighE_Vel03_B5_01.wav |
| C6 | 84 | INSGuitarSteel_StringHighE_Vel01_C6_01.wav | INSGuitarSteel_StringHighE_Vel02_C6_01.wav | INSGuitarSteel_StringHighE_Vel03_C6_01.wav |

## Playback Guidance

### Mapping

- Map each sample to its MIDI note; the set is fully chromatic across E2–C6 (40–84),
  so no pitch-shifting is required inside the sampled range.
- Outside the range, pitch-shift the nearest sample. Up to ±2 semitones holds the
  steel-string character; beyond ±3 the body resonance becomes audibly wrong,
  particularly downward from the Low E string.
- Pick a string per note as described above rather than mapping every pitch to a
  single string — the timbral differences between strings at the same pitch are a
  large part of what makes the instrument sound played rather than sampled.

### Velocity

Three layers. Suggested split points, weighted so the loud layer occupies the top of
the range where the timbral jump is largest:

| MIDI Velocity | Layer |
|---------------|-------|
| 1–48 | `Vel01` |
| 49–96 | `Vel02` |
| 97–127 | `Vel03` |

- Switch layers rather than crossfading. The layers were captured as separate
  performances with different attack transients, so crossfading two of them
  produces a phasey doubled attack.
- Apply only gentle amplitude scaling within a layer (±3 dB across its velocity
  span). Larger gain moves fight against the timbral cue the layers already carry.

### Sustain and Release

- Samples run to their natural decay — 1.9 s at the top of the neck to 18.6 s on the
  open Low E. Let them ring rather than truncating.
- Use a 30–80 ms fade-out on note-off. Shorter clicks on the low strings, where the
  fundamental period is long.
- No loop points: these are one-shots, not sustain loops.

### Polyphony and Voice Handling

- A real guitar has six strings, so cap sustaining voices at six for realistic
  behaviour. Allow more only when a deliberately unrealistic pad texture is wanted.
- Re-triggering a pitch on the same string should cut the previous voice with a short
  fade — one string cannot sound two pitches at once. Notes on different strings ring
  together freely.
- For strummed chords, offset note starts by 8–20 ms low-to-high (up-strum: high-to-
  low). Simultaneous triggering reads as a keyboard, not a guitar.

### Repeated Notes

- There is one take per string/note/layer, so rapid repetition of the same pitch and
  layer will sound mechanical. Vary pitch by ±4 cents and amplitude by ±1.5 dB per
  trigger, or alternate between the same pitch on two different strings where the
  range allows.

## Usage Contexts

- Melodic and accompaniment content in folk, acoustic, lo-fi, and cinematic styles
- Playable instrument in VR/AR environments
- Interactive or generative music systems needing a credible acoustic guitar
- Warm, organic UI and notification tones (use `Vel01` on the higher strings)
