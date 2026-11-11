# Viewport breakpoints

Use Tailwind's `lg` breakpoint (minimum width 1024px) for desktop page layouts.
The viewport label is `lg` at that width; the existing `desktop` label for large,
tall windows also selects the desktop layout.

The former `tablet` breakpoint additionally required 700px of viewport height.
That made a wide laptop switch to mobile filters, menus, and controls when
browser chrome or window sizing reduced its height. Width determines whether
those horizontal layouts fit; height determines how much of them is visible.

Height-specific mobile playback rules still serve a purpose on narrow landscape
screens. When a mobile height rule and an `lg` rule set the same property, scope
the mobile rule with `max-lg`. Custom raw media queries are emitted after the
standard width breakpoints, so class order alone cannot resolve that conflict.

On short desktop windows:

- The search filters scroll within the space below the sticky site header.
- The playback modal and tuner dialog stay within the dynamic viewport.
- Playback metadata and controls retain their height. The staff retains its
  minimum usable height, and the modal scrolls when necessary.
- Editor autoscroll uses the same width threshold as the desktop controls.

## Local verification

With the dev server running:

```sh
node scripts/verifyLargeViewportLayouts.mjs http://localhost:3000 chromium
node scripts/verifyLargeViewportLayouts.mjs http://localhost:3000 webkit
node scripts/verifySearchTableScrolling.mjs http://localhost:3000 both
node scripts/verifyAutoscrollCenterOffset.mjs http://localhost:3000
node scripts/verifyStaticTabVirtualization.mjs http://localhost:3000 both
```

The layout verifier covers 14 viewport sizes, including 1023/1024px widths,
699/700px heights, 1366×640 laptops, and short landscape windows. It checks
filter reachability, modal bounds, populated playback menus, loop editing,
tuning, static tab content, and public route shells. Screenshots are saved
under the ignored `coverage/large-viewport-layouts` directory.

These checks use guest sessions, local editor state, development tab fixtures,
and read-only public data. They do not publish tabs or exercise account-only
profile actions.

## Migration verification results

- Responsive layouts: 56 cases per engine, passing in Chromium and WebKit.
- Search table scrolling: all six viewport cases pass in both engines.
- Editor autoscroll: 26/26 assertions pass, including a 1024×600 laptop.
- Static virtualization: 191/194 assertions pass. The three failures concern
  WebKit at 150% tab zoom in a 1280×800 viewport: full/virtualized height parity,
  card geometry, and scroll-height stability. A focused comparison against the
  original `HEAD` source reproduces all three with identical measurements
  (12594px versus 12925px). They are pre-existing and remain outside this change.
- Changed-file lint and before/after TypeScript diagnostics show no new issues.
