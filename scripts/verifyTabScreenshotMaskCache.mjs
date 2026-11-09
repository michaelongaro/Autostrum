/** Run: node scripts/verifyTabScreenshotMaskCache.mjs */
import "./lib/registerTypeScript.mjs";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { acquireMaskAtlas, getCachedMaskAtlas, getMaskAtlasSource } =
  await import("../src/utils/tabScreenshotMaskCache.ts");
const { default: TabScreenshotMasks } =
  await import("../src/components/Search/TabScreenshotMasks.tsx");
const renderMasks = (version) =>
  renderToStaticMarkup(
    React.createElement(TabScreenshotMasks, {
      tabId: 1,
      version,
      width: 330,
      height: 151,
      onLoad() {},
      onError() {},
    }),
  );

const originals = {
  fetch: globalThis.fetch,
  window: globalThis.window,
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
};
let fetches = 0;
let decodes = 0;
let nextURL = 0;
let fail = false;
let badGeometry = false;
const revoked = new Set();
const leases = [];
try {
  globalThis.window = {
    devicePixelRatio: 1,
    Image: class {
      naturalWidth = 400;
      naturalHeight = badGeometry ? 100 : 1309;
      async decode() {
        decodes++;
      }
    },
  };
  globalThis.fetch = async () => {
    fetches++;
    return { ok: !fail, blob: async () => new Blob(["atlas"]) };
  };
  URL.createObjectURL = () => `blob:test-${nextURL++}`;
  URL.revokeObjectURL = (url) => revoked.add(url);
  const src = getMaskAtlasSource(1, "v1");
  assert.ok(src.endsWith("&width=400"));
  assert.equal(getCachedMaskAtlas(src), undefined);
  assert.match(
    renderMasks("v1"),
    /opacity:0/,
    "first load waits for decoded masks",
  );
  const first = acquireMaskAtlas(src);
  const concurrent = acquireMaskAtlas(src);
  assert.equal(
    first.promise,
    concurrent.promise,
    "concurrent cards deduplicate requests",
  );
  const atlas = await first.promise;
  assert.equal(atlas.height, 187, "decoded role dimensions are retained");
  assert.equal(fetches, 1);
  assert.equal(decodes, 1);
  first.release();
  first.release();
  concurrent.release();
  assert.equal(
    revoked.has(atlas.url),
    false,
    "unmount keeps decoded blob URL alive",
  );
  const remount = acquireMaskAtlas(src);
  assert.equal(
    getCachedMaskAtlas(src),
    atlas,
    "remount can synchronously render decoded atlas",
  );
  assert.equal(await remount.promise, atlas);
  assert.equal(fetches, 1, "remount skips fetch");
  assert.equal(decodes, 1, "remount skips decode");
  const remountedMarkup = renderMasks("v1");
  assert.match(remountedMarkup, /data-screenshot-renderer="masks"/);
  assert.match(
    remountedMarkup,
    /opacity:1/,
    "cached masks are visible on their first render",
  );
  assert.ok(
    remountedMarkup.includes(atlas.url),
    "remount renders the retained blob URL",
  );
  assert.match(
    renderMasks("v2"),
    /opacity:0/,
    "new versions do not display a stale atlas",
  );
  // A mounted resource remains valid while old inactive resources are evicted.
  for (let i = 2; i <= 75; i++) {
    const resource = acquireMaskAtlas(getMaskAtlasSource(i, "v1"));
    await resource.promise;
    resource.release();
  }
  assert.equal(getCachedMaskAtlas(src), atlas);
  assert.equal(
    revoked.has(atlas.url),
    false,
    "LRU eviction must not revoke a mounted resource",
  );
  assert.ok(revoked.size > 0, "inactive cache is bounded");
  remount.release();
  // New tab versions and density tiers have distinct resources, themes share one source.
  const version = acquireMaskAtlas(getMaskAtlasSource(1, "v2"));
  leases.push(version);
  assert.notEqual(await version.promise, atlas);
  window.devicePixelRatio = 2;
  assert.ok(getMaskAtlasSource(1, "v2").endsWith("&width=800"));
  const dense = acquireMaskAtlas(getMaskAtlasSource(1, "v2"));
  leases.push(dense);
  assert.notEqual(await dense.promise, await version.promise);
  // Errors are retryable and invalid geometry releases its object URL.
  fail = true;
  const failedSrc = getMaskAtlasSource(99, "v1");
  const failed = acquireMaskAtlas(failedSrc);
  await assert.rejects(failed.promise, /unavailable/);
  failed.release();
  assert.equal(getCachedMaskAtlas(failedSrc), undefined);
  fail = false;
  const retry = acquireMaskAtlas(failedSrc);
  leases.push(retry);
  assert.ok(await retry.promise);
  badGeometry = true;
  const invalid = acquireMaskAtlas(getMaskAtlasSource(100, "v1"));
  const revocations = revoked.size;
  await assert.rejects(invalid.promise, /geometry/);
  invalid.release();
  assert.equal(revoked.size, revocations + 1);
  console.log(
    "Screenshot mask cache checks passed: deduplication, immediate reuse, version/density invalidation, bounded eviction, mounted-resource lifetime, and error retries.",
  );
} finally {
  leases.forEach((resource) => resource.release());
  globalThis.fetch = originals.fetch;
  globalThis.window = originals.window;
  URL.createObjectURL = originals.create;
  URL.revokeObjectURL = originals.revoke;
}
