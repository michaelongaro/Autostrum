# Guitar samples

Autostrum uses local CC0 recordings through its Web Audio sampler. The existing
instrument choices, fret effects, tuner and preview APIs remain available.

| Choice           | Library                   | Recordings | Detail                                                                         |
| ---------------- | ------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Acoustic – Steel | Meta Steel Guitar         | 375        | Three picking strengths, six separate string zones, E2–C6                      |
| Acoustic – Nylon | Meta Nylon Guitar         | 348        | Fingerstyle, light pick and firm pick; six string zones, E2–B5                 |
| Electric – Clean | Karoryfer Emilyguitar     | 216        | Epiphone Emily/SG direct recordings; four strengths, three real takes per zone |
| Electric – Jazz  | The same Emilyguitar bank | Shared     | A darker 3.2 kHz low-pass preset                                               |

The complete guitar sample assets total about 129 MiB. This is the on-disk bank
size, not the initial download: string positions are prepared for the current
piece rather than loading the entire acoustic bank. All 939 pitched recordings
are included. Emilyguitar's non-pitched fingering/release noises and synthesized
chord/unison presets are not imported; Autostrum retains its own articulation
and string-cutoff engine.

## Sources and permissions

All three libraries are currently published under CC0 1.0, including permission
to redistribute the recordings in applications. Each bank includes LICENSE.txt
and its original SFZ map; source README files accompany them.

- [Meta Open Sound](https://github.com/facebookincubator/Meta-open-sound)
  ([license](https://github.com/facebookincubator/Meta-open-sound/blob/main/LICENSE)).
  Meta's Creative Audio team recorded these instruments. The two guitar releases
  are version 1.0.0; documentation is pinned to commit
  `e2ff154845994fe4135becc4d5b857c19f172784`.
- [Emilyguitar](https://github.com/sfzinstruments/karoryfer.emilyguitar)
  ([license](https://github.com/sfzinstruments/karoryfer.emilyguitar/blob/master/LICENSE)).
  Played and mapped by D. Smolken, Karoryfer Lecolds. WAVs and the clean SFZ map
  come from release 1.001. Its archive predates the CC0 license file, so that file
  is taken from commit `b4920dc662fd9cad6dcaccdeecffdd91c8725d8c`.

Meta has one take per string/note/dynamic; it does not include recorded palm
mutes, hammer-ons or release noises. Its nylon layers change playing technique
as well as brightness. These are sampling limits, not additional articulations
that Autostrum can recover from the recordings.

## Preparation and reproduction

Download and extract each archive into `<source-directory>/steel`, `/nylon`, and
`/electric`. The electric archive creates an `Emilyguitar` subdirectory. Put the
CC0 license from the pinned Emilyguitar commit into that subdirectory as LICENSE.

| Bank     | Archive                                                                                                                                                                                | SHA-256                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Steel    | [meta-open-sound-meta-steel-guitar-wav.zip](https://github.com/facebookincubator/Meta-open-sound/releases/download/meta-steel-guitar-v1.0.0/meta-open-sound-meta-steel-guitar-wav.zip) | `caaa8a9c07217f4a82d1dfd9f5657c286155464b66bf4dd27797811c2558a909` |
| Nylon    | [meta-open-sound-meta-nylon-guitar-wav.zip](https://github.com/facebookincubator/Meta-open-sound/releases/download/meta-nylon-guitar-v1.0.0/meta-open-sound-meta-nylon-guitar-wav.zip) | `e7fa168b97a72ecc1257917f85cb524fe7c2e1f098dfdcaf8f5c0e29cabe768e` |
| Electric | [Karoryfer.Emilyguitar.v1.001.zip](https://github.com/sfzinstruments/karoryfer.emilyguitar/releases/download/v1.001/Karoryfer.Emilyguitar.v1.001.zip)                                  | `ffef3b28972763820bee73660a25cf47ea6e13b184342fd5d325a5631598cacb` |

Run `node scripts/prepareGuitarSamples.mjs <source-directory>` with FFmpeg on PATH,
or set FFMPEG_PATH to the executable. The default source directory is
`.git/guitar-sample-sources/v2`. `--only=steel`, `--only=nylon`, and `--only=electric`
regenerate one bank. Copy the pinned Meta README.md files into each acoustic
bank as README-source.md.

Conversion uses the original WAVs rather than re-encoding the OGG previews. It
trims pre-attack silence and inaudible tail ends, removes subsonic content below
30 Hz, applies measured tuning corrections and short anti-click fades, and
encodes mono 44.1 kHz MP3 at 192 kbit/s. One gain per collection preserves
differences in recorded dynamics, notes and alternate takes. Natural decay is
retained, including tails longer than the previous six-second voice cutoff.

Prepared MP3s and manifests live in `public/sounds/guitars/v2`. Content hashes
provide immutable audio caching; manifests use Next.js's revalidating public
asset policy. Original downloads and FFmpeg are not production dependencies.

## Loading and playback

The lazy sampler module first loads one normal take for each first-position
reference pitch. Reference dynamics and electric alternate takes load in the
background. Before a tab or preview starts its audio clock,
`prepareGuitarColumns` gathers unique pitch/string pairs and loads all their
dynamics and takes with four concurrent requests/decoders. It also warms entry
slide pitches. No fetching or decoding occurs in the lookahead scheduler.
The chord trainer prepares its selected chord set before starting its visual
clock, with cancellation on pause, configuration changes or unmount.

String indices follow tab order: 0 is high E, 5 is low E. Playback, and the
reference body used for legato compensation, select the corresponding string
recording. A missing position or alternate tuning uses the nearest suitable
root and the existing detune engine. Clean/jazz share decoded electric audio.

Decoded banks are cached per AudioContext and requests are deduplicated. A
192 MiB retention target per bank evicts older string positions while keeping
essential reference coverage and the currently prepared piece. This is a soft
target: a piece using more recordings may exceed it. Playing sources retain
their own buffers through eviction. Fetches time out after 12 seconds; missing
details use loaded recordings and a failed initial bank uses the existing
MusyngKite fallback. Session guards prevent cancelled preparation from starting
a tab or preview later.

## Verification

- `node scripts/verifyGuitarEffects.mjs` covers scheduling and voice lifecycle.
- `scripts/guitarSamplesAudioChecks.mjs` exercises the actual sampler in a
  browser: pitch/range, string mapping, three electric takes, dynamics, legato,
  slides, bends/releases, palm mute, pause and dry chord headroom. It creates a
  temporary panel for matched-volume auditions against the original GM bank.
- `scripts/guitarSamplesLoadingChecks.mjs` checks destination-cache isolation,
  direct reference playback/cancellation and missing-bank fallback.
- `scripts/guitarSamplesStoreChecks.mjs` uses the actual app store to confirm
  that pausing during preparation cancels both tabs and previews.

Bundle the checks with esbuild, then evaluate them in the collaborative browser:

```text
npx --yes --package=esbuild@0.25.12 esbuild scripts/guitarSamplesAudioChecks.mjs --bundle --minify --platform=browser --format=iife --global-name=GuitarSampleChecks --outfile=.git/guitar-samples-audio-checks.js
```

Call `GuitarSampleChecks.runGuitarSampleChecks()`. Loading checks use the same
command with guitarSamplesLoadingChecks.mjs and global name GuitarLoadingChecks.
Neither check starts audible playback automatically.

The native checks passed for all four choices: 40 pitch probes were within
3.6 cents, ordinary chord peaks were 0.208–0.357, and accented chord peaks were
0.437–0.731. String mapping, electric take rotation, articulation, cancellation,
reference playback and fallback checks passed. An actual tab playback also
started scheduled voices and cleared them on pause. The 22 existing scheduling
checks and focused runtime/store lint passed. The chord trainer's real controls
also passed preparation cancellation, sample playback and pause checks. It retains its
pre-existing `react-hooks/set-state-in-effect` lint error, confirmed against HEAD;
whole-project type checking retains existing errors outside the changed audio
and integration files. No database migration or deployment build was run.

## Earlier Guitoro investigation

[Guitoro's credits](https://guitoro.com/credits/) identify FlameStudios Seagull
and Ibanez steel guitars, Iowa's Raimundo nylon, and FreePats FSBS electric.
Other presets have permission specifically granted to Guitoro. Public manifests
and JavaScript show velocity selection/blending, alternate takes where present,
EQ, amp processing, room convolution and limiting. These observations concern
public assets, not Guitoro's private source.

The first Autostrum upgrade used Seagull/Iowa/FSBS recordings. Those banks were
replaced after the user's listening feedback. Their preparation and source
archive remain in git history at commit `592cb077`; v2 uses independent CC0
sources and does not copy or hotlink Guitoro audio.
