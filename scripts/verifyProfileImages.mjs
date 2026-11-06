// Offline checks for the avatar proxy's host boundary and missing-image fallback.
// Run: node scripts/verifyProfileImages.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, mock, test } from "node:test";
import ts from "typescript";

function moduleUrl(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}
const imageModule = moduleUrl(
  readFileSync("src/utils/profileImage.ts", "utf8"),
);
const { getProfileImageSrc, isRemoteProfileImage } = await import(imageModule);
const { GET } = await import(
  moduleUrl(
    readFileSync("src/app/api/getProfileImage/route.ts", "utf8").replace(
      '"~/utils/profileImage"',
      JSON.stringify(imageModule),
    ),
  )
);
const source = "https://img.clerk.com/avatar";
const request = (src = source) =>
  new Request(
    `http://localhost/api/getProfileImage?url=${encodeURIComponent(src)}`,
  );
afterEach(() => mock.restoreAll());

test("only approved HTTPS image hosts are proxied; previews remain local", () => {
  assert.equal(
    getProfileImageSrc(source),
    `/api/getProfileImage?url=${encodeURIComponent(source)}`,
  );
  for (const src of [
    "data:image/png;base64,preview",
    "blob:http://localhost/preview",
    "/avatar.png",
  ]) {
    assert.equal(getProfileImageSrc(src), src);
  }
  for (const src of [
    "http://img.clerk.com/a",
    "https://img.clerk.com.evil.test/a",
    "https://img.clerk.com@localhost/a",
    "https://img.clerk.com:444/a",
    "http://127.0.0.1/a",
    "not a url",
  ]) {
    assert.equal(isRemoteProfileImage(src), false, src);
  }
});

test("invalid URLs cannot trigger a server fetch", async () => {
  const fetch = mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected fetch");
  });
  assert.equal((await GET(request("http://127.0.0.1/private"))).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});

test("valid images retain their bytes, MIME type, and cache headers", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const fetch = mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(bytes, { headers: { "content-type": "image/png" } }),
  );
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("cache-control"), /max-age=3600/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  const [, options] = fetch.mock.calls[0].arguments;
  assert.equal(
    options.redirect,
    "error",
    "redirects cannot escape the allowlist",
  );
  assert.equal(options.next.revalidate, 3600);
  assert.ok(options.signal instanceof AbortSignal);
});

test("deleted uploads, non-images, and network failures return a cached avatar", async () => {
  for (const upstream of [
    () => new Response("deleted", { status: 415 }),
    () =>
      new Response("not an image", {
        headers: { "content-type": "text/html" },
      }),
    () => {
      throw new Error("provider unavailable");
    },
  ]) {
    const fetch = mock.method(globalThis, "fetch", async () => upstream());
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml");
    assert.match(response.headers.get("cache-control"), /max-age=300/);
    assert.match(await response.text(), /^<svg/);
    fetch.mock.restore();
  }
});
