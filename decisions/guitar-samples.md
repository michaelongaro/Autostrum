# Dedicated guitar samples

Implemented on `feat/professional-guitar-samples`. The existing instrument choices
now load recorded guitar multisamples from `/sounds/guitars/v1/`. No account,
third-party CDN, runtime conversion service, or additional npm dependency is needed.

The banks contain 59 steel, 131 nylon, and 60 electric recordings, totaling about
38.4 MiB of compressed audio. Playback downloads only the selected bank. The
steel source archive adds about 13 MiB to the repository and is not fetched for
playback. Decoded audio takes more memory than its compressed files; clean and
jazz share the same electric bank, and each bank loads its normal layer first.

## Guitoro investigation (2026-10-13)

Guitoro's [sound credits](https://guitoro.com/credits/) identify FlameStudios
Seagull and Ibanez steel-string recordings, University of Iowa's Raimundo 118
classical guitar, and FreePats FSBS electric guitar. Other Guitoro presets have
permission specifically granted to Guitoro, so those recordings were not reused.

Inspection of the public application and its network requests showed:

- A JSON sample manifest, individual content-hashed audio files, and Web Audio
  buffer playback; the acoustic manifest has three dynamic layers per note.
- Opus `.ogg` and AAC `.m4a` variants, a small initial loading tier, then additional
  pitches, dynamic layers, and palm-mute/contact/release recordings.
- Pitch transposition, alternate takes where available, velocity selection and
  blending, EQ, amp processing, room convolution, and output limiting in its
  publicly served JavaScript.

These are observations of public assets, not access to Guitoro's private source.
Autostrum downloads original libraries from their authors/distributors, performs
its own conversion, and serves its own files. It does not hotlink Guitoro.

## Sources and permissions

| Choice           | Original recording                                               | Included detail                                                    | License                                                                     |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Acoustic – Steel | Gary Campion / FlameStudios Seagull, FreePats 2020-05-21         | Every semitone E2–C6; medium/hard layers where recorded            | GPL v3 or later with FreePats composition exception                         |
| Acoustic – Nylon | Iowa Electronic Music Studios, Raimundo 118, Brian Penkrot, 2011 | E2–B5, soft/medium/strong picking                                  | Iowa MIS permission to download and use in any project without restrictions |
| Electric – Clean | FreePats Fender FSBS Clean bridge, 2026-08-07                    | C2–C#6, original SFZ pitch/velocity zones, two real takes per zone | CC0 1.0                                                                     |
| Electric – Jazz  | The same FSBS clean recordings                                   | A darker 3.2 kHz low-pass preset; shares decoded samples           | CC0 1.0                                                                     |

The steel library does not have two layers at every pitch. The nylon library's
strongest treble recording ends at Bb5; the nearest available recording fills
that last velocity zone. Notes outside each recorded range are transposed from
the nearest root, which also supports alternate tunings and capos. Nylon has one
real take per pitch and dynamic; only electric currently has alternate takes.

Licenses, original README files, and original SFZ mappings are alongside the
sample banks. The complete, unmodified steel source archive is included as
`/sounds/guitars/v1/steel/source.tar.xz`. The steel sample license and composition
exception apply to the converted recordings; the application code's license
does not change. Iowa's permission and attribution are in the nylon LICENSE.txt.

Primary sources:

- [FreePats Seagull](https://freepats.zenvoid.org/Guitar/steel-acoustic-guitar.html)
- [Iowa guitar recording details](https://theremin.music.uiowa.edu/MISguitar.html)
- [Iowa usage permission](https://theremin.music.uiowa.edu/MIS.html)
- [FreePats FSBS clean/direct](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html)

## Preparation and reproduction

Download and extract these archives into a working directory (the development
run used `.git/guitar-sample-sources`, which is not committed). Keep their original
directory names. `tar`/libarchive can extract all three formats on Windows.

| Archive      | Download                                                                                                                                                             | SHA-256                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| steel.tar.xz | [FSS-SteelStringGuitar-SFZ-20200521.tar.xz](https://freepats.zenvoid.org/Guitar/FSS-SteelStringGuitar/FSS-SteelStringGuitar-SFZ-20200521.tar.xz)                     | `720b55c5ad4dcfb9f788ab13a0bda834cbfd7b3214df2ca90648c58951e41777` |
| electric.7z  | [EGuitarFSBS-clean-SFZ+FLAC-20260807.7z](https://github.com/freepats/electric-guitar-FSBS-clean/releases/download/2026-08-07/EGuitarFSBS-clean-SFZ+FLAC-20260807.7z) | `a929a3cbfc8289e325be56dab49f5fd560bbc3995c40b69f8f05caee380e8be3` |
| nylon.zip    | [Guitar.stereo.1644.1.zip](https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/guitar/Guitar.stereo.1644.1.zip)                                           | `3a0e8b6e5fbb5d0312c697f7c2807ceebe8873c8c850a7a06c16faa4901bbf42` |

Run `node scripts/prepareGuitarSamples.mjs <source-directory>` with FFmpeg on PATH,
or set `FFMPEG_PATH` to its executable. FFmpeg must include libmp3lame. The script
uses the already installed pitchy package. `--only=steel`, `--only=nylon`, or
`--only=electric` regenerates one bank.

The script reads the original SFZ zones, splits Iowa's ascending chromatic AIFF
scales, removes low-frequency rumble, corrects each recording's measured tuning, trims
pre-attack silence, preserves natural decay, adds short anti-click fades, and
encodes mono 44.1 kHz MP3 at 192 kbit/s. MP3 is used across browsers, including
Safari/iOS, without doubling the asset library. Seeking output files includes
the LAME/Xing gapless metadata rather than introducing MP3 encoder delay at each
scheduled attack. Content hashes in filenames allow immutable caching.

Normalized peak targets are 0.12/0.18/0.24 for nylon picking strengths and
0.18/0.24 for SFZ soft/strong layers. Timbre changes come from distinct recordings,
not just gain. Existing note accents and legato envelopes still apply.

Do not run this conversion during normal builds. Prepared audio and manifests
are committed, and no production machine needs FFmpeg or the original archives.

## Runtime

`guitarSampleRuntime.ts` loads four assets concurrently and exposes synchronous
sample selection to the existing guitar effects engine. The normal-picking layer
loads before playback is enabled. Additional velocities and alternate takes
load in the background; missing extras fall back to the closest loaded recording.
Samples are decoded once per AudioContext and shared by clean/jazz electric.
Instrument players are cached per context and destination; a replacement context
gets fresh players. A failed essential load retries through the legacy soundfont
loader. Fetches have a 12-second timeout and rejected bank loads can be retried.

Each voice knows the original sample's MIDI root. Detune automation, sample-time
consumption, slides, bends, and release gestures account for that root. Connected
legato preserves the vibrating sample. Voices never loop. Direct reference-note
playback in the tuner and note trainer uses the same bank. A low cut and a
conservative compressor protect dense chords; jazz adds its darker tone filter.

Instrument switches ignore stale asynchronous results. Context initialization
and instrument loading have separate ownership, avoiding duplicate competing
loads from the two layout hooks.

## Verification

- `node scripts/verifyGuitarEffects.mjs` exercises scheduling and voice lifecycle.
- Native browser checks bundle the actual sampler/effects and verify pitch,
  low/high range coverage, transposition, legato, bends/releases, palm muting,
  cancellation, and six-string chord headroom.
- Loading checks also exercise destination-cache isolation, direct reference
  playback/cancellation, and an intentionally missing sample manifest's legacy fallback.
- The browser check adds a temporary audition panel with before/after chords
  matched in body RMS, plus a legato phrase for each upgraded choice.

To prepare the browser check:

```text
npx --yes --package=esbuild@0.25.12 esbuild scripts/guitarSamplesAudioChecks.mjs --bundle --platform=browser --format=iife --global-name=GuitarSampleChecks --outfile=.git/guitar-samples-audio-checks.js
```

Evaluate that generated script in the running application's browser, followed by
`await GuitarSampleChecks.runGuitarSampleChecks()`. The compiler is fetched into
the npm cache only; it is not an application dependency.

`scripts/guitarSamplesLoadingChecks.mjs` can be bundled in the same way, with
`--global-name=GuitarLoadingChecks`, then run through
`await GuitarLoadingChecks.runGuitarLoadingChecks()`.

The final native check passed for all four choices. Its 40 representative pitch
probes, including transposed low/high notes, were within 5.6 cents of their
targets; dry six-string chord peaks were 0.38–0.67. The 22 existing scheduling
checks and focused audio-runtime lint also passed. Whole-project type checking
still reports existing errors (including broken upstream Tonal type entrypoints
and unrelated tab/strip types); no errors point to the changed audio modules.
Type-only consumers retain their existing lint issues. No database migration or
deployment build was run.
