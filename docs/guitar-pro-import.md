# Guitar Pro import

On `/create`, **Import** sits beside Preview and Publish. It opens a desktop dialog or mobile drawer titled **Import a Guitar Pro tab**. Preview and Publish stay together at the top right; Import sits to the left of Preview when space permits, otherwise right-aligned below Publish. Users can drop or browse for one file, select a fretted track/staff, review the conversion report, and import. Replacing a draft is one undoable action. Importing does not publish the tab.

## Formats and processing

Uses `@coderline/alphatab` 1.9, MPL-2.0, with its Guitar Pro parsers only:

- Guitar Pro 3, 4, 5: `.gp3`, `.gp4`, `.gp5`
- Guitar Pro 6: `.gpx`
- Guitar Pro 7 and 8: `.gp` (`.gp7` and `.gp8` filenames also accepted)
- Guitar Pro 1/2 `.gtp`: export to GP5 in Guitar Pro first.

Parsing and conversion run in a lazily loaded browser worker. The original file never goes to the server; the converted document uses the existing draft save flow. Closing cancels parsing. Limits: 20 MB file, 64 MB decoding buffer, 20-second processing timeout, 4,000 expanded measures and 30,000 note columns.

## Conversion

Preserves title, artist in the artist combobox, album in the description, tuning, capo, section markers, measure boundaries, ordinary frets, rests, supported dotted rhythms, dead notes, vibrato, adjacent hammer-ons/pull-offs/slides, palm muting, brush direction and tempo changes. Repeats and alternate endings expand into editable measures. Users still choose a genre and review before publishing.

When importing, the artist name is trimmed and matched case-insensitively against existing artists. Matches retain the saved ID, canonical spelling and verification status. Otherwise the name becomes a new artist entry in the combobox, created in the database on publication using the existing flow. A failed lookup leaves the draft untouched and allows retrying; canceling a pending lookup prevents it from replacing the draft.

Each import reports the relevant adjustments before applying them:

| Source feature | Fallback |
| --- | --- |
| Multiple tracks/staves | Import the selected fretted staff; drums and notation-only instruments are excluded. |
| Multiple voices | Combine note onsets; independent sustains shorten and same-string conflicts favor the first voice. |
| Fewer than six strings | Add unused lower strings while keeping original tuning and frets. |
| More than six strings | Keep the highest six; revoice other notes at the same pitch when playable, otherwise omit them. |
| Frets outside 0–22 | Revoice to an available string at the same pitch, otherwise omit. |
| Tuplets, very short/long rhythms | Nearest supported whole–sixteenth duration, including dots; timing may change. |
| Ties | Pick the continuation again. |
| Bend/release and whammy curves | Vibrato at the written fret. |
| Harmonics, trills | Ordinary fretted note. |
| Multiple note effects | Prefer an adjacent transition, vibrato, accent, then staccato. |
| Slide-ins and pick slides | Ordinary fretted note. |
| Partial palm muting | Preserve the muted strings in playback metadata; isolated muted notes use a short mute line. The editor's mute line still marks the column. |
| Brush/arpeggio speed | Automatic Autostrum strum timing. |
| Let ring | Normal editor sustain. |
| Mid-measure tempo | Step at the next note boundary, shown with a measure line. |
| Gradual tempo ramps | Stepped changes; BPM rounded and limited to 1–400. |
| Grace notes, fermatas, swing/shuffle | Omit grace notes and holds; use written straight timing. |
| D.C./D.S./coda/fine | Written order with ordinary bar repeats expanded. |
| Ghost volume, dynamics, tremolo picking, fades, crescendo, tap/slap/pop, rasgueado, pedals | Standard picked-note playback. |
| Signatures, lyrics, chord diagrams, fingering, sound presets, mixing | Omit; notes remain editable. |

## Verification

`node scripts/verifyGuitarProImport.mjs` checks real files from GP3 through GP8, effects, tempo, tuning/capo, revoicing, malformed files, size limits, repeat ordering against alphaTab MIDI playback, and atomic import/undo/redo. Fixtures and their MPL license are under `tests/fixtures/guitar-pro`.

With the dev server running, `E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/guitar-pro-import.spec.ts` exercises the actual bundled worker, file selection/drop, error handling, cancellation, draft replacement, and undo. It uses an unpublished guest draft and does not create database records.
