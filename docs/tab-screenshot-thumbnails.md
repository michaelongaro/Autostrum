# Saved tab card thumbnails

Screenshot capture generates 400px and 800px card variants of both light/dark
JPEGs and the recolorable mask atlas. Sharp runs only in the Railway capture
server or the local bulk-capture tool. Image API routes read stored S3 objects;
they do not resize, encode, or invoke Vercel Image Optimization.

## Storage and selection

The original `light.jpeg`, `dark.jpeg`, and `masks-v1.png` remain available.
Each capture also saves these keys for widths 400 and 800:

- `<tabId>/card-v1/<width>/light.jpeg`
- `<tabId>/card-v1/<width>/dark.jpeg`
- `<tabId>/card-v1/<width>/masks-v1.png`

All assets carry `tab-version` metadata matching the captured tab's `updatedAt`.
Deleting a tab or deleting a user's tabs also removes the thumbnail objects.

`TabScreenshotImage` uses a native `picture` source with accurate card `sizes`.
The browser selects a saved JPEG based on card width and display density. Its
Next Image fallback explicitly sets `unoptimized`, independently of the global
Next configuration. The mask renderer chooses 400px for standard displays or
800px for higher-density displays. All grid cards fit within 400 CSS pixels, so
different card sizes on the same display can reuse an atlas.

The API accepts only these two thumbnail widths. If a thumbnail is missing or
belongs to another tab revision, it tries the original asset. Masks must always
match the requested revision; legacy JPEGs remain usable while capture is
pending. Fallbacks cache for 60 seconds so subsequent loads can discover newly
uploaded thumbnails. Matching final assets use revisioned URLs and immutable
caching. The mask renderer uses the decoded atlas dimensions to support either
thumbnail geometry or the full-size fallback without mixing up role positions.

The atlas's seven roles are resized individually before being stacked. Never
resize the complete atlas as one image: interpolation can bleed into adjacent
roles. Keep geometry, storage format, and thumbnail generation synchronized with
`autostrum-screenshot-server/src/services/screenshot-thumbnails.ts`.

## Rollout and existing tabs

Deploy both the Autostrum app and screenshot server. Either order works because
the original asset contract remains supported. New and edited tabs generate
thumbnails automatically after the server deployment.

To backfill existing tabs, run from this repository with the intended database
and AWS credentials and a deployed app URL:

```sh
npx tsx src/utils/bulkRetakeAllTabScreenshots.ts --tab=123 --bucket=autostrum-screenshots --base-url=https://YOUR_PRODUCTION_DOMAIN
```

Remove `--tab=123` to process every tab. For development, use the development
database, `--bucket=autostrum-screenshots-dev`, and a local running app URL.
`--masks-only` refreshes the full atlas and mask thumbnails while preserving JPEGs;
omit it when backfilling all six thumbnail variants. The script launches its own
browser and does not need the capture server running.

This changes file resolution and delivery. Changing the amount of notation or
the size of notes within each card is a separate screenshot-composition change.

## Verification

```sh
node scripts/verifyTabScreenshotThumbnails.mjs
```

This uses real Sharp, Next Image, and Chromium with mocked S3, without secrets,
database access, or remote writes. It checks variant dimensions, API validation,
version checks, legacy fallback caching, deletion keys, and browser selection of
saved 400px/800px JPEGs without any `/_next/image` requests. Run `npm test` in the
screenshot-server repository to verify full capture/upload behavior and mask
layer boundaries.
