# button

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/AudioControls/AudioControls.tsx:21 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/ChordDialog.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/CustomTuningDialog.tsx:5 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/DraftsDialog.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/GlossaryDialog.tsx:22 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/PostSignupDialog.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/SectionProgressionDialog.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/StrummingPatternDialog.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Explore/WeeklyFeaturedUsers.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Footer/Footer.tsx:3 — updated consumer composition, callbacks, focus or utility import.
- src/components/Header/DesktopHeader.tsx:23 — updated consumer composition, callbacks, focus or utility import.
- src/components/Header/MobileHeader.tsx:25 — updated consumer composition, callbacks, focus or utility import.
- src/components/HomePage/Hero.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/HomePage/SignupCTA.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/HomePage/TabMarquee.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/HomePage/ToolsShowcase.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/EditImageSelector.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/PinnedTabList.tsx:16 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/PinnedTabSelector.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/GridTabCard.tsx:16 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/NoResultsFound.tsx:3 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/SearchInput.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/SearchResults.tsx:21 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/TableTabRow.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/ChordSequence.tsx:2 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Chords.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/DraftEditor.tsx:12 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/MiscellaneousControls.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx:31 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackMetronomeControl.tsx:3 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackTunerDialog.tsx:3 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Print/PrintTabDialog.tsx:3 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/SectionContainer.tsx:10 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/SectionProgression.tsx:2 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/RelatedTabs.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticStrummingPattern.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticTab.tsx:5 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticTabMetadata.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrumSettingsDropdown.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrummingPatternStrum.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrummingPatterns.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Tab.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMeasureLine.tsx:17 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMetadata.tsx:37 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabSection.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/User/UserProfile.tsx:20 — updated consumer composition, callbacks, focus or utility import.
- src/components/modals/DeleteAccountModal.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/tools/PracticePlaybackPanel.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/tools/ToolRouteHeader.tsx:3 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/ArtistCombobox.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/PlaybackSpeedPopover.tsx:3 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/TuningSelect.tsx:2 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/alert-dialog.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/button.tsx:2 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/pages/explore/index.tsx:25 — updated consumer composition, callbacks, focus or utility import.
- src/pages/index.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/pages/profile/bookmarks/[...filters].tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/pages/profile/settings/index.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/pages/profile/statistics/index.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/pages/profile/tabs/[...filters].tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tab/[id]/edit.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tools/chord-trainer.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tools/metronome.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/pages/tools/note-trainer.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Base UI defaults native buttons to type="button". Link renderers explicitly keep link semantics and use nativeButton={false}. Refs now support HTMLElement, as required by polymorphic renderers.
Colors, typography, sizes and other custom classes are retained.

## Verify by hand

Follow header/footer links and activate toolbar buttons with keyboard; verify disabled state and mobile sizes.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
