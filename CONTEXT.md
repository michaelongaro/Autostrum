# Autostrum

A single domain for composing, sharing, discovering, and practicing guitar arrangements through generated playback — not uploaded recordings or external video.

## Language

### People

**User**:
A signed-in account that can create tabs, bookmark, rate, and appear as a weekly featured creator.
_Avoid_: Artist (for accounts), account holder, member

**Artist**:
A named song credit attached to tabs. Not a signed-in account.
_Avoid_: User, creator, band (unless that is the credit string)

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

### Social

**Bookmark**:
A User’s saved reference to a Tab.
_Avoid_: Favorite, like, save (as a noun)

**Rating**:
A User’s 1–5 score for a Tab.
_Avoid_: Review (unless written commentary is added later)

### Playback

**Playback**:
Generated Web Audio performance of a Tab from its document data.
_Avoid_: Practice (as the system name), recording, stream

**Screenshot**:
A grayscale light/dark preview image of a Tab’s static view, stored for search cards and tinted to the viewer’s theme in the client.
_Avoid_: Thumbnail (when referring to the stored tab preview asset), preview image (prefer Screenshot)

### Out of language (for now)

Do not treat **Comment** as part of this domain until product deliberately revives it. The Prisma model is unfinished surface area, not current vocabulary.
