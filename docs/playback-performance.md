# Playback performance

The practice strip uses a WAAPI transform animation. Audio remains the timing
source; the animation driver handles pause, seeking, speed changes, and loop
handoffs without per-frame React updates.

Scrubbing uses absolute positions across loop boundaries. Binary searches find
the playhead and snap destination. Visibility follows the live animation timing
model and mounts a window of columns plus overscan, including adjacent loop
copies. Playback, paused viewing, and scrubbing use the same bounded policy.

Beam flags are cached by immutable compiled sequence in a WeakMap. Each span is
resolved once; later highlight renders use indexed lookups. Recompilation creates
a new cache key, and discarded sequences can be collected.

## Verification

Run the production geometry, viewport coverage, and beam-cache checks:

```sh
node scripts/verifyPlaybackPerformance.mjs --logic-only
node scripts/verifyPlaybackModalLayout.mjs
node scripts/verifyPlaybackStripMotion.mjs
```

With the dev server running, omit `--logic-only` to check loop crossings,
direction reversals, long unbroken passages, fast playback, and narrow viewports
in Chromium. The script writes local results under `node_modules/.cache/`.

For manual measurements, open `/dev-virtualization-harness?fixture=huge` and
paste `scripts/auditPlaybackPerformance.browser.mjs` into its console:

```js
const audit = window.__playbackAudit;
await audit.prepare({ notes: 2000, barEvery: 0 });
await audit.play();
await audit.measure("unbroken passage", 3300, {
  segments: [{ deltaPx: -600, durationMs: 2000 }],
});
```

Headless callback rates are not production GPU FPS measurements. Physical-device
Safari/touch behavior, live rotation recovery, sustained memory use, and audio
underruns still require device profiling.
