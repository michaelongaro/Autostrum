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

The external screenshot service is outside this repository and currently only
captures JPEGs. Until that service also calls `captureTabScreenshotMasks` and
uploads the atlas with `tab-version` metadata, rerun the bulk script for new or
edited tabs. They will use the gradient-map fallback in the meantime. Increment
the mask format constant when changing the stored atlas layout or capture geometry.
