# Autostrum

A single domain for composing, sharing, discovering, and practicing guitar arrangements through generated playback — not uploaded recordings or external video.

## Language

### People

**User**:
A signed-in account that creates and interacts with Tabs. Usernames that differ only by casing are distinct Users.
_Avoid_: Artist (for accounts), account holder, member

**Artist**:
A named song credit attached to Tabs. Not a signed-in account. Names that differ only by casing are distinct Artists.
_Avoid_: User, creator, band (unless that is the credit string)

**Verified**:
An Artist treated as an official catalog credit. Set by ops only today; not a User identity proof.
_Avoid_: Official artist, authenticated, claimed

### Core document

**Tab**:
A shareable guitar arrangement document: metadata plus nested musical content.
_Avoid_: Song (unless referring to the real-world work being arranged), score

**Section**:
A titled part of a Tab that contains one or more subsections.
_Avoid_: Part, block (when referring to the titled container)

**Tab subsection**:
A fretboard-style subsection inside a Section, made of note columns and measure lines.
_Avoid_: Tab (for the subsection alone), fretboard block

**Chord subsection**:
A chord-chart subsection inside a Section, made of chord sequences tied to strumming patterns.
_Avoid_: Chord section (ambiguous with “section”), chart block

**Chord**:
A Tab-level named fretting that Chord sequences can reference.
_Avoid_: Chord subsection, playback column, voicing preset

**Chord sequence**:
A block inside a Chord subsection pairing a strumming pattern with ordered Chord names.
_Avoid_: Chord progression (confused with Section progression), chord row

**Strumming pattern**:
A reusable Tab-level pattern of Strums attached to Chord sequences.
_Avoid_: Rhythm pattern, strum chart

**Strum**:
One slot in a Strumming pattern.
_Avoid_: Beat, hit, playback column

**Note column**:
One playable column in a Tab subsection: six string cells plus length and techniques.
_Avoid_: Note (alone), Tab note, fret cell, beat column

**Measure line**:
An explicit divider column in a Tab subsection; may carry a sticky BPM after the line. Never auto-inferred.
_Avoid_: Bar line (unless deliberately equated), separator

**Section progression**:
An ordered playback plan of Sections, separate from the nested section tree.
_Avoid_: Arrangement, setlist, song form

### Tab metadata

**Genre**:
A closed-set style label on a Tab.
_Avoid_: Category, style tag

**Tuning**:
The six open-string pitches for a Tab.
_Avoid_: Pitch set, string notes (as the field name)

**Capo**:
Fret clamp position on a Tab; zero means none. Named Chord frets are relative to it.
_Avoid_: Clamp, fret marker

**BPM**:
Tempo for a Tab baseline, subsections, and sticky overrides after Measure lines.
_Avoid_: Tempo (as the field name), speed

**Difficulty**:
Creator-set hardness for a Tab on a 1–5 scale.
_Avoid_: Level, skill rating (confused with Rating)

**Key**:
Optional musical-key metadata on a Tab. Not used to calculate Playback pitch.
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
A Tab in the weekly popularity snapshot used by Explore and autofill.
_Avoid_: Song, trending song

**Page view**:
A counted Tab visit that feeds popularity, trending, and weekly featured users.
_Avoid_: Hit, impression, visit

**Anonymize**:
Keeping Tabs after account deletion while clearing authorship so they appear as Anonymous.
_Avoid_: Soft delete, orphan tabs, detach

### Playback

**Playback**:
Generated Web Audio performance of a Tab from its document data.
_Avoid_: Practice (as the system name), recording, stream

**Strum marking**:
A glyph on a Strum or chord-column slot that shapes how that slot is played.
_Avoid_: Effect (umbrella), modifier (unless referring to the in-app glossary UI)

**Technique**:
A guitar performance behavior encoded on note columns or strums that Playback recreates.
_Avoid_: Effect, ornament, modifier (as the domain term)

**Screenshot**:
A stored grayscale preview of a Tab’s static view, tinted to the viewer’s theme and Color in the client.
_Avoid_: Thumbnail (for the stored tab preview asset), preview image (prefer Screenshot)

**Color**:
A User’s persisted accent palette for UI theming and Screenshot tinting.
_Avoid_: Theme (light/dark alone), skin, brand color

### Out of language (for now)

Do not treat **Comment** as part of this domain until product deliberately revives it. The Prisma model is unfinished surface area, not current vocabulary.
