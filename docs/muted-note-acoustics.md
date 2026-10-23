# Muted guitar note acoustics and Autostrum playback

Research and implementation date: 2026-10-22.

Confirmed scope: struck dead notes marked `x`. Palm muting is discussed only to
distinguish the articulations; the recommendations below target the dead-note
renderer.

## Finding

Muted strings should not all sound identical. For dead notes marked `x`, the
audible difference is principally the color of a short percussive attack, rather
than a stable musical pitch. String tuning is relevant, but does not by itself
determine a unique dead-note frequency. Flat's developers explicitly report using
different dead-note samples for different strings for this reason. [1]

Palm-muted fretted notes are a separate articulation: the intended note remains
recognizable while damping shortens the sound and changes its brightness.
Research on palm muting identifies shorter duration, reduced spectral energy,
and reduced high-frequency content as relevant changes. [2]

## Physical model

For an ideal string, the undamped fundamental is:

```text
f0 = (1 / (2 L)) sqrt(T / mu)
```

`L` is vibrating length, `T` is tension, and `mu` is mass per unit length.
Changing tuning changes tension; a fret or capo changes vibrating length. The
string's modes are approximately integer multiples of this fundamental, with
real-string stiffness introducing departures from exact harmonicity. [3]

A useful conceptual synthesis model is:

```text
sound(t) = contact_transient(t)
         + sum(A_n * exp(-t / tau_n) * sin(2 pi f_n t + phase_n))
         + body_response(t)
```

The mode frequencies `f_n`, amplitudes `A_n`, and decay times `tau_n` are separate
parameters. This is a conceptual model, not a fitted model of Autostrum's samples.
String synthesis research uses frequency-dependent damping and a distinct
excitation/body response rather than treating realism as pitch selection alone.
[4, 5]

Touching the string dissipates energy and changes which vibrations survive.
Contact position and pressure matter: even a commercial physical-model guitar
separately models fretting-hand contact, residual harmonics, palm damping, and
body response. Its documentation describes open-string leakage at light contact,
fretted pitch at stronger contact, and position-dependent harmonics between those
conditions. [6]

Consequently, an `x` alone does not specify enough information to reconstruct an
exact acoustic result. It does not encode contact position, pressure, contact
width, or the number of fingers touching the string. A generic dead-note sound
must choose a plausible default.

## What should vary

- **Tuning:** residual string resonances should respond to the actual tuning and
  capo. Lowering a string should generally lower its residual string component;
  this does not mean shifting the whole attack and guitar body response by the
  same interval. This is an inference from the physical model.
- **Physical string:** string material, construction, and mass affect vibration
  and damping. String identity and tuning should therefore be separate inputs.
  As a sound-design starting point, wound bass strings can have a heavier thud
  and plain treble strings a lighter, sharper attack. This is a qualitative
  target to validate with recordings, not a universal frequency rule.
- **Damping:** suppress sustained periodic ringing for an `x`; preserve enough
  periodic vibration to recognize the intended note for palm muting.
- **Contact:** allow small changes in attack and brightness between repeated
  hits. Avoid making large random pitch shifts that imply different notes.
- **Instrument:** an acoustic body's response and an electric pickup's response
  need not have the same balance. Instrument-specific reference recordings are
  needed before claiming acoustic accuracy.

## Original Autostrum implementation

Inspected `src/utils/playGeneratedAudioHelpers.ts` and
`src/utils/guitarEffects.ts`.

1. The `x` branch already passes `tuning[adjustedStringIdx] + capo` to
   `playGuitarPercussion`. Its recorded source therefore already depends on
   tuning. Adding another fixed pitch offset per string would duplicate that
   mapping rather than supply the missing timbre information.
2. Dead-note sample processing uses a fixed 650 Hz high-pass and 1800 Hz
   low-pass. For reference, standard-tuning open-string fundamentals range from
   about 82.4 Hz to 329.6 Hz. The high-pass attenuates that entire range,
   particularly the lower strings; upper partials can still distinguish them.
3. Every dead note adds the same deterministically generated noise waveform,
   starting at the beginning of the buffer, through a fixed 1200–4500 Hz band.
   This component does not vary with tuning or physical string.
4. Dead-note envelopes use 75 ms normally or 45 ms with palm muting, followed
   by the shared 12 ms release. The envelope drops exponentially in amplitude,
   so those durations are not an estimate of equally loud audible sustain.
5. `stringIdx` controls voice ownership and replacement, but does not explicitly
   control dead-note tone. The soundfont buffers are keyed by MIDI pitch rather
   than physical string. Two physical strings assigned the same MIDI pitch
   therefore use the same recorded source and dead-note processing.
6. Palm-muted pitched notes already use the actual note's fundamental to set a
   descending low-pass cutoff and apply a short decay. Their pitch treatment
   is conceptually appropriate; any further work needs a listening comparison.

The fixed filters and shared noise were plausible reasons string differences
could be weak. This was a code-based hypothesis, not an established listening
result.

## Recommended implementation direction

For a first improvement using the existing soundfont system:

1. Preserve the existing tuning/capo mapping.
2. Make the dead-note string component's spectral envelope depend on its actual
   frequency. Replace the fixed high-pass with a carefully controlled way of
   retaining a brief low-frequency body while preventing a ringing open note.
3. Give physical strings distinct contact/transient profiles, independently of
   pitch. Include small attack variations so repeated hits do not reuse an
   identical transient; use a reproducible sequence for offline comparisons.
4. Keep string resonance, contact noise, and body coloration independently
   adjustable. Avoid a clean sine oscillator or a narrow resonant filter that
   turns an `x` into a pitched beep. Avoid transposing all body resonances with
   string tuning.
5. Keep the existing short envelope as an initial baseline. Tune attack,
   frequency-dependent decay, and noise balance against real recordings before
   deciding that changing total duration is necessary.

These are engineering recommendations inferred from the sources and current
code. No source establishes a universal cutoff multiplier, noise level, or
dead-note duration; those values require measurement or listening calibration.

For higher fidelity, record dedicated dead-note samples for each physical string
and supported instrument type, with several attack variants. Apply conservative
retuning to the string component and compare alternate tunings against recordings.
This avoids relying entirely on a heavily filtered normal pluck to emulate a
different contact condition. It is a recommended approach, not a guarantee that
any particular sample set will outperform the current renderer.

## Implemented changes

`src/utils/guitarEffects.ts` now gives dead notes a profile determined separately
by the physical string index and actual MIDI pitch (which already includes
tuning and capo).

- The sample high-pass follows the string fundamental. A descending low-pass
  removes upper partials quickly while retaining a short string body.
- Treble strings receive shorter, sharper attacks; bass strings receive a
  heavier, slightly longer body. Normal decay lengths range from 63 to 75 ms,
  plus the shared release. Palm-muted `x` notes and staccato `x` notes shorten
  that envelope further.
- The existing recorded-attack detector locates the post-attack sample body.
  This prevents quiet lead-ins, particularly in nylon recordings, from consuming
  most of the short dead-note envelope. Generated contact noise supplies the
  separate percussive attack.
- Contact filtering varies by physical string, with a mild response to tuning.
  Contact noise lasts at most 35 ms. Four reproducible variants change attack
  shape, brightness, and noise-buffer position without changing sample pitch.
  Different string offsets also decorrelate simultaneous noise bursts.
- Existing voice ownership, stopping, and cleanup cover both body and contact
  noise. Ordinary pitched palm-muted notes and slap articulation retain their
  existing signal processing.

These profiles are sound-design defaults inferred from the research. They are
not a measured recreation of a particular guitar or finger-contact position;
dedicated per-string recordings remain a possible future improvement.

## Verification

Passed:

- `node scripts/verifyGuitarEffects.mjs`: 25 scheduling checks, including retuned
  and capo-adjusted sample selection, attack variation without pitch shifts,
  and cancellation of sounding and future dead-note sources.
- Native Chromium `OfflineAudioContext` checks generated by
  `node scripts/verifyGuitarEffects.mjs --browser --dead-notes`: four guitar
  soundfonts, each in Ogg at 48 kHz and MP3 at 44.1 kHz. These cover all six
  strings, low C/drop D, capo equivalence, physical string differences at the
  same MIDI pitch, repeated hits, short articulations, choking a ringing string,
  pause before/during playback, and accented simultaneous/up/down strums.
- The rendered low-string body remained measurable independently of contact
  noise for every soundfont/format. All checked renders were finite, unclipped,
  and removed ended voices from the cancellation registry. The largest measured
  peak among the standard-string and accented-strum cases was approximately
  0.183, below the clipping threshold of 1.
- `npx eslint src/utils/guitarEffects.ts` and `git diff --check`.

`npx tsc --noEmit --incremental false` reports 30 repository diagnostics in
unrelated files, including soundfont registries, practice UI, playback strip
types, and color utilities. It reports none in `src/utils/guitarEffects.ts`.
The full build was not run because it deploys migrations to the shared database.

The dead-note browser check also provides steel-string audition buttons for
the six-string sequence and repeated attacks. Objective checks do not establish
subjective naturalness; listening against real dead-note recordings remains the
reference for further timbre tuning.

## Additional listening comparisons

- Listen to isolated `x` hits on all six strings and muted up/down strums.
- Compare standard tuning with drop D, a lower tuning, and capo changes.
- Compare two physical strings set to the same MIDI pitch to verify that string
  identity can affect timbre independently of tuning.
- Compare the supported steel, nylon, and electric soundfonts and available
  sample formats.
- Compare attacks at matched loudness; a louder sample should not win merely
  because it is louder.
- Measure decay and spectral distribution to supplement listening. Verify that
  dead notes have no unwanted sustained ringing and that palm-muted fretted
  notes retain the intended pitch.
- Verify repeated hits, dense strums, clipping, pause/cancellation, and rapid
  replacement of a ringing note by an `x` on the same string.

The existing `scripts/verifyGuitarEffects.mjs` and
`scripts/guitarEffectsAudioChecks.mjs` contain the repeatable verification entry
points described above.

## Sources

1. [Flat — Dead notes available](https://blog.flat.io/dead-notes-available/).
   First-party account of per-string dead-note samples in a notation player.
2. [Biral, d'Alessandro, and Freed — Towards a Dynamic Model of the Palm Mute
   Guitar Technique Based on Capturing Pressure Profiles Between the Guitar
   Strings, ICMC/SMC 2014](https://www.icmc14-smc14.net/images/proceedings/PS4-B10-TowardsaDynamicModel.pdf).
   Research on palm contact, damping, and audible features.
3. [UNSW — Strings, standing waves and harmonics](https://newt.phys.unsw.edu.au/jw/strings.html).
   String frequency, harmonics, and physical string properties. The research
   browser returned indexed text, but direct retrieval timed out.
4. [Sanders and Weiss — Synthesizing a Guitar Using Physical Modeling
   Techniques](https://www.ee.columbia.edu/~ronw/dsp/).
   Waveguide synthesis, loop damping, and recorded excitation signals.
5. [Rau, Abel, James, and Smith — Electric-to-acoustic pickup processing for
   string instruments: An experimental study of the guitar with a hexaphonic
   pickup, JASA 2021](https://graphics.stanford.edu/~djames/publication/electric-to-acoustic-pickup-processing-for-string-instruments-an-experimental-study-of-the-guitar-with-a-hexaphonic-pickup/).
   Frequency-dependent damping as distinct from static equalization.
6. [Applied Acoustics Systems — Strum GS-2 manual, sections 5.3.4–5.3.6](https://s3.amazonaws.com/aas_manual/strum-gs-2-manual.pdf).
   First-party physical-model instrument documentation; an engineering reference,
   not a controlled acoustic experiment.
