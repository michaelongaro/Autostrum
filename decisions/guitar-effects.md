# Guitar effects: sample-based articulation

Autostrum uses the existing MusyngKite guitar recordings decoded by
`soundfont-player`. `src/utils/guitarEffects.ts` owns the per-string Web Audio
voices, pitch automation, damping, and cleanup. The tab parser in
`playGeneratedAudioHelpers.ts` supplies absolute audio timestamps and transitions.
The soundfont loader and recorded samples are unchanged.

## Audit and changes

| Technique                               | Previous behavior                                                                                                                                    | Current behavior                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hammer-on / pull-off (`h`, `p`)         | Restarted a target sample at a fixed offset; pull-offs replayed the pick transient; copied voices lost the original envelope.                        | Continues the vibrating string sample, changes pitch over 6 ms, and uses a softer level for hammer-ons than pull-offs. Compensates for recorded decay without compounding attenuation. When entering a phrase or the previous sample is exhausted or too quiet, starts beyond the target recording's transient with a short crossfade.                |
| Bend / release (`b`, `r`)               | Linear detune ramps could start during lookahead; releases restarted a sample 0.5 s into its recording.                                              | Anchors an eased pitch curve to the note's actual timestamp and preserves the same string through bend, held target, release, and repeated bends. A short initial hold retains the picked onset. Typical bends take up to 340 ms, scaled to note spacing.                                                                                             |
| Fretted / entry / exit slide (`/`, `\`) | Restarted the sample at 0.2 s with an arbitrary volume boost; entry targets omitted capo.                                                            | Continues the string through a 25–160 ms glide with subtle fret crossings and compensates destination levels for recorded decay. Refreshes faded samples without their pick attack. Corrects capo-relative targets and allows an exit slide at the end of the sequence.                                                                               |
| Vibrato (`~` on a fret)                 | Full-depth modulation appeared abruptly; standalone vibrato ignored the scheduled note delay; modulation oscillators had no lifetime bound.          | Fades depth in after the note/transition, with a roughly 5 Hz hand rate independent of rhythmic subdivision. Steel/electric vibrato bends up and returns (0–46 cents); nylon vibrato is shallower and symmetric (±18 cents). Stops modulation with its voice and supports bend plus vibrato and legato combinations. Open strings remain unmodulated. |
| Palm mute (`PM`)                        | Almost silenced the original voice, then applied 70–100× gain, resonant filtering, and up to 20 dB of bass boost; a dry path could remain connected. | Uses one signal path, a pitch-aware low-pass cutoff that darkens during the attack, and a rapid decay over 75–280 ms. Preserves the recorded pick attack without resonant gain compensation.                                                                                                                                                          |
| Dead string (`x`)                       | Generated a pitched sine thunk unrelated to the instrument/tuning.                                                                                   | Uses the selected guitar's string attack, strongly damps its pitched sustain, and adds quiet filtered contact noise over 45–75 ms. Dead strings keep their position in a strum.                                                                                                                                                                       |
| Percussive slap (`s`)                   | Mixed a fixed 100 Hz sine and white noise with a large mid boost.                                                                                    | Uses the tuned low-string sample for body resonance, filtered contact noise, and a 65–130 ms damped envelope. Mutes ringing strings at its scheduled timestamp.                                                                                                                                                                                       |
| Staccato (`.`)                          | Fixed 250 ms duration plus the player's default 300 ms release; replacements sometimes bypassed it.                                                  | Shortens every articulation to 45% of its note spacing, bounded to 35–220 ms, followed by a 12 ms anti-click release.                                                                                                                                                                                                                                 |
| Accent (`>`)                            | Several unrelated multipliers and lost accents on replacement voices.                                                                                | Consistent 1.22× level on all techniques; legato chains cannot compound accents into increasing gain.                                                                                                                                                                                                                                                 |
| Strum / arpeggio (`v`, `^`, chord `~`)  | Custom spreads already existed, but dead strings did not advance the strum offset.                                                                   | Preserves existing spread settings and direction, with dead-string attacks included in the spread. Chord `~` remains arpeggiation; only fret `~` adds vibrato.                                                                                                                                                                                        |
| Rest / pause                            | Timer callbacks replaced string handles later; effects could escape cancellation.                                                                    | Schedules cutoffs on the audio clock, tracks earlier sounding and future voices during lookahead, and registers chord/pattern preview voices for pause cancellation.                                                                                                                                                                                  |

## Voice lifecycle and sample limits

Each voice has one recorded buffer source, a low-pass filter, and a gain envelope.
An ending voice disconnects its graph and removes itself from the cancellation
registry. Modulation and contact-noise sources end and disconnect independently.
Noise buffers, analyzed attack offsets, and sample energy profiles are cached, and guitar samples never
loop. Sample consumption accounts for pitch changes before continuing legato.

### Destination-level correction

The first sample-based implementation had two related oversights: each connected
note multiplied the preceding note's gain by another articulation factor, and
that gain acted on a recording whose sustain had already decayed. Repeated
hammer-ons, pull-offs, and slides therefore became progressively quieter.

Destination levels now use a stable nominal articulation factor: 0.85 for a
hammer-on, 0.95 for a pull-off, and 0.92 for a slide. A cached stereo RMS profile
compares the destination recording's body at 200–300 ms with the remaining body
of the sounding sample, accounting for scheduled pitch changes. The resulting
sample compensation is absolute and bounded to 3×. When the tail would need more
gain, the voice crossfades to a fresh destination sample beyond its pick attack.
Accents apply only to the current note. Each recording still decays naturally
while a note is held; compensation is calculated at the transition.

These are approximations using picked recordings, not separately recorded
hammer-ons, fret noises, or palm mutes. Large pitch shifts also move the sample's
spectral character, and long phrases eventually exhaust its recorded sustain.
The fallback starts a fresh target sample without its pick transient when the
existing recording is exhausted or has faded too far. The chosen
millisecond, depth, and gain settings are tuning choices, not measured claims
about every guitar/player. No new notation or effects have been added.

The physical targets follow [Fender's technique descriptions](https://www.fender.com/articles/techniques/how-to-guitar-solo)
and [palm-muting guidance](https://www.fender.com/articles/techniques/3-keys-to-ace-your-palm-muting).
Scheduling, detune, and automation follow the [Web Audio specification](https://www.w3.org/TR/webaudio-1.0/).

## Verification

- `node scripts/verifyGuitarEffects.mjs`: 35 checks against the actual production
  parser/runtime, covering continuity, pitch targets, capo, effect combinations,
  onset timing, dynamics, strums, cancellation, and cleanup. Regression checks
  cover repeated attenuation, inherited accents, recorded decay, and bounded
  gain with attack-free sample refreshes.
- `node scripts/verifyGuitarEffects.mjs --browser`: writes a browser expression
  to `.git/guitar-effects-audio-checks.js`. Evaluate it in the collaborative
  preview at the running app's origin. This renders native OfflineAudioContext
  stereo audio from all four bundled instruments in OGG and MP3, checks pitch, level,
  decay, silence before onset/after pause, clipping, and cleanup, and adds a
  temporary audition panel. It does not save any tabs or touch the database.
- Native render verification passed all 280 checks, including 192 destination
  level cases across 60, 120, and 240 BPM. These include upward/downward slides,
  hammer-ons, pull-offs, repeated chains, and standalone transition markers.
  Destination body RMS was 83–95% of a normally plucked target note, preserving
  the intended articulation factors. Refreshed samples skipped the pick attack.
  Detected sustained
  pitch was within 10 cents of its expected target (including the recordings'
  own tuning); accent level was 1.22×, and muted/pause tails were silent.
- Add `--level-probe` to the browser command for detailed destination-level
  measurements without the broader checks or audition panel.
- `node scripts/verifyGuitarEffects.mjs --native` runs the same 280 native
  audio checks in headless Playwright Chromium. Bundled samples are supplied
  through request interception; no app server, external services, or database
  are needed. Requires Playwright Chromium installed locally.
- `--native --combinations` adds 256 assertions over four instruments, both
  formats, 44.1/48 kHz, and 125/62.5 ms note spacing (sixteenths at 120/240 BPM).
  These check continuous vibrato per ringing voice, slide/bend/release pitch,
  mixed palm mute/accent/staccato/percussion phrases, pause cancellation, and
  unchanged audio before a future transition. The last check runs with both
  native `cancelAndHoldAtTime` and the automation-history fallback. Every render
  also checks finite samples, headroom, and cancellation-registry cleanup.
  All 256 assertions passed, along with the existing 280 checks, the 12 stop
  configurations (`--native --stops`), and eight dead-note configurations
  (`--native --dead-notes`). These are signal/scheduling checks, not a listening
  evaluation or a guarantee about physical-device audio output.
- The running chord trainer successfully started/stopped sample voices through
  its normal UI with no audio exceptions or unhandled rejections.

## Close-succession articulation refinements

- Listening feedback prompted a lighter palm mute: pitched notes use a gentler
  exponential decay (4.8 instead of 6) and slightly higher low-pass cutoffs
  (6× the fundamental at attack, falling to 3.2×). This retains more note body
  and harmonic definition with the same short sustain and release deadlines.
  Dead-note and slap damping retain their existing settings.
- Incoming hammer-ons, pull-offs, and slides now have separate metadata from a
  destination bend/release. A phrase such as `3/ 5b 7 r` keeps the slide's fret
  crossings and the bend's hold and slower curve, rather than applying the
  slide's timing to both gestures. Re-bends use the string's current pitch
  instead of inserting a six-millisecond reset to its unbent pitch.
- Every held audio parameter explicitly anchors its next ramp. With no previous
  automation, a native hold alone left the first detune ramp free to begin
  before the destination timestamp during lookahead. Native waveform comparisons
  now catch this early pitch drift.
- Consecutive vibrato-marked legato notes preserve oscillator phase and depth
  on the same voice. Removing vibrato fades it out; later notes cannot extend
  its canceled stop deadline. A necessary sample refresh still starts a new
  voice and its delayed vibrato.
- Palm-mute tone changes on a continuing string ease over eight milliseconds.
  Damping and contact-noise envelopes retain a short piecewise-linear history
  so interruption preserves the sound already scheduled, including on the hold
  fallback. Noise reaches zero before its source stops, and subsequent stops
  cannot prolong its lifetime. This follows Web Audio's rule that a later
  [`stop()` call replaces a pending stop](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/stop).
