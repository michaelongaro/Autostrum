# popover

2026-11-04 — engine; migrated the customized legacy wrapper, with a follow-up restoring Radix arrow spacing and bookmark sizing.

## Changed

- src/components/AudioControls/AudioControls.tsx:27 — updated consumer composition, callbacks, focus or utility import.
- src/components/Dialogs/GlossaryDialog.tsx:7 — updated consumer composition, callbacks, focus or utility import.
- src/components/Header/DesktopHeader.tsx:16 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx:45 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticStrummingPattern.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Static/StaticTab.tsx:26 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/StrummingPatterns.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/Tab.tsx:17 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMeasureLine.tsx:15 — updated consumer composition, callbacks, focus or utility import.
- src/components/Tab/TabMetadata.tsx:22 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/ArtistCombobox.tsx:14 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/BookmarkToggle.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/PlaybackSpeedPopover.tsx:8 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/RateTab.tsx:13 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/popover.tsx:3 — migrated primitive wiring, state styling and props while preserving custom classes.
- src/pages/profile/settings/index.tsx:20 — updated consumer composition, callbacks, focus or utility import.
- src/components/ui/base-ui-types.ts:4 — shared string-class prop typing for styled wrappers.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — local desktop/mobile interaction coverage.
- src/components/ui/popover.tsx:47 — add the rendered 5px arrow height to sideOffset, reproducing Radix's popup-edge distance. Preserve numeric/function offsets and leave arrowless offsets unchanged.
- src/components/ui/BookmarkToggle.tsx:182 — remove trigger padding that overrode the rendered button's padding after Base UI prop merging.
- src/components/Tab/Static/StaticTabMetadata.tsx:354 — mobile bookmark and placeholder use a fixed 40px width, matching Share/Print; the text button stays 144px wide on desktop.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyMobileMigrationRegressions.mjs — verify default arrow gap (9px), custom arrowless gap (7px), callback offset plus arrow (13px), and actual static metadata button widths at mobile/desktop sizes.

Leftover scan for radix-ui / @radix-ui on this component's source and consumers is clean.

## Left alone

- Other non-Radix UI libraries (carousel, range controls) retain their existing implementations. The separately authorized drawer migration is documented in drawer.md.
- @radix-ui/colors — color palette package, not a component primitive.
- components.json — legacy default style has no matching Base UI style; switching presets would alter appearance. Future shadcn add commands still select Radix variants unless explicitly configured otherwise.

## Behavior changes

Outside/focus dismissal guards moved to Root onOpenChange. A screen-reader-only Close makes modal popovers escapable. Arrows use an explicit SVG and per-side rotation.
Overlay animations use starting/ending-style transitions instead of Radix keyframes; colors, typography, sizes and other custom classes are retained.

Follow-up: visible arrows contribute 5px to the popup-edge offset, so the default 4px offset again leaves a 9px edge-to-trigger gap. Arrowless popovers do not get the extra gap. Bookmark triggers leave padding to the rendered button.

## Verify by hand

Open theme and speed popovers; verify arrow orientation, viewport collision, Escape and focus return. Test theme transitions and playback speed inside the playback modal.
Run node scripts/verifyBaseUiMigration.mjs against a running development server for local interaction coverage.
Run node scripts/verifyMobileMigrationRegressions.mjs for measured popup gaps and mobile/desktop bookmark widths. This script reproduced 4px popup spacing and an 18px bookmark before the fix; afterward the default arrow gap is 9px and Bookmark/Share/Print are all 40px on mobile.
