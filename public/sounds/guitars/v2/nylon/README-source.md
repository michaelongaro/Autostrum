# Meta Nylon Guitar

Multi-sampled nylon-string (classical) acoustic guitar, captured string by
string across the full playable neck. Three dynamic layers per note — two
picked and one fingerstyle — covering 116 distinct string/note positions.
Warm, woody, intimate character suitable for scoring, interactive music,
ambient beds, and UI accents.

Companion to the **Meta Steel Guitar** collection, which shares the same
string-zone and velocity-layer structure — six strings, three layers,
numbered softest-first. Filenames are not interchangeable: steel labels its
layers `Vel01` / `Vel02` / `Vel03`, while this collection appends the
playing technique.

## Sample Set

- **348 samples** — 6 string zones x 3 dynamic layers x 19-20 notes
- **Pitch range** — E2 to B5 (MIDI 40-83)
- **Source format** — 48 kHz / 24-bit stereo WAV
- **Web format** — mono OGG Vorbis (quality 5), same filename stem
- All notes are **sustained** with natural decay. There is no damped, muted,
  or palm-muted layer, and no separate release samples.

### Dynamic Layers

The three layers are a technique change, not only a level change. The
fingerstyle layer is substantially darker than the picked layers while
sitting close to `Vel02Pick` in absolute level, so layer selection should
be treated as a timbral choice as much as a loudness one.

| Layer | Technique | Mean level | Relative HF energy | Character |
|-------|-----------|-----------|--------------------|-----------|
| `Vel01Finger` | Fingerstyle | -44.5 dB | -31.7 dB | Softest attack, warm and rounded, least string noise |
| `Vel02Pick` | Picked, light | -43.3 dB | -22.5 dB | Moderate attack, balanced body and definition |
| `Vel03Pick` | Picked, firm | -39.2 dB | -14.9 dB | Strongest attack, brightest, most pick transient |

Relative HF energy is the mean level above 2.5 kHz measured against each
sample's own full-band mean — a brightness index, not an absolute level.
The ordering holds for **all 116** string/note positions without exception,
so the layers can be treated as a strictly ordered dynamic ramp.

### String Zones

Each string was sampled across its own playable span. Because spans
overlap, most pitches exist on more than one string with a different
timbre — heavier strings read darker and thicker at a given pitch.

| String | Open pitch | Notes | Range | MIDI range | Samples |
|--------|-----------|-------|-------|-----------|---------|
| `StringLowE` | E2 | 20 | E2-B3 | 40-59 | 60 |
| `StringA` | A2 | 19 | A2-Ds4 | 45-63 | 57 |
| `StringD` | D3 | 19 | D3-Gs4 | 50-68 | 57 |
| `StringG` | G3 | 19 | G3-Cs5 | 55-73 | 57 |
| `StringB` | B3 | 19 | B3-F5 | 59-77 | 57 |
| `StringHighE` | E4 | 20 | E4-B5 | 64-83 | 60 |

### Note Inventory

Durations in seconds, per dynamic layer. Note names use `s` for sharp
(`As2` = A#2). Every note below exists in all three layers.

#### StringLowE (E2)

| Note | MIDI | Vel01Finger | Vel02Pick | Vel03Pick |
|------|------|-------------|-----------|-----------|
| E2 | 40 | 9.13 | 11.53 | 8.49 |
| F2 | 41 | 9.05 | 9.69 | 8.58 |
| Fs2 | 42 | 6.94 | 7.57 | 10.83 |
| G2 | 43 | 9.40 | 7.98 | 9.21 |
| Gs2 | 44 | 11.17 | 8.07 | 10.39 |
| A2 | 45 | 10.98 | 11.51 | 13.98 |
| As2 | 46 | 8.18 | 8.91 | 9.72 |
| B2 | 47 | 7.89 | 7.52 | 10.06 |
| C3 | 48 | 6.22 | 7.24 | 8.90 |
| Cs3 | 49 | 9.19 | 7.64 | 8.80 |
| D3 | 50 | 7.78 | 9.01 | 9.90 |
| Ds3 | 51 | 10.09 | 6.11 | 10.87 |
| E3 | 52 | 5.97 | 8.47 | 12.63 |
| F3 | 53 | 4.06 | 4.81 | 6.16 |
| Fs3 | 54 | 4.21 | 4.67 | 7.60 |
| G3 | 55 | 5.70 | 7.66 | 8.74 |
| Gs3 | 56 | 3.99 | 4.69 | 4.94 |
| A3 | 57 | 5.35 | 7.38 | 8.50 |
| As3 | 58 | 3.34 | 3.14 | 4.63 |
| B3 | 59 | 3.69 | 3.06 | 3.46 |

#### StringA (A2)

| Note | MIDI | Vel01Finger | Vel02Pick | Vel03Pick |
|------|------|-------------|-----------|-----------|
| A2 | 45 | 12.12 | 11.22 | 12.46 |
| As2 | 46 | 7.67 | 6.86 | 10.12 |
| B2 | 47 | 7.84 | 8.02 | 7.61 |
| C3 | 48 | 9.51 | 10.33 | 10.68 |
| Cs3 | 49 | 7.15 | 6.17 | 7.08 |
| D3 | 50 | 10.06 | 10.79 | 11.90 |
| Ds3 | 51 | 13.47 | 13.66 | 13.43 |
| E3 | 52 | 9.86 | 3.48 | 10.26 |
| F3 | 53 | 5.84 | 5.93 | 5.75 |
| Fs3 | 54 | 5.64 | 7.90 | 6.99 |
| G3 | 55 | 7.95 | 6.15 | 7.16 |
| Gs3 | 56 | 3.85 | 4.19 | 5.52 |
| A3 | 57 | 4.86 | 5.70 | 8.10 |
| As3 | 58 | 4.56 | 5.20 | 6.91 |
| B3 | 59 | 4.56 | 5.83 | 5.82 |
| C4 | 60 | 4.38 | 4.54 | 5.01 |
| Cs4 | 61 | 4.55 | 5.14 | 5.54 |
| D4 | 62 | 6.72 | 6.85 | 6.72 |
| Ds4 | 63 | 3.59 | 3.48 | 4.24 |

#### StringD (D3)

| Note | MIDI | Vel01Finger | Vel02Pick | Vel03Pick |
|------|------|-------------|-----------|-----------|
| D3 | 50 | 11.54 | 10.95 | 11.94 |
| Ds3 | 51 | 8.78 | 9.39 | 9.35 |
| E3 | 52 | 7.75 | 8.06 | 8.57 |
| F3 | 53 | 6.27 | 6.97 | 7.11 |
| Fs3 | 54 | 6.81 | 8.12 | 7.58 |
| G3 | 55 | 6.93 | 7.12 | 7.38 |
| Gs3 | 56 | 4.53 | 5.16 | 5.45 |
| A3 | 57 | 7.44 | 8.27 | 10.31 |
| As3 | 58 | 6.39 | 7.32 | 8.36 |
| B3 | 59 | 7.66 | 7.30 | 7.53 |
| C4 | 60 | 6.14 | 6.39 | 6.47 |
| Cs4 | 61 | 4.63 | 5.71 | 5.10 |
| D4 | 62 | 5.62 | 7.64 | 6.69 |
| Ds4 | 63 | 6.01 | 4.64 | 4.20 |
| E4 | 64 | 5.45 | 5.42 | 6.37 |
| F4 | 65 | 4.23 | 6.91 | 5.26 |
| Fs4 | 66 | 4.46 | 4.84 | 4.73 |
| G4 | 67 | 4.25 | 4.45 | 4.40 |
| Gs4 | 68 | 1.97 | 2.73 | 3.39 |

#### StringG (G3)

| Note | MIDI | Vel01Finger | Vel02Pick | Vel03Pick |
|------|------|-------------|-----------|-----------|
| G3 | 55 | 5.56 | 5.54 | 4.02 |
| Gs3 | 56 | 3.85 | 3.78 | 4.44 |
| A3 | 57 | 5.07 | 4.59 | 5.54 |
| As3 | 58 | 4.20 | 5.05 | 5.70 |
| B3 | 59 | 5.13 | 5.65 | 6.60 |
| C4 | 60 | 5.94 | 5.69 | 5.57 |
| Cs4 | 61 | 6.22 | 5.96 | 5.54 |
| D4 | 62 | 6.23 | 6.15 | 6.86 |
| Ds4 | 63 | 4.47 | 7.43 | 7.18 |
| E4 | 64 | 5.49 | 4.92 | 5.64 |
| F4 | 65 | 4.86 | 5.13 | 4.75 |
| Fs4 | 66 | 3.72 | 3.45 | 5.40 |
| G4 | 67 | 2.99 | 3.51 | 3.89 |
| Gs4 | 68 | 2.23 | 2.98 | 3.33 |
| A4 | 69 | 3.31 | 4.14 | 4.57 |
| As4 | 70 | 3.63 | 3.78 | 3.27 |
| B4 | 71 | 2.71 | 2.38 | 2.60 |
| C5 | 72 | 1.60 | 1.79 | 1.91 |
| Cs5 | 73 | 1.71 | 1.43 | 2.00 |

#### StringB (B3)

| Note | MIDI | Vel01Finger | Vel02Pick | Vel03Pick |
|------|------|-------------|-----------|-----------|
| B3 | 59 | 4.74 | 4.45 | 4.68 |
| C4 | 60 | 4.33 | 4.13 | 3.89 |
| Cs4 | 61 | 3.73 | 3.58 | 3.97 |
| D4 | 62 | 5.50 | 4.79 | 5.39 |
| Ds4 | 63 | 6.12 | 5.84 | 6.25 |
| E4 | 64 | 5.36 | 5.24 | 5.53 |
| F4 | 65 | 4.06 | 4.27 | 5.07 |
| Fs4 | 66 | 5.19 | 5.38 | 5.36 |
| G4 | 67 | 3.89 | 4.49 | 4.97 |
| Gs4 | 68 | 4.38 | 4.48 | 4.39 |
| A4 | 69 | 4.42 | 4.88 | 5.53 |
| As4 | 70 | 3.59 | 4.26 | 4.78 |
| B4 | 71 | 3.19 | 3.45 | 3.57 |
| C5 | 72 | 2.17 | 2.47 | 2.52 |
| Cs5 | 73 | 2.28 | 2.79 | 2.88 |
| D5 | 74 | 1.68 | 2.35 | 2.31 |
| Ds5 | 75 | 2.09 | 1.85 | 2.64 |
| E5 | 76 | 2.47 | 1.88 | 2.69 |
| F5 | 77 | 1.78 | 1.47 | 1.99 |

#### StringHighE (E4)

| Note | MIDI | Vel01Finger | Vel02Pick | Vel03Pick |
|------|------|-------------|-----------|-----------|
| E4 | 64 | 5.06 | 5.31 | 5.75 |
| F4 | 65 | 4.39 | 4.34 | 4.43 |
| Fs4 | 66 | 3.61 | 3.87 | 4.03 |
| G4 | 67 | 3.92 | 4.33 | 4.79 |
| Gs4 | 68 | 3.55 | 3.77 | 4.13 |
| A4 | 69 | 3.77 | 2.82 | 3.50 |
| As4 | 70 | 2.08 | 3.39 | 3.30 |
| B4 | 71 | 2.29 | 3.06 | 3.23 |
| C5 | 72 | 2.09 | 2.59 | 2.64 |
| Cs5 | 73 | 2.35 | 2.62 | 3.25 |
| D5 | 74 | 1.52 | 2.51 | 2.67 |
| Ds5 | 75 | 1.98 | 2.50 | 2.21 |
| E5 | 76 | 1.63 | 2.51 | 2.28 |
| F5 | 77 | 1.71 | 2.04 | 2.63 |
| Fs5 | 78 | 1.86 | 2.25 | 2.11 |
| G5 | 79 | 1.81 | 2.06 | 2.13 |
| Gs5 | 80 | 1.21 | 2.09 | 2.31 |
| A5 | 81 | 1.79 | 1.76 | 2.85 |
| As5 | 82 | 1.71 | 1.74 | 1.96 |
| B5 | 83 | 1.68 | 1.78 | 2.01 |

Sample length tracks pitch closely: low notes ring far longer than high
ones, spanning 1.21s to 13.98s across the set.

## File Organization

All samples sit in a single flat directory. The filename carries every
piece of metadata:

```
INSGuitarNylon_{String}_{Layer}_{NoteName}_{Variation}.wav
```

| Field | Values |
|-------|--------|
| String | `StringLowE`, `StringA`, `StringD`, `StringG`, `StringB`, `StringHighE` |
| Layer | `Vel01Finger`, `Vel02Pick`, `Vel03Pick` |
| NoteName | `E2`-`B5`; sharps written with `s` (`As2`, `Cs4`, `Fs5`) |
| Variation | `01` (single take per position; no round-robin) |

Example: `INSGuitarNylon_StringLowE_Vel01Finger_E2_01.wav`

Sharps use `s` rather than `#` so filenames stay safe in URLs and data
URIs. The `original_name` field in `manifest.json` preserves each file's
pre-rename source name.

### Layer numbering is inverted relative to the source files

Layers here are numbered softest-first, so `Vel01` is the quietest and
darkest. The delivered source files numbered the same takes loudest-first.
The takes themselves are unchanged — only the label differs:

| Source suffix | Layer here | Technique |
|---------------|-----------|-----------|
| `_01` | `Vel03Pick` | Picked, firm |
| `_02` | `Vel02Pick` | Picked, light |
| `_03` | `Vel01Finger` | Fingerstyle |

Softest-first matches the `meta-piano` and `meta-steel-guitar` collections,
so velocity mapping behaves consistently across the library. When comparing
against original session material, use `original_name` rather than assuming
the numbers line up.

## Playback Guidance

- **Velocity mapping and play style** — the layers form an ordered ramp,
  but fingerstyle and picking are also two techniques a player chooses
  between. Treat play style as its own control where the context allows:
  - *Auto* (the natural default): a three-way split across velocity,
    `Vel01Finger` at the low end, `Vel02Pick` in the middle, `Vel03Pick`
    at the top. Because the fingerstyle layer differs mainly in brightness
    rather than level, crossfading between layers is smoother than hard
    switching.
  - *Finger*: `Vel01Finger` at every velocity, with dynamics from level.
  - *Pick*: `Vel02Pick` and `Vel03Pick` split across velocity.

  The layers are only about 5 dB apart, so scale level with velocity as
  well in every style.
- **String selection** — overlapping ranges mean the same pitch is
  available on several strings. For idiomatic results pick the string a
  player would use: prefer the lowest string that reaches the note for
  full-bodied lines, or a higher string played near its open pitch for a
  thinner, brighter tone. For melodic passages, keeping to one string
  preserves timbral continuity.
- **One-shot playback** — notes are sustained and decay naturally. Do not
  loop or truncate; the ring-down carries the instrument's character.
  Budget for the long tails on low notes when allocating voices.
- **No round-robin** — there is one take per string/note/layer. Repeated
  triggering of the same position will sound identical. Vary repeated
  notes by alternating string zones, applying small pitch and level
  offsets, or moving between adjacent dynamic layers.
- **Pitch shifting** — nylon timbre degrades quickly under transposition.
  Stay within +/-2 semitones; the set is dense enough that wider shifts
  are rarely needed.
- **Voice management** — with tails up to 14 seconds, overlapping notes
  accumulate quickly. Model natural string behaviour by cutting a note
  when the same string is retriggered, since one string cannot sound two
  pitches at once.

## Usage Contexts

- Interactive and generative music systems
- Film, game, and trailer scoring
- Ambient and intimate acoustic beds
- Melodic UI accents and notification tones
- Layering under vocal or dialogue-led content
