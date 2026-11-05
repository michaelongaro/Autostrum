# dialog

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/Dialogs/ChordDialog.tsx:21 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/CustomTuningDialog.tsx:25 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/DraftsDialog.tsx:20 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/GlossaryDialog.tsx:16 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/SectionProgressionDialog.tsx:32 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/StrummingPatternDialog.tsx:38 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/TipsDialog.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Header/MobileHeader.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx:38 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackTunerDialog.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Print/PrintTabDialog.tsx:10 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/dialog.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Focus overrides use finalFocus; Root onOpenChangeComplete retains print-snapshot cleanup until exit transitions finish. Outside dismissal is configured on Root via onOpenChange event details.
Overlay animations use starting/ending-style transitions instead of Radix keyframes; colors, typography, sizes and other custom classes are retained.

## Verify by hand

Open/close the print dialog and tuner; test Tab containment, Escape, focus return, nested selects, and print snapshot cleanup.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
