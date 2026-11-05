# visually-hidden

2026-11-04 — engine; replaced the directly imported Radix utility with a local sr-only span. Base UI has no corresponding primitive.

## Changed

- src/components/AudioControls/AudioControls.tsx:49 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/ChordDialog.tsx:22 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/CustomTuningDialog.tsx:26 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/GlossaryDialog.tsx:17 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/PostSignupDialog.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/SectionProgressionDialog.tsx:33 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/StrummingPatternDialog.tsx:39 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/TipsDialog.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Header/MobileHeader.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/EditImageSelector.tsx:20 — updated consumer composition, callbacks, focus or utility import.
- src/components/Profile/PinnedTabSelector.tsx:19 — updated consumer composition, callbacks, focus or utility import.
- src/components/Search/SearchResults.tsx:44 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticTab.tsx:20 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Tab.tsx:32 — updated consumer composition, callbacks, focus or utility import.
- src/components/modals/DeleteAccountModal.tsx:21 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/RateTab.tsx:30 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Local sr-only span replaces the utility package; hidden content remains in the accessibility tree.
Colors, typography, sizes and other custom classes are retained.

## Verify by hand

Use screen-reader navigation to confirm hidden dialog titles/descriptions remain available.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
