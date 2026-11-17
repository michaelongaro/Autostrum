# Editor accordion production benchmarks

The accordion benchmark uses the real `/create` editor, synthetic documents,
and a signed-out browser context. It does not publish tabs or save account
drafts. Run it against a production server, not `next dev`.

## Reproduce

In PowerShell, build and serve a separate production output. These commands
intentionally bypass `npm run build`, which also deploys database migrations:

```powershell
npm run generate:theme-tokens
$env:NEXT_DIST_DIR='.next-perf'
npx next build --webpack
npx next start -p 3100
```

In another terminal:

```powershell
$env:E2E_BASE_URL='http://localhost:3100'
$env:PERF_LABEL='optimized'
$env:PERF_VERIFY='1'
node scripts/benchmarkEditorAccordions.mjs
```

Install the Playwright Chromium browser first if necessary. Reports are written
to `reports/editor-performance/` (gitignored). The benchmark opens an isolated
context; do not use an authenticated page to run the browser functions manually.

`PERF_FIXTURES` accepts a comma-separated subset of `small,short,chords,mixed,long,metadata`.
`PERF_VARIANTS` accepts `default`, `uncontained`, `section-contain`,
`block-contain`, or `no-animation` for temporary browser-only comparisons.
The browser suite exports `installEditorPerformanceSuite`, so the same cases
can also be executed in the shared preview browser without a second browser.

## Method

- Production Next.js build with React Compiler enabled; Chromium at 1280 × 800.
- Allow 2.5 seconds for playback compilation and entry animations after seeding.
- Open and close each panel once to warm it, then measure three open/close
  cycles per panel (six toggles). Record the initial opening separately.
- Sample animation frames for 600 ms per toggle. Report the median of each
  toggle's largest inter-frame gap, plus worst gap, frames over 50 ms, long tasks,
  and DOM element counts. Frame gaps are not total interaction latency or INP.
  If a very slow baseline has not produced a frame interval yet, allow up to
  three seconds before rejecting the sample as an inactive frame clock.
- Run cases sequentially in a foreground tab. Keep builds and other CPU-heavy
  checks out of the measured intervals. Timing results are machine-dependent;
  compare the same browser, viewport, fixtures, and warmup procedure.
- The runner uses headless Chromium at a fixed viewport. When using the shared
  preview instead, keep it actively rendering; the suite rejects samples with
  no frame intervals or a changed viewport. A reported zero from a
  paused frame clock is not a valid performance result.
- The test fixtures cover a small tab; 20 sections × two 32-column blocks;
  80 chord sequences; 12 mixed sections; a single 1,280-column block; and
  64 chords plus 24 strumming patterns.

## Behavior checks

`PERF_VERIFY=1` additionally exercises real input editing, keyboard undo/redo,
focused rows surviving offscreen scrolling, reorder/delete mode fallbacks,
palm-mute state preservation, document-height parity, keyboard metadata drag
and drop, section reopening, offscreen edits/undo updating remembered heights,
and mounting/focusing an offscreen tablature row.

The existing standalone history checks can be run with:

```powershell
node scripts/verifyEditorHistory.mjs
```

These checks use guest fixture data. They do not cover publishing, authenticated
draft synchronization, real audio output, or Safari/device performance.

## Selected changes

- Section-body `content-visibility: auto` keeps React state mounted while skipping
  offscreen browser layout/painting. Intrinsic heights use measured content-box
  dimensions after the 350 ms entry animations, and are invalidated on viewport
  resize and edits/history changes to that section.
- Tablature row virtualization starts at 24 columns rather than 48. One-row
  layouts still use ordinary flex layout. Reorder/delete modes retain their
  full-staff fallback; focused note rows are pinned by stable column ID.

Section-body and block-body containment performed similarly. Section bodies
were selected to avoid changing nested block animation/layout boundaries.
Disabling metadata height animation was substantially less effective, so the
existing animations are retained. Full unmounting of sections/chord sequences
was not needed to remove the measured stalls, and would require additional
management of local editor state and portaled controls.

A candidate that omitted sortable metadata wrappers outside reorder mode did
not show a consistent improvement in the final headless measurements and was
discarded. Existing metadata list behavior is preserved.

The production builds intentionally retain the repository's existing
`typescript.ignoreBuildErrors` setting. A separate typecheck still reports
existing errors in soundfont assets and unrelated source files. Targeted lint
passes for new helpers/scripts and the column changes; the existing
`SectionContainer` set-state-in-effect and `EditingTabStaff` optional-chain
findings were also reproduced on the original HEAD versions.

## Measured results

Matched baseline/selected production builds, headless Chromium 158.0.8127.18,
1280 × 800. Each cell is **before → after**, in milliseconds, for the median
worst inter-frame gap over six warmed toggles. Values around 18 ms are close to
this runner's frame cadence. These are local measurements, not deployed INP.

| Fixture | Section progression | Chords | Strumming patterns |
| --- | ---: | ---: | ---: |
| Small | 18.3 → 18.4 | 18.3 → 18.1 | 18.2 → 18.2 |
| Many short blocks | 171.2 → 18.3 | 177.4 → 19.0 | 191.6 → 18.1 |
| Chord-heavy | 146.1 → 18.1 | 142.3 → 18.4 | 161.3 → 20.3 |
| Mixed | 331.6 → 18.5 | 356.7 → 18.4 | 363.5 → 27.9 |
| Single long block | 20.4 → 17.9 | 21.5 → 18.3 | 22.7 → 22.6 |
| Large metadata lists | 18.6 → 18.5 | 18.9 → 19.6 | 20.3 → 22.1 |

The many-short-blocks fixture fell from **68,487 to 4,526 DOM elements**
(about 93% fewer). The mixed fixture fell from **34,607 to 16,566**.
Chord-heavy DOM size was essentially unchanged; its gain comes from skipping
offscreen browser rendering. Small, already-virtualized, and metadata-only
fixtures show little consistent change at this frame cadence.

The selected build passed all **19 editor behavior assertions**, **three resize
geometry checks**, and the **11 standalone editor-history checks**. Contained
and natural document heights matched exactly at 390, 768, and 1280 px.

Separate production experiments on the short-block fixture (shared Chromium,
fixed 1280 × 800) found section-only containment at roughly **14–46 ms**,
block-only containment at **14–43 ms**, and disabling height animation alone
at **163–171 ms**. Expanded row virtualization without containment measured
roughly **30–35 ms**. These exploratory comparisons use a different frame
cadence from the headless table and should be compared within their own runs.

Raw local reports: `reports/editor-performance/headless-baseline.json` and
`reports/editor-performance/headless-selected.json`. Invalid/throttled samples
were discarded; they are not used in this table.

