# select

2026-11-04 — engine; migrated the customized wrapper, then corrected nested playback scroll locking and item/checkmark sizing.

## Changed

- src/components/AudioControls/AudioControls.tsx:35 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/SectionProgressionDialog.tsx:23 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/StrummingPatternDialog.tsx:16 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/PinnedTabList.tsx:10 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/SearchResults.tsx:32 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/ChordSequence.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx:54 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackSectionPicker.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PracticePlaybackSectionPicker.tsx:10 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Print/PrintTabDialog.tsx:19 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrummingPatternStrum.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMetadata.tsx:49 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabSection.tsx:16 — updated consumer composition, callbacks, focus or utility import.
- src/components/tools/PracticePlaybackPanel.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/CapoSelect.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/TuningSelect.tsx:10 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/select.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/pages/tools/chord-trainer.tsx:22 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tools/metronome.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tools/note-trainer.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx — Instrument and Loop delay use modal=false so PlaybackModal's existing scroll/focus handling remains in charge instead of hiding the document scrollbar a second time.
- src/components/Tab/Playback/PlaybackSectionPicker.tsx and src/components/Tab/Playback/PracticePlaybackSectionPicker.tsx — the section/exercise dropdowns use the same nested, non-modal Select behavior.
- src/components/ui/select.tsx — popup width can grow to its content, with a combined minimum of 8rem or the anchor width and a viewport maximum. Item labels and checkmarks have separate flex columns with an 8px gap; the indicator cannot shrink or shift left into the text.
- scripts/verifyPlaybackSelectLayout.mjs — local playback fixture verifies unchanged document overflow/width and modal geometry for all three reported selects, no label/checkmark overlap, selection, and Escape dismissal without closing playback. All tRPC requests are fulfilled locally.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Popup positioning remains below the trigger by default (alignItemWithTrigger=false), matching the previous popper setting. The wrapper derives Base UI items labels from existing SelectItem children so rich labels display before popup mount and SSR; custom child components that generate SelectItems internally must supply items explicitly. Nullable onValueChange values are guarded by callers.
Overlay animations use starting/ending-style transitions instead of Radix keyframes; colors, typography, sizes and other custom classes are retained.

Playback follow-up: nested playback selects rely on the surrounding modal's scroll lock. Other Select roots retain Base UI's modal default. Within playback, outside controls remain under the playback modal's own event/focus handling rather than a second Select backdrop. Natural popup sizing and a dedicated indicator column prevent narrow triggers (such as the 80px loop-delay trigger) from forcing labels underneath checkmarks.

## Verify by hand

Open a long list; use End, Home and typeahead; select with Enter; verify rich labels, scrolling, disabled items, Escape, and a select inside a dialog.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
Run node scripts/verifyPlaybackSelectLayout.mjs for the reported desktop playback regressions. It reproduced scrollbar overflow changes and overlapping loop-delay text/checkmark before the fix and passes afterward. Open Instrument, Loop delay and Section on a desktop with inset scrollbars; confirm no movement, clear checkmarks, selection and Escape behavior.

Playback follow-up validation: the targeted playback regression passes in Chromium and WebKit, including selection and Escape. TypeScript still reports the same 30 existing diagnostics, with none in the changed components. Targeted lint reports only the pre-existing set-state-in-effect error in PlaybackBottomMetadata's mobile settings effect; the new Select and picker changes introduce no lint findings.
