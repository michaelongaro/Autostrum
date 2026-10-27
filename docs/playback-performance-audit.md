# Tab playback performance audit

Audited October 26, 2026, starting from `8a0b7bbb`. The initial audit below records behavior before the fixes. The accompanying [browser probe](../scripts/auditPlaybackPerformance.browser.mjs) and [measurement results](playback-performance-audit-results.json) preserve the reproduction method and evidence. Implementation and verification results are recorded at the end of this document.

Normal playback of tabs with regular barlines performed well on this machine, including a tab with 8,999 expanded columns. Four issues reproduced: backward scrubbing jumps near a loop boundary, expensive beam grouping in long passages without barlines, blank viewport edges during fast playback, and a hitch when grabbing a playing strip.

## Environment and measurement limits

- Existing Next.js development server using Webpack, React Compiler enabled, StrictMode disabled. No production build or migration was run.
- Windows, Electron 44.9.3 / Chromium 152.0.7977.167, 12 logical processors, device pixel ratio 1. The foreground browser delivered approximately 237 requestAnimationFrame callbacks per second at baseline.
- Desktop viewport: 1280 × 800; playback viewport: 1152 px. Narrow viewport: 390 × 844; playback viewport: 390 px. Narrow measurements used the same desktop browser and user agent, not a physical phone.
- Fixtures changed the development harness's in-memory store. No tabs or users were created or saved for the audit.
- Twenty-five instrumented scenarios sampled computed strip transforms, mounted-column coverage, callback intervals, and PerformanceObserver long tasks. Gestures dispatched synthetic PointerEvents through the actual playback handlers. They do not validate native pointer capture, OS input delivery, or real touch hardware.
- Timing numbers measure **main-thread animation callback cadence**, not independently measured compositor/GPU FPS. Development instrumentation adds work. Absolute production FPS, Safari/iOS behavior, and low-end-device performance remain unverified.
- One 2,000-column warm-up run began before its paused CSS transform settled; it is explicitly excluded in the results. The settled repeats below reproduce the stall without that transient.
- An additional post-resize fixture reset did not reach a usable starting transform and was excluded. Orientation recovery needs separate isolation. A fresh desktop-page check with the saved probe reproduced the exact 189 px reversal result; the saved probe also independently reproduced an 18.9 px fast-playback gap at narrow width.

## Measured results

For gestures, callback rate and p95 cover the active drag, excluding the idle tail. Worst gaps include the complete run, including grab/release. These short samples are diagnostic observations, not statistical production benchmarks.

| Scenario                                                    | Callback rate |   p95 interval |   Worst interval | Other observations                                     |
| ----------------------------------------------------------- | ------------: | -------------: | ---------------: | ------------------------------------------------------ |
| 899 columns, regular barlines, normal playback              |        237 Hz |         4.3 ms |           8.5 ms | No long tasks or uncovered viewport gaps               |
| 8,999 columns, regular barlines, normal playback            |        236 Hz |         4.3 ms |          12.5 ms | 44–46 mounted columns; no gaps                         |
| 899 columns, forward / backward drag                        |  181 / 176 Hz | 16.6 / 16.7 ms |   20.8 / 25.0 ms | No long tasks or gaps                                  |
| 8,999 columns, forward / backward drag                      |  190 / 178 Hz | 16.5 / 16.6 ms |   20.8 / 25.0 ms | 105–106 mounted columns; no long tasks                 |
| 800 notes, no barlines, forward / backward drag             |    80 / 75 Hz | 41.8 / 41.7 ms |   54.2 / 66.7 ms | Long tasks in both directions                          |
| 2,000 notes, no barlines, settled forward / backward drag   |    68 / 58 Hz | 87.5 / 87.5 ms | 103.9 / 112.4 ms | 19 long tasks per run, totaling about 1.7 seconds each |
| 300 BPM sixteenths, supported 1.5× speed, desktop           |        184 Hz |        12.5 ms |          20.8 ms | Unmounted viewport edge up to 89.2 px                  |
| Same fast playback, 390 px viewport                         |        207 Hz |         8.4 ms |          16.7 ms | Unmounted edge up to 20.4 px                           |
| Grab during normal playback, 390 px viewport, three repeats |             — |              — |     54.2–66.7 ms | One 51–64 ms long task on every repeat                 |

The fast-playback rows demonstrate why callback rate alone is insufficient: motion can continue while the upcoming columns are absent. Conversely, a high average callback rate can hide repeated 80–110 ms stalls in a long passage.

## Findings

### P1: Backward scrubbing loses 1:1 tracking near the loop end

At index 885 of the 899-column fixture, a 17 px forward drag moved the strip from 26,856 to 26,873 px. Reversing by eight successive 1 px pointer movements moved it back to 26,684 px: **189 px of strip travel for 8 px of input**. Several individual 1 px samples jumped a full 34 px chord. The active chord moved from 885 to 878.

In [usePlaybackGlideScrub.ts](../src/hooks/usePlaybackGlideScrub.ts), `maybeResetRepetitionsOnBackwardScrub` resets every repetition and remaps the playhead to a chord's exact start. That discards the fractional offset within the chord. Meanwhile, [PlaybackModal.tsx](../src/components/Tab/Playback/PlaybackModal.tsx)'s primary virtualization effect can reapply the forward half-shift while the playhead remains near the end. Repeated backward samples can therefore repeat the reset and quantization.

Preserve the within-chord offset during rebasing, and make repetition ownership consistent between scrubbing and the modal's virtualization effect. Validate tiny direction reversals before, across, and after a loop wrap; these should track pointer distance continuously.

### P1: Beam grouping makes long passages without barlines stall

[PlaybackModal.tsx](../src/components/Tab/Playback/PlaybackModal.tsx)'s `renderVisibleChord` calls `beamBreaksForPlaybackIndex` for each mounted column. In [noteLengthBeaming.ts](../src/utils/noteLengthBeaming.ts), that function walks backward and forward to find the entire span, builds its events, and resolves all beam breaks, returning just one entry.

Without barlines, the span can be the entire subsection. Every visibility/highlight render repeats that full-span work for roughly 94 mounted columns. The 2,000-note fixture still mounted only 94 columns, yet produced approximately 104–112 ms callback gaps and 19 long tasks per direction. This is CPU work that DOM virtualization does not eliminate. Even the quarter-note fixture pays the grouping cost although those notes cannot form beams.

Compute beam flags once per immutable compiled sequence/span and use indexed lookups during rendering. A non-beamable-note fast path can help, but does not replace caching for long eighth/sixteenth-note passages. Verify both directions and note/chord highlighting after caching.

### P1: The playback visibility window can trail the animated strip

[playbackStripDriver.ts](../src/hooks/playbackStripDriver.ts) publishes its scroll-position ref on a 100 ms supervisor interval. [PlaybackVisibleChords.tsx](../src/components/Tab/Playback/PlaybackVisibleChords.tsx) copies that ref into React state on another 100 ms interval, using just 100 px of playback overscan.

These independent timers can compound position staleness. At 300 BPM, sixteenth notes, and 1.5× speed, the strip advances roughly 1,020 px/s before measure-line widths. That is about 102 px per 100 ms, already exceeding the overscan. Measurements found up to 89.2 px of uncovered viewport edge on desktop and 20.4 px at narrow width. A separate run that actually crossed the loop boundary also showed gaps, up to 74.3 px. The apparent 2× label in two original requests was corrected in the results: the store correctly clamps speed to 1.5×.

Derive culling from a fresh position on the same timeline as motion, or size directional overscan from speed, update latency, and mounting cost. Shift the visible range when it approaches its limits rather than forcing an entire-list React render every animation frame. Validate viewport coverage independently of timing and include loop transitions.

### P2: Grabbing a playing strip causes a mount burst and hitch

The playback visibility buffer changes immediately from 100 px to **1,000 px on each side** when `audioMetadata.playing` becomes false. A grab pauses audio and enters this much wider window. At 390 px width, a representative middle-of-tab grab changed roughly 21 mounted columns / 1,154 descendant nodes into 81 columns / 4,393 nodes. Desktop dragging commonly mounted 105–106 columns and roughly 5,700 descendant nodes.

The narrow-viewport transition reproduced a 51–64 ms long task in each of three short repeats. Other live grabs recorded 102–125 ms long tasks. The buffer change and broad playing-state subscriptions are clear sources of work at this boundary; exact attribution between mounting, React updates, and audio teardown requires a CPU profile.

Give active scrubbing its own bounded visibility policy, avoid abruptly multiplying overscan at pointer-down, and isolate highlight/control changes from otherwise unchanged column markup. Measure the initial grab separately from subsequent dragging so idle frames do not hide the hitch.

## What worked and remaining headroom

- Normal strip motion uses a single WAAPI transform animation, with segment construction and supervision rather than a per-frame React transform update. [PlaybackAnimatedStrip.tsx](../src/components/Tab/Playback/PlaybackAnimatedStrip.tsx) deliberately avoids per-chord parent rerenders while playing, although its visible-chords child still subscribes to playback state.
- Regular-barline playback maintained a small mounted window from 899 to 8,999 total columns. The larger fixture did not show a material steady-playback regression in these measurements.
- Static row virtualization also worked in the desktop huge fixture: harness descendants fell from **43,937 to 9,044 at the top**, a 79% reduction. Eleven scroll positions down and back up kept document height at 5,818 px and subsection body height at 5,525 px, with visible rows present throughout.
- Drag logic coalesces transform writes with requestAnimationFrame and caps inertia duration/velocity. Ordinary mid-tab forward/backward gestures did not expose blank strips.
- A deliberate still release snaps immediately to a chord. A 17 px intra-chord offset returned to the chord boundary on release; this is positional snapping by design, separate from a missed-frame stall. Reconsider it if the intended interaction calls for a smooth settle even after precise dragging.
- Full-list work remains in `PlaybackVisibleChords.flatMap`, `getAbsoluteChordPositionBounds`, `getChordIndexAtPlayhead`, and `getNearestChordIndex`. Bounds and index scans occur repeatedly during pointer processing and inertia; only the DOM write is frame-coalesced. They did not dominate the 8,999-column regular-barline runs, but leave less headroom on slower devices. Cached bounds and binary searches over the repetition layout's monotonic ranges are worth evaluating after the reproduced issues above.

## Verification and coverage gaps

Passed during this audit:

- `node --experimental-strip-types scripts/verifyPlaybackStripMotion.mjs`: 13 checks.
- `node scripts/verifyPlaybackModalLayout.mjs`: 7 checks. This script duplicates layout/resync logic instead of importing the production functions, so passing does not guarantee production-helper coverage.
- `node scripts/verifyNoteLengthBeaming.mjs`: 14 grouping checks and 10 Chromium rendering/geometry checks.
- Browser measurements described above and the bidirectional desktop static-row check.

The dedicated WAAPI browser suite and the full Chromium/WebKit static-virtualization matrix were not run in this audit. No production FPS, real-device touch, sustained memory, audio-underrun, or GPU/compositor trace claim is made. Existing motion/geometry checks also do not assert small backward loop-end gestures, per-frame viewport coverage, or frame budgets for long unbroken spans. Add regression coverage for those cases when fixing them.

## Reproduction

Use the development server and open `/dev-virtualization-harness?fixture=huge`. Open Practice, or run this in its console:

```js
window.__AUTOSTRUM_GET_TAB_STORE__().setShowPlaybackModal(true);
```

Paste the contents of `scripts/auditPlaybackPerformance.browser.mjs`. Then, for a regular-barline baseline:

```js
const a = window.__playbackAudit;
await a.prepare({ notes: 800, barEvery: 8 });
await a.play();
await a.measure("baseline playback", 8000);
await a.measure("live forward grab", 3000, {
  segments: [{ deltaPx: -600, durationMs: 2000 }],
});
await a.measure("backward drag", 3000, {
  segments: [{ deltaPx: 600, durationMs: 2000 }],
});
```

For the beam-grouping stall:

```js
await a.prepare({ notes: 2000, barEvery: 0 });
a.store().setCurrentChordIndex(400);
await new Promise((resolve) => setTimeout(resolve, 1500));
await a.measure("unbroken passage", 3300, {
  segments: [{ deltaPx: -600, durationMs: 2000 }],
});
```

For visibility gaps, prepare `{ notes: 800, barEvery: 8, noteLength: "sixteenth", bpm: 300, playbackSpeed: 1.5 }`, start playback, and measure for 7–8 seconds. For loop-end reversal, prepare the baseline, pause, select index 885, let the paused transform settle, then drag 17 px forward followed by successive 1 px backward samples. `a.pointer(type, clientX)`, `a.position()`, and `a.nextFrame()` support that controlled probe. `a.runs` retains raw frame samples for inspection. These console helpers are restricted to the development fixture page.

## Implemented fixes and verification

Implemented after the initial audit, October 26, 2026. [Post-fix results](playback-performance-fix-results.json) record the passing browser matrix.

- Scrubbing now keeps absolute coordinates across both loop directions. Binary searches locate the playhead and snap destination. The modal tracks a uniform resume repetition and no longer shifts/reset portions of the strip during gestures. Visible adjacent loop copies are independent of the audio scheduler's polled chord index.
- Beam flags are cached by immutable compiled sequence in a WeakMap. Each span is resolved once; later visible-chord/highlight renders use indexed lookups. Recompiling replaces the key, and discarded sequences can be collected.
- Visibility samples the live WAAPI driver's timing model rather than chaining two 100 ms timer samples. A binary-search window mounts just the visible columns plus overscan. The window moves after consuming one third of its buffer, retaining headroom without per-frame React commits.
- Playback, paused viewing, and active scrubbing share the same bounded overscan policy: at least 200 px, increased for unusually fast motion. Grabbing does not switch to a 1,000 px buffer or remount the entire paused window.

| Regression                                               | Passing result                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Original loop-end reversal                               | 8 px backward input moves the strip exactly 8 px, with every intermediate sample checked   |
| Forward crossing, release, resume, backward crossing     | Absolute loop position remains continuous; resume keeps the selected loop                  |
| 2,000 notes without barlines, forward and backward drags | 46–47 mounted columns; zero long tasks and zero viewport gaps                              |
| 8,999 columns, playback and backward live grab           | 51–53 mounted columns; zero long tasks and zero viewport gaps                              |
| 300 BPM sixteenths, 1.5×, through an actual loop wrap    | Zero viewport gaps                                                                         |
| 390 px viewport, fast playback and three live grabs      | About 60 Hz callbacks, worst interval 16.8 ms, zero long tasks/gaps; 26–28 mounted columns |
| Playwright mouse drag with direction reversal            | Pointer capture completes and Play becomes available after settling                        |

`node scripts/verifyPlaybackPerformance.mjs` passes production geometry/coverage/cache checks plus the browser matrix. The cache regression verifies that 10,000 subsequent lookups do not read the 2,000-note span again. `--logic-only` runs without a browser; `--narrow-only` repeats just the narrow browser scenarios. The script writes its latest raw summary to `node_modules/.cache/autostrum-playback-performance/results.json` and closes its browser.

Also passed: 13 strip-motion checks, 14 beam-grouping checks, 24 audio-context/lifecycle checks, and 12 playback-metronome checks. Changed-file lint is clean except the existing `react-hooks/set-state-in-effect` error in PlaybackModal's compilation reset effect; the same error was confirmed against HEAD. TypeScript still reports baseline errors in instrument assets, related-tab/practice types, strip-driver keyframes, strip-motion indexing, and the hex-to-HSL helper; none originate in the changed playback code. Formatting and whitespace checks pass. The standalone console probe uses `.mjs`, matching the other verification scripts, so its intentionally dynamic browser interface is outside application TypeScript inputs.

The initial browser matrix was interrupted when reusing a session across orientation changes. The passing matrix uses fresh desktop and narrow sessions; live rotation recovery remains a separate, unverified issue from the original audit. Desktop headless callback rates on this runner were around 31–36 Hz, versus roughly 60 Hz at narrow width. Those numbers cannot be compared with the initial Electron audit's roughly 237 Hz baseline. The verified improvements are continuous gesture coordinates, eliminated viewport gaps, bounded mounting, and removal of the reproduced main-thread long tasks. Production GPU FPS and physical-device Safari/touch performance still need device profiling.
