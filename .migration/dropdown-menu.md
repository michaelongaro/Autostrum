# dropdown-menu

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/Tab/MiscellaneousControls.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/NoteLengthDropdown.tsx:5 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrumSettingsDropdown.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMetadata.tsx:29 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/dropdown-menu.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Base UI radio and checkbox items remain open on selection by default. This idiomatic Base UI difference is intentionally retained. Ordinary actions still close. Root radio value is unchanged; onSelect actions use onClick.
Overlay animations use starting/ending-style transitions instead of Radix keyframes; colors, typography, sizes and other custom classes are retained.

## Verify by hand

Use Arrow keys and typeahead, activate ordinary actions, open a submenu, and confirm that radio selection stays open.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
