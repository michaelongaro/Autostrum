# Tab screenshot rendering

Grid cards default to recolorable masks. Compare the renderers at:

- `/explore?screenshotRenderer=masks`
- `/explore?screenshotRenderer=gradient-map`

The same query parameter works on search and other pages containing grid cards.
Change `DEFAULT_TAB_SCREENSHOT_RENDERER` in `src/utils/tabScreenshotMasks.ts` to
switch the default back. Existing JPEGs and the gradient-map renderer are retained.

## Capture and storage

With the development server running:

```sh
npx tsx src/utils/bulkRetakeAllTabScreenshots.ts --masks-only
```

This adds one `masks-v1.png` atlas per tab to `autostrum-screenshots-dev`, preserving
the light/dark JPEGs. Without `--masks-only`, the script retakes both JPEGs too.
It awaits uploads, reports failures, and exits unsuccessfully if any tab fails.

Optional arguments:

```sh
--tab=62
--concurrency=3
--base-url=http://localhost:3000
--bucket=autostrum-screenshots-dev
```

For production storage, explicitly pass `--bucket=autostrum-screenshots` (also the
default when the script's `NODE_ENV` is `production`). This script does not infer
the bucket from the running web server's environment.

The atlas contains seven vertically stacked alpha masks: background, foreground,
accent text, borders, accents, secondary fills, and muted text. The capture renders
each role in white with other roles in black, retaining opacity, occlusion, and
shadows. The card colors these masks with CSS tokens and adds their contributions
using `plus-lighter` in an isolated black container. Normal source-over blending
would apply occlusion a second time and darken antialiased edges.

One atlas supports every palette and both modes. Color/mode changes do not need a
new atlas. The original preview layout is captured before JPEG compression.

Cards keep their skeleton until the atlas is decoded and the CSS mask layers
have been prepared. The atlas is fetched lazily and shared with the mask layers
through a local blob URL, so applying CSS does not start another network load.
Readiness is tracked per mounted card; a cached JPEG cannot reveal an unfinished
mask surface. Pending fetches and local URLs are cleaned up when the card unmounts.

## Updates and fallback

S3 metadata records the captured tab's `updatedAt`. The API checks it against the
card's version before serving a cached atlas. Missing masks, failed loads, and
outdated revisions leave the gradient-map screenshot visible.

If neither the atlas nor the JPEG can load, the card stops its skeleton and shows
"Preview unavailable". A failed JPEG does not hide a usable atlas, and a failed
atlas still waits for the JPEG. Revisiting the grid retries missing images so a
later capture can recover without changing the tab's content revision.

The external screenshot service is outside this repository. Deploy its App Router
revision reader along with mask/thumbnail capture support; see
[the capture contract](./tab-screenshot-thumbnails.md#app-router-revision-contract).
Until that worker is deployed, the bulk script can backfill new or edited tabs.
Increment the mask format constant when changing the stored atlas layout or
capture geometry.

With the development server running, verify failure handling without remote writes:

```sh
node scripts/verifyTabScreenshotFailures.mjs
```

This mocks search results and image responses to cover missing assets, storage
errors, either format succeeding independently, delayed responses, and recovery
when returning to the grid after a successful capture.
