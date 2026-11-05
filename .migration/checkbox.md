# checkbox

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/Tab/Print/PrintTabDialog.tsx:4 — updated consumer composition, callbacks, focus or utility import.
- src/components/modals/DeleteAccountModal.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/checkbox.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Root renders a span plus a hidden input. Checked/disabled styles use presence attributes; explicit inline-flex preserves the original 16px geometry. Indeterminate state is now a separate prop.
Colors, typography, sizes and other custom classes are retained.

## Verify by hand

Click labels and press Space; verify checked, unchecked and disabled rendering.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
