# Autostrum guitar recordings

These are dedicated guitar multisamples, prepared as mono 44.1 kHz MP3 at
192 kbit/s. Each bank's `manifest.json` maps original MIDI roots, pitch ranges,
picking strengths, and alternate takes to content-hashed files.

- `steel`: FlameStudios Seagull, distributed by FreePats. GPL v3 or later with
  the FreePats composition exception. Original source archive, SFZ mapping,
  README, and GPL text are included. Autostrum's tuning, filtering, leveling,
  trimming, and encoding preserve that license and composition exception.
- `nylon`: University of Iowa MIS Raimundo 118 classical guitar, played by
  Brian Penkrot. Iowa's unrestricted-project usage permission and credits
  are documented in `nylon/LICENSE.txt`.
- `electric`: FreePats Fender FSBS clean bridge pickup, CC0 1.0. The original
  SFZ mapping, README, and CC0 text are included. Two original takes per zone
  are used; clean and jazz presets share these recordings.

Full source URLs, archive hashes, preparation steps, implementation details,
and verification instructions are in `decisions/guitar-samples.md` in the
repository. The conversion script is `scripts/prepareGuitarSamples.mjs`.

The recordings have been isolated where needed, filtered for rumble, corrected
for tuning, leveled, trimmed, faded, and compressed for browser playback.
No Guitoro-hosted recording or privately licensed Guitoro preset is included.
