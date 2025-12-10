**Guitar effect audio recreation methodology**  
All guitar effects are recreated using the Web Audio API with Soundfont.js providing the base guitar samples. The implementation prioritizes realistic sound reproduction while managing memory efficiently through proper cleanup of AudioBufferSourceNodes.

- **Bends/Releases (b/r)**
  - Uses the `detune` property on AudioBufferSourceNode to gradually change pitch
  - Detune value calculated as `(fretToBendTo - baseFret) * 100` cents (100 cents = 1 semitone)
  - For regular bends, transition duration is `(60 / bpm) * 0.5` seconds
  - For arbitrary slides, duration is halved to `(60 / bpm) * 0.25` for faster movement
  - When not plucking the base note (continuing from previous note), creates new buffer source starting at 0.5s offset with a gain ramp from 0.01 to 1.1 over 0.1s for smooth attack
  - `linearRampToValueAtTime()` creates the smooth pitch transition characteristic of bends

- **Hammer-ons/Pull-offs (h/p)**
  - Immediately stops the plucked note to prevent audible attack
  - Creates new buffer source with detune preset to the tethered fret value
  - Starts playback at different offsets: pull-offs at 0s, hammer-ons at 0.1s for subtle attack
  - Gain ramps from 0.01 to 1.0 (pull-offs) or 1.1 (hammer-ons) over 0.05s
  - Transition duration is 0 (instantaneous) since these are percussive techniques
  - Immediately ramps detune back to 0.001 (smallest viable value) to simulate finger landing on target fret

- **Slides (/ \\)**
  - Similar to bends but with longer playback offset (0.2s) for more pronounced sliding sound
  - Gain ramps to 1.3 for slightly louder volume characteristic of slides
  - Transition duration of `(60 / bpm) * 0.25` seconds for the sliding movement
  - Detune starts at tethered fret value and ramps to target fret

- **Vibrato (~)**
  - Creates a separate sine wave oscillator to modulate the note's detune parameter
  - Oscillator frequency is BPM-relative: ranges from 3Hz (slow BPM) to 5Hz (fast BPM) via `calculateRelativeVibratoFrequency()`
  - Depth is fixed at 25 cents (quarter of a semitone) via a gain node
  - Starts after a slight delay of `(60 / bpm) * 0.15` to let the note establish
  - For non-plucked vibratos (continuing from previous note), creates buffer source at 0.5s offset with gain ramping from 0.01 to 1.3
  - Oscillator is connected to the source node's `detune` parameter for continuous pitch modulation

- **Palm Muting (PM)**
  - Applies aggressive low-pass filtering: 500Hz cutoff for high strings (0-2), 1000Hz for low strings (3-5)
  - High Q value of 5 for sharp frequency rolloff
  - Bass boost via peaking filter at 120Hz: +10dB for high strings, +20dB for low strings (Q=10)
  - Gain multiplier of 70 (normal) or 100 (accented), reduced to 0.7/1.0 for tethered effects
  - Note duration shortened to 0.45s for muted sustain characteristic
  - Original note gain reduced to 0.01 with duration of 0.45s when palm muting is present

- **Dead Notes (x)**
  - Synthesized using a sine wave oscillator instead of sampled audio
  - Frequency mapped to string/fret position via weighted calculation: 70% influenced by string index, 30% by fret
  - Frequency range: 50Hz-200Hz, with higher strings producing higher frequencies
  - Very short duration (0.1s) for percussive "thunk" sound
  - Per-string gain compensation: low E (1.7x), A (1.6x), D (1.5x), G (0.8x), B (0.7x), high E (0.6x)
  - Base gain of 0.00875, increased to 0.0125 for accented, reduced to 0.005 for palm muted
  - Uses highpass filter at 100Hz and peaking filter at 1200Hz (+1dB, Q=1) for mid-range clarity
  - Exponential gain ramp to 0.0001 over 0.1s for natural decay

- **Slap (s)**
  - Stops all currently playing strings to create percussive effect
  - Combines sine oscillator (100Hz) with white noise buffer for realistic slap texture
  - Noise buffer: 0.2s duration filled with random values between -1 and 1
  - Lowpass filter at 2200Hz to remove harsh high frequencies
  - Peaking filter at 800Hz (+8dB, Q=1) for characteristic mid-range "snap"
  - Base gain of 0.25, increased to 0.45 for accented, reduced to 0.1 for palm muted
  - Duration of 0.1s for staccato/palm muted, 0.25s for normal (gain increased 1.25x for shorter duration)
  - Both oscillator and noise use exponential decay to 0.01 over the duration

- **Staccato (.)**
  - Implemented at note generation level by reducing duration to 0.25s
  - No additional audio processing, just shortened sustain

- **Accent (>)**
  - Increases gain multiplier: 1.5x for regular notes, 1.25x for bends
  - For palm muted notes, gain is 100 (vs 70 normal) or 1.0 for tethered effects (vs 0.7)
  - Applied at note generation level before any effects processing

- **Effect Chaining**
  - Tethered effects (h/p/\\/) can have subsequent effects (vibrato, bends) applied after the transition completes
  - Palm muting is always applied last in the effect chain to properly filter the complete processed signal
  - Effects are connected in series through the Web Audio API node graph, terminating at the master volume gain node
