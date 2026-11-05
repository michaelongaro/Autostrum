# alert-dialog

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/Dialogs/PostSignupDialog.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMetadata.tsx:71 — updated consumer composition, callbacks, focus or utility import.
- src/components/modals/DeleteAccountModal.tsx:20 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/alert-dialog.tsx:6 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Actions and Cancel use Base UI Close, retaining close-on-confirm behavior. Base UI chooses initial focus; callers needing an explicit focus target can use initialFocus.
Overlay animations use starting/ending-style transitions instead of Radix keyframes; colors, typography, sizes and other custom classes are retained.

## Verify by hand

Cancel and confirm; press outside to ensure the alert stays open; verify initial focus and focus return.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
