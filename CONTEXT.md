# Autostrum

A single domain for composing, sharing, discovering, and practicing guitar arrangements through generated playback — not uploaded recordings or external video.

## Language

### People

**User**:
A signed-in account that can create tabs, bookmark, rate, and appear as a weekly featured creator.
_Avoid_: Artist (for accounts), account holder, member

**Artist**:
A named song credit attached to tabs. Not a signed-in account. Names that differ only by casing are distinct Artists.
_Avoid_: User, creator, band (unless that is the credit string)

**Verified**:
An Artist flag meaning the credit is treated as an official catalog entry (badge in search/profile). Not a User identity proof.
_Avoid_: Official artist, authenticated, claimed

### Core document

**Tab**:
A shareable guitar arrangement document: metadata plus nested musical content (sections, chords, strumming patterns, progression).
_Avoid_: Song (unless referring to the real-world work being arranged), score

**Section**:
A titled part of a Tab (for example verse or chorus) that contains one or more subsections.
_Avoid_: Part, block (when referring to the titled container)

**Tab subsection**:
A fretboard-style subsection inside a Section (`type: "tab"`), made of note columns and measure lines.
_Avoid_: Tab (for the subsection alone), fretboard block

**Chord subsection**:
A chord-chart subsection inside a Section (`type: "chord"`), made of chord sequences tied to strumming patterns.
_Avoid_: Chord section (ambiguous with “section”), chart block

**Chord**:
A Tab-level named fretting (name, frets, optional color) that Chord sequences can reference.
_Avoid_: Chord subsection, playback column, voicing preset

**Chord sequence**:
A block inside a Chord subsection: a strumming pattern plus ordered Chord names, local BPM, and repetitions.
_Avoid_: Chord progression (confused with Section progression), chord row

**Strumming pattern**:
A reusable Tab-level pattern of Strums attached to Chord sequences.
_Avoid_: Rhythm pattern, strum chart

**Strum**:
One slot in a Strumming pattern (marking, note length, optional palm-mute markers).
_Avoid_: Beat, hit, playback column

**Note column**:
One playable column in a Tab subsection: six string cells plus length and techniques.
_Avoid_: Note (alone), Tab note, fret cell, beat column

**Measure line**:
An explicit divider column in a Tab subsection; may set sticky BPM after the line. Never auto-inferred.
_Avoid_: Bar line (unless deliberately equated), separator

**Section progression**:
An ordered playback plan of Sections (repetitions and timing bounds), separate from the nested section tree.
_Avoid_: Arrangement, setlist, song form

### Tab metadata

**Genre**:
A closed-set style label on a Tab used for display and search.
_Avoid_: Category, style tag

**Tuning**:
The six open-string pitches for a Tab (preset or custom).
_Avoid_: Pitch set, string notes (as the field name)

**Capo**:
Fret clamp position on a Tab (`0` means none). Named Chord frets are relative to it.
_Avoid_: Clamp, fret marker

**BPM**:
Tempo for a Tab baseline, subsections, and sticky overrides after Measure lines.
_Avoid_: Tempo (as the field name), speed

**Difficulty**:
Creator-set 1–5 hardness for a Tab.
_Avoid_: Level, skill rating (confused with Rating)

**Key**:
Optional musical-key metadata on a Tab. Display/search metadata only — not used to calculate Playback pitch.
_Avoid_: Tonality, scale (unless that is the selected string)

### Social & discovery

**Bookmark**:
A User’s saved reference to a Tab.
_Avoid_: Favorite, like, save (as a noun)

**Rating**:
A User’s 1–5 score for a Tab.
_Avoid_: Review (unless written commentary is added later)

**Pinned tab**:
The single Tab a User highlights on their profile.
_Avoid_: Featured tab (confused with Weekly featured user), pinned chords

**Weekly featured user**:
A User promoted on Explore from weekly Tab page-view totals.
_Avoid_: Weekly featured artist, featured artist

**Trending tab**:
A Tab in the weekly popularity snapshot used by Explore/autofill.
_Avoid_: Song, trending song

**Page view**:
A counted Tab visit (after dwell and daily IP dedupe) that feeds all-time popularity, trending, and weekly featured users.
_Avoid_: Hit, impression, visit

**Anonymize**:
On account delete: keep Tabs but clear authorship so they appear as Anonymous.
_Avoid_: Soft delete, orphan tabs, detach

### Playback

**Playback**:
Generated Web Audio performance of a Tab from its document data.
_Avoid_: Practice (as the system name), recording, stream

**Strum marking**:
A glyph on a Strum or chord-column slot (for example down/up/slap/staccato) that shapes how that slot is played.
_Avoid_: Effect (umbrella), modifier (unless referring to the in-app glossary UI)

**Technique**:
A guitar performance behavior encoded on note columns or strums (bend, slide, hammer-on/pull-off, vibrato, palm mute, dead note, slap, accent, staccato) that Playback recreates in Web Audio.
_Avoid_: Effect, ornament, modifier (as the domain term)

**Screenshot**:
A grayscale light/dark preview image of a Tab’s static view, stored for search cards and tinted to the viewer’s theme/accent in the client.
_Avoid_: Thumbnail (when referring to the stored tab preview asset), preview image (prefer Screenshot)

**Color**:
A User’s persisted accent palette that themes the UI and tints Screenshots.
_Avoid_: Theme (light/dark alone), skin, brand color

### Out of language (for now)

Do not treat **Comment** as part of this domain until product deliberately revives it. The Prisma model is unfinished surface area, not current vocabulary.
