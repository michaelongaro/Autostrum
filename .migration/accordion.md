# accordion

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/Header/MobileHeader.tsx:31 — updated consumer composition, callbacks, focus or utility import.
- src/components/HomePage/FAQ.tsx:6 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Chords.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/SectionContainer.tsx:9 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/SectionProgression.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticSectionContainer.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrummingPatterns.tsx:20 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/accordion.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Values are arrays. Single-panel collapsing remains supported. Height animation now uses Base UI transitions (200ms rather than the previous 250ms keyframes).
Colors, typography, sizes and other custom classes are retained.

## Verify by hand

Expand/collapse FAQ and editor section panels; verify chevrons, changing content height, and keyboard activation.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
