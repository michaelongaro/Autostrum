# drawer

2026-11-04 — engine; migrated Vaul to Base UI Drawer, corrected mobile gestures, and restored Vaul's entrance/exit timing.

## Changed

- src/components/ui/drawer.tsx:4 — Base UI Root, Portal, Backdrop, Viewport, Popup and Content, preserving 448px maximum width, 8px insets, 20px corners, colors and handles.
- src/components/AudioControls/AudioControls.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/AudioControls/IPhoneSoundDrawer.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/Profile/EditImageSelector.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/Profile/PinnedTabSelector.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/Search/SearchResults.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/Tab/Playback/PlaybackTunerDrawer.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/Tab/Static/StaticTab.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/Tab/Tab.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/ui/RateTab.tsx — render composition, native focus props, swipe controls, and removal of duplicate portal wrappers.
- src/components/Search/SearchFilterCarousel.tsx — data-base-ui-swipe-ignore="x" preserves carousel gestures.
- src/components/Tab/Playback/PlaybackBottomMetadata.tsx — wait for popover exit completion before opening help; suppress intermediate focus return.
- scripts/verifyIPhoneSoundReminder.mjs — Base UI selectors and asynchronous portal focus guard handling; checks the existing help placement beside Instrument.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyBaseUiMigration.mjs — drawer geometry, swipe lock, nested select, swipe dismissal, Escape and focus return checks.
- package.json and package-lock.json — removed Vaul and its remaining Radix React dependencies.
- src/components/ui/ScaleSlider.tsx:35 — statically exclude slider gestures from drawer swipe handling before touch-start. Dynamic locking alone allowed the drawer's document listener to consume the moves needed by react-range.
- src/components/Profile/EditImageSelector.tsx:224 — image editor always uses handle-only swipe dismissal; horizontal/diagonal body gestures stay with the editor.
- src/components/Profile/EditImage.tsx — removed the obsolete interaction-start/end state callback used for conditional gesture protection.
- src/pages/dev-base-ui-harness.tsx and scripts/verifyMobileMigrationRegressions.mjs — added the real zoom control and profile-image editor to a local fixture. Trusted Chromium touch drags reproduce both reported issues before the fix and pass afterward.
- src/components/ui/drawer.tsx:47 — shared explicit 500ms transition timing with cubic-bezier(0.32, 0.72, 0, 1) for the popup and backdrop, matching [Vaul 1.1.2's source](https://raw.githubusercontent.com/emilkowalski/vaul/v1.1.2/src/style.css). Inline timing avoids falling back to the theme's generic ease-out. Swiping and reduced-motion rules still disable transitions as appropriate.

Leftover scan for radix-ui / @radix-ui / vaul imports on component and consumer code is clean.

## Left alone

- Color palette dependency @radix-ui/colors; this is not a component primitive.
- Existing carousel, third-party image cropper/react-range implementations and page virtualization. Only the surrounding gesture integration changes.

## Behavior changes

Base UI handles scroll locking and gestures. Root swipeDisabled and swipeHandleOnly presentation props preserve locked sliders/nested controls and handle-only image cropping. Touch swipes from scrollable content follow Base UI's scroll-edge handling. Mouse swipes start from the handle; Base UI Content allows text selection inside the sheet. No background indent/scaling is applied (the old application had no Vaul background wrapper). Escape follows Base UI's normal dismissal rules while swipe locking is active. Focus callbacks now use initialFocus/finalFocus. The drawer slides and backdrop fades over 500ms using Vaul's easing curve, respecting reduced motion. Virtual-keyboard positioning remains subject to native browser behavior; keyboard-specific Base UI providers were not added.

Follow-up: ScaleSlider keeps touch moves for continuous dragging, including the first gesture. Image-editor body gestures never dismiss the drawer; the handle remains swipeable, and outside press/Escape retain their existing dismissal behavior.

## Verify by hand

Open search filters, audio settings, tab settings, tuner, rating, pinned-tab selector and image editor on a phone. Test nested selects, sliders and image cropping without dismissing the sheet. Swipe the handle to dismiss; test Escape and focus return. Open No sound? from playback settings, dismiss it, and resume playback. Test software-keyboard input and scrolling on a physical iPhone.

Run node scripts/verifyMobileMigrationRegressions.mjs: continuous touch drags change zoom in both directions, diagonal editor body/crop drags keep the sheet open, and swiping its handle still closes it. All tRPC requests in this regression script are fulfilled locally.

Animation follow-up: inspect actual entrance and exit on a phone; both should start quickly and settle gently. Browser frame sampling verifies 500ms transitions and approximately 95% travel at 250ms in both directions. Reduced-motion mode disables the transitions; the backdrop uses the same timing as the popup.

Automated checks: desktop/mobile Chromium and WebKit primitive fixtures passed, including drawer dimensions and swipe lock. Chromium iPhone 13 and iPhone SE portrait/landscape help handoff/reopen/dismissal/playback passed, including reduced motion. WebKit in this environment has no Web Audio, so its fixture checks cover UI only.
