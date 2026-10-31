// Offline integration check: real Sharp/Next Image/Chromium, mocked S3, no DB.
// Run: node scripts/verifyTabScreenshotThumbnails.mjs (Node 22.15+).
import assert from "node:assert/strict";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire, registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mock } from "node:test";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "playwright";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
// Preserve Next's actual Image implementation, adapting its CJS default export
// for Node's ESM loader (normally handled by Next's bundler).
globalThis.__thumbnailNextImage = require("next/image").default;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      "~/env": "export const env = {NODE_ENV:'development'};",
      "next/image": "export default globalThis.__thumbnailNextImage;",
    };
    if (stubs[specifier]) {
      return {
        url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`,
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("~/")) {
      specifier = pathToFileURL(resolve(root, "src", specifier.slice(2))).href;
    }
    if (
      (specifier.startsWith(".") || specifier.startsWith("file:")) &&
      context.parentURL
    ) {
      const url = new URL(specifier, context.parentURL);
      if (url.protocol === "file:" && !existsSync(fileURLToPath(url))) {
        for (const extension of [".ts", ".tsx"]) {
          if (existsSync(`${fileURLToPath(url)}${extension}`)) {
            return { url: `${url.href}${extension}`, shortCircuit: true };
          }
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (
      url.startsWith("file:") &&
      /\.tsx?$/.test(url) &&
      !url.includes("/node_modules/")
    ) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const version = "2026-10-31T12:34:56.789Z";
const objects = new Map();
const reads = [];
let storageFailure = false;
const send = mock.method(S3Client.prototype, "send", async (command) => {
  assert(
    command instanceof GetObjectCommand,
    "serving images must never write to S3",
  );
  reads.push(command.input);
  if (storageFailure) throw new Error("Test storage failure");
  const object = objects.get(command.input.Key);
  if (!object)
    throw Object.assign(new Error("Missing object"), { name: "NoSuchKey" });
  const body = Readable.from([object.body]);
  body.transformToByteArray = async () => object.body;
  return { Body: body, Metadata: { "tab-version": object.version } };
});
let browser;
let server;
try {
  const { createTabScreenshotThumbnails } =
    await import("../src/utils/createTabScreenshotThumbnails.ts");
  const { getTabScreenshotObjectKeys } =
    await import("../src/utils/tabScreenshotMasks.ts");
  const { default: jpegHandler } =
    await import("../src/pages/api/getTabScreenshot/[id]/[theme].ts");
  const { default: maskHandler } =
    await import("../src/pages/api/getTabScreenshotMasks/[id].ts");
  const { default: TabScreenshotImage } =
    await import("../src/components/Search/TabScreenshotImage.tsx");

  const source = await sharp({
    create: { width: 1318, height: 615, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const masks = await sharp({
    create: {
      width: 1200,
      height: 560 * 7,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const thumbnails = await createTabScreenshotThumbnails(42, {
    light: source,
    dark: source,
    masks,
  });
  assert.equal(thumbnails.length, 6);
  for (const asset of thumbnails) {
    const width = Number(asset.key.split("/")[2]);
    const metadata = await sharp(asset.body).metadata();
    assert.equal(metadata.width, width);
    assert.equal(
      metadata.height,
      Math.round((width * 560) / 1200) *
        (asset.contentType === "image/png" ? 7 : 1),
    );
    objects.set(asset.key, { body: asset.body, version });
    assert(
      getTabScreenshotObjectKeys(42).includes(asset.key),
      "tab deletion cleans up every variant",
    );
  }
  const originalJPEG = await sharp(source).resize(1200).jpeg().toBuffer();
  objects.set("42/light.jpeg", { body: originalJPEG, version });
  objects.set("42/dark.jpeg", { body: originalJPEG, version });
  objects.set("42/masks-v1.png", { body: masks, version });

  async function request(handler, query, method = "GET") {
    const response = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      end() {
        return this;
      },
      send(body) {
        this.body = body;
        return this;
      },
    };
    reads.length = 0;
    await handler({ method, query }, response);
    return response;
  }
  const query = { id: "42", theme: "light", v: version, width: "400" };
  for (const width of ["400", "800"]) {
    const response = await request(jpegHandler, { ...query, width });
    assert.equal(response.statusCode, 200);
    assert.equal((await sharp(response.body).metadata()).width, Number(width));
    assert.match(response.headers["Cache-Control"], /immutable/);
    assert.deepEqual(
      reads.map((read) => read.Key),
      [`42/card-v1/${width}/light.jpeg`],
    );
  }
  let response = await request(maskHandler, query);
  assert.equal((await sharp(response.body).metadata()).height, 187 * 7);
  assert.match(response.headers["Cache-Control"], /immutable/);

  // Existing tabs remain visible before backfill, without locking their
  // temporary fallback response into a year-long browser/CDN cache.
  const mask400 = objects.get("42/card-v1/400/masks-v1.png");
  const jpeg400 = objects.get("42/card-v1/400/light.jpeg");
  objects.delete("42/card-v1/400/masks-v1.png");
  objects.delete("42/card-v1/400/light.jpeg");
  for (const handler of [jpegHandler, maskHandler]) {
    response = await request(handler, query);
    assert.equal(response.statusCode, 200);
    assert.equal((await sharp(response.body).metadata()).width, 1200);
    assert.match(response.headers["Cache-Control"], /max-age=60/);
    assert.equal(reads.length, 2);
  }
  objects.set("42/card-v1/400/masks-v1.png", { ...mask400, version: "old" });
  objects.set("42/card-v1/400/light.jpeg", { ...jpeg400, version: "old" });
  response = await request(maskHandler, query);
  assert.equal((await sharp(response.body).metadata()).width, 1200);
  response = await request(jpegHandler, query);
  assert.equal((await sharp(response.body).metadata()).width, 1200);
  objects.set("42/masks-v1.png", { body: masks, version: "old" });
  response = await request(maskHandler, query);
  assert.equal(
    response.statusCode,
    404,
    "stale geometry must never be displayed",
  );
  assert.equal(response.headers["Cache-Control"], "no-store");
  objects.set("42/card-v1/400/masks-v1.png", mask400);
  objects.set("42/card-v1/400/light.jpeg", jpeg400);
  objects.set("42/masks-v1.png", { body: masks, version });

  for (const handler of [jpegHandler, maskHandler]) {
    for (const invalid of [
      { width: "99999" },
      { width: ["400"] },
      { id: "../secret" },
      { v: "invalid" },
    ]) {
      response = await request(handler, { ...query, ...invalid });
      assert.equal(response.statusCode, 400);
      assert.equal(reads.length, 0);
    }
    response = await request(handler, query, "POST");
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "GET");
  }
  response = await request(jpegHandler, { id: "42", theme: "dark" });
  assert.equal(response.statusCode, 200, "legacy URLs still work");
  storageFailure = true;
  response = await request(jpegHandler, query);
  assert.equal(response.statusCode, 500);
  assert.equal(response.headers["Cache-Control"], "no-store");
  storageFailure = false;

  // Render the actual component with Next's default optimizer configuration
  // (enabled), proving its own unoptimized prop is sufficient.
  const markup = renderToStaticMarkup(
    React.createElement(TabScreenshotImage, {
      tabId: 42,
      theme: "light",
      version,
      width: 330,
      title: "Fixture",
      filterId: "fixture",
      onLoad() {},
    }),
  );
  assert(!markup.includes("/_next/image"));
  server = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        `<!doctype html><div style="position:relative;width:330px;height:152px">${markup}</div>`,
      );
      return;
    }
    const width = url.searchParams.get("width");
    const image = objects.get(`42/card-v1/${width}/light.jpeg`);
    if (!image || !url.pathname.startsWith("/api/getTabScreenshot/")) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", "image/jpeg");
    res.end(image.body);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const [deviceScaleFactor, expectedWidth] of [
    [1, "400"],
    [2, "800"],
  ]) {
    const context = await browser.newContext({ deviceScaleFactor });
    try {
      const page = await context.newPage();
      const imageRequests = [];
      page.on("request", (request) => {
        if (request.resourceType() === "image")
          imageRequests.push(request.url());
      });
      await page.goto(baseURL);
      await page.locator("img").evaluate((image) => image.decode());
      const selected = new URL(
        await page.locator("img").evaluate((image) => image.currentSrc),
      );
      assert.equal(selected.searchParams.get("width"), expectedWidth);
      assert.equal(imageRequests.length, 1, "one saved JPEG per card");
      assert(imageRequests.every((url) => !url.includes("/_next/image")));
    } finally {
      await context.close();
    }
  }
  console.log(
    "Thumbnail verification passed: generation, API fallbacks/cache/version checks, deletion, and 1x/2x browser selection without Vercel optimization.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  send.mock.restore();
  hooks.deregister();
  delete globalThis.__thumbnailNextImage;
}
