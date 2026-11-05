# tooltip

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/Header/DesktopHeader.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx:25 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackMetronomeControl.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticTab.tsx:11 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Tab.tsx:23 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabSection.tsx:22 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/tooltip.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Base UI 1.9 tooltips are visual hints and no longer automatically add role=tooltip or aria-describedby. Give triggers their own accessible names/descriptions when necessary. Provider delay prop replaces delayDuration; explicit existing delays are preserved. See https://base-ui.com/react/components/tooltip.
Overlay animations use starting/ending-style transitions instead of Radix keyframes; colors, typography, sizes and other custom classes are retained.

## Verify by hand

Hover and focus controls; check explicit delays and keyboard dismissal. Audit icon-only trigger accessible names.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
