# switch

2026-11-04 — engine; migrated customized legacy default-style wrapper after inspecting the default Radix registry source.

## Changed

- src/components/AudioControls/AudioControls.tsx:37 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx:55 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackMetronomeControl.tsx:5 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Print/PrintTabDialog.tsx:12 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrumSettingsDropdown.tsx:12 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/switch.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Root is a span with hidden input. Disabled/checked styling uses data attributes; 50x24px track and thumb offsets are preserved.
Colors, typography, sizes and other custom classes are retained.

## Verify by hand

Click label and press Space; inspect track/thumbnail dimensions, checked position and disabled state.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
