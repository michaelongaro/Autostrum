# label

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/AudioControls/AudioControls.tsx:22 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/ChordDialog.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/CustomTuningDialog.tsx:27 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/PostSignupDialog.tsx:17 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/SectionProgressionDialog.tsx:26 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/StrummingPatternDialog.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/PinnedTabList.tsx:12 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/SearchResults.tsx:23 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/ChordSequence.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx:40 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackMetronomeControl.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackSectionPicker.tsx:10 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PracticePlaybackSectionPicker.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Print/PrintTabDialog.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/SectionContainer.tsx:12 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrumSettingsDropdown.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMetadata.tsx:39 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabSection.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/modals/DeleteAccountModal.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/label.tsx:14 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/pages/profile/settings/index.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tools/chord-trainer.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tools/note-trainer.tsx:17 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Native label replaces the Radix label primitive. Label/control association and disabled styling remain.
Colors, typography, sizes and other custom classes are retained.

## Verify by hand

Activate associated checkbox/switch by clicking its label.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
