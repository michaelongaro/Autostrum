# separator

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/AudioControls/AudioControls.tsx:36 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/GlossaryDialog.tsx:2 — updated consumer composition, callbacks, focus or utility import.
- src/components/Footer/Footer.tsx:5 — updated consumer composition, callbacks, focus or utility import.
- src/components/Header/MobileHeader.tsx:32 — updated consumer composition, callbacks, focus or utility import.
- src/components/HomePage/FAQ.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/EditImageSelector.tsx:16 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/PinnedTabSelector.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/GridTabCard.tsx:17 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/SearchInput.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/SearchResults.tsx:33 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Chords.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackSectionPicker.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PracticePlaybackSectionPicker.tsx:12 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/SectionContainer.tsx:21 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticSectionContainer.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticTab.tsx:21 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticTabMetadata.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Tab.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMetadata.tsx:50 — updated consumer composition, callbacks, focus or utility import.
- src/components/User/UserProfile.tsx:19 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/select.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/separator.tsx:6 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/pages/explore/index.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/pages/index.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/pages/profile/settings/index.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/pages/profile/statistics/index.tsx:30 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Base UI renders role=separator by default; Radix previously defaulted these wrappers to decorative. Geometry and orientation are unchanged.
Colors, typography, sizes and other custom classes are retained.

## Verify by hand

Check horizontal and vertical separators and screen-reader announcements.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
