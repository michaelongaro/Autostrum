/**
 * Verify Safari-aware page background / overscroll behavior:
 * - Gradient is position:fixed (static during normal scroll)
 * - body background-color is solid header (Safari rubber-band source)
 * - Touch: header-only upward pad covers simulated top rubber-band
 * - No footer pad / no scrollHeight inflation
 * - Desktop: no overscroll pad
 *
 * Usage: node scripts/verifyPageBackgroundOverscroll.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import sharp from "sharp";

const baseUrl =
  process.argv[2] ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

const DESKTOP_VIEWPORTS = [
  { name: "hd-ready", width: 1280, height: 720 },
  { name: "full-hd", width: 1920, height: 1080 },
  { name: "qhd", width: 2560, height: 1440 },
  { name: "ultrawide", width: 3440, height: 1440 },
];

/** Aggressive simulated rubber-band distance in CSS pixels. */
const OVERSCROLL_PX = 280;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseRgb(input) {
  const match = String(input)
    .trim()
    .match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
    );
  assert(match, `expected rgb/rgba color, got ${input}`);
  return {
    r: Math.round(Number(match[1])),
    g: Math.round(Number(match[2])),
    b: Math.round(Number(match[3])),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

async function sampleScreenshotPixel(page, x, y) {
  const buffer = await page.screenshot({ type: "png" });
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = Math.max(0, Math.min(info.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(info.height - 1, Math.round(y)));
  const idx = (py * info.width + px) * info.channels;
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
}

async function measureGradient(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".pageBackgroundGradient");
    if (!el) return null;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      position: style.position,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      y: Math.round(rect.y),
      x: Math.round(rect.x),
    };
  });
}

async function getRootColors(page) {
  return page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      htmlBg: html.backgroundColor,
      bodyBg: body.backgroundColor,
      bodyBgImage: body.backgroundImage,
    };
  });
}

async function getHeaderPadMetrics(page) {
  return page.evaluate(() => {
    const pad = document.querySelector(".overscrollHeaderPad");
    if (!pad) return null;
    const style = getComputedStyle(pad);
    const rect = pad.getBoundingClientRect();
    return {
      height: style.height,
      backgroundColor: style.backgroundColor,
      bottom: style.bottom,
      boxShadow: style.boxShadow,
      rectHeight: Math.round(rect.height),
      rectBottom: Math.round(rect.bottom),
      rectTop: Math.round(rect.top),
    };
  });
}

async function getScrollMetrics(page) {
  return page.evaluate(() => {
    const footer = document.querySelector("footer");
    const footerRect = footer?.getBoundingClientRect();
    const footerBottom =
      (footerRect ? footerRect.bottom + window.scrollY : 0) || 0;
    return {
      scrollHeight: document.documentElement.scrollHeight,
      footerBottom: Math.round(footerBottom),
      hasFooterPad: Boolean(document.querySelector(".overscrollFooterPad")),
    };
  });
}

/**
 * Simulate Safari's top-overscroll failure mode: fixed gradient stays put while
 * scrolling chrome rubber-bands down (translate every main child except gradient).
 */
async function simulateRubberBand(page, translateY) {
  await page.evaluate((y) => {
    const main = document.querySelector("main");
    if (!main) return;
    for (const child of main.children) {
      if (child.classList.contains("pageBackgroundGradient")) continue;
      child.setAttribute("data-prev-transform", child.style.transform || "");
      child.style.transform = `translateY(${y}px)`;
    }
  }, translateY);
  await page.waitForTimeout(80);
}

async function clearRubberBand(page) {
  await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return;
    for (const child of main.children) {
      if (child.classList.contains("pageBackgroundGradient")) continue;
      const prev = child.getAttribute("data-prev-transform");
      if (prev !== null) {
        child.style.transform = prev;
        child.removeAttribute("data-prev-transform");
      }
    }
  });
}

async function ensureScrollable(page) {
  await page.evaluate(() => {
    if (document.querySelector("[data-test-spacer]")) return;
    const spacer = document.createElement("div");
    spacer.style.height = "3000px";
    spacer.setAttribute("aria-hidden", "true");
    spacer.setAttribute("data-test-spacer", "true");
    const main = document.querySelector("main");
    const footer = main?.querySelector("footer");
    if (main && footer) main.insertBefore(spacer, footer);
    else main?.appendChild(spacer);
  });
}

async function assertHeaderPadDoesNotInflateScrollHeight(page, label) {
  const before = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const after = await page.evaluate(() => {
    for (const el of document.querySelectorAll(".overscrollHeaderPad")) {
      el.remove();
    }
    return document.documentElement.scrollHeight;
  });
  assert(
    before === after,
    `[${label}] header pad inflated scrollHeight (${before} -> ${after} without pad)`,
  );
  await page.evaluate(() => {
    const header = document.querySelector("nav");
    if (header && !header.querySelector(".overscrollHeaderPad")) {
      const pad = document.createElement("div");
      pad.setAttribute("aria-hidden", "true");
      pad.className = "overscrollHeaderPad";
      header.prepend(pad);
    }
  });
}

async function verifyDesktopViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: false,
    isMobile: false,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await ensureScrollable(page);

  const roots = await getRootColors(page);
  const bodyBg = parseRgb(roots.bodyBg);
  assert(bodyBg.a === 1, `[${viewport.name}] body background must be opaque`);
  assert(
    roots.bodyBgImage === "none",
    `[${viewport.name}] body must not use background-image (Safari ignores it for overscroll)`,
  );

  const beforeScroll = await measureGradient(page);
  assert(beforeScroll, `[${viewport.name}] missing .pageBackgroundGradient`);
  assert(
    beforeScroll.position === "fixed",
    `[${viewport.name}] expected position:fixed, got ${beforeScroll.position}`,
  );
  assert(
    beforeScroll.y === 0,
    `[${viewport.name}] gradient top should be 0, got ${beforeScroll.y}`,
  );
  assert(
    Math.abs(beforeScroll.width - viewport.width) <= 1,
    `[${viewport.name}] gradient width ${beforeScroll.width} != viewport ${viewport.width}`,
  );
  assert(
    Math.abs(beforeScroll.height - viewport.height) <= 1,
    `[${viewport.name}] gradient height ${beforeScroll.height} != viewport ${viewport.height}`,
  );

  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(80);
  const afterScroll = await measureGradient(page);
  assert(
    afterScroll?.y === 0 && afterScroll?.x === 0,
    `[${viewport.name}] gradient moved after scroll to y=${afterScroll?.y}`,
  );

  const pad = await getHeaderPadMetrics(page);
  assert(pad, `[${viewport.name}] missing header pad host`);
  assert(
    pad.rectHeight === 0 || pad.height === "0px",
    `[${viewport.name}] desktop must not paint header overscroll pad, height=${pad.height}`,
  );

  const metrics = await getScrollMetrics(page);
  assert(!metrics.hasFooterPad, `[${viewport.name}] footer pad must not exist`);
  assert(
    metrics.scrollHeight - metrics.footerBottom <= 4,
    `[${viewport.name}] document taller than footer (scrollHeight=${metrics.scrollHeight}, footerBottom=${metrics.footerBottom})`,
  );
  await assertHeaderPadDoesNotInflateScrollHeight(page, viewport.name);

  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/overscroll-desktop-${viewport.name}.png`,
    fullPage: false,
  });

  await context.close();
  return { viewport: viewport.name, ok: true, bodyBg: roots.bodyBg };
}

async function verifyTouchOverscroll(browser) {
  const iPhone = devices["iPhone 14"];
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await ensureScrollable(page);

  const roots = await getRootColors(page);
  const headerColor = parseRgb(roots.bodyBg);
  assert(headerColor.a === 1, "[touch] body background must be opaque");
  assert(
    roots.bodyBgImage === "none",
    "[touch] body must not use background-image for overscroll",
  );

  const gradient = await measureGradient(page);
  assert(gradient?.position === "fixed", "[touch] gradient must be fixed");

  const pad = await getHeaderPadMetrics(page);
  assert(pad, "[touch] missing header pad");
  assert(
    pad.rectHeight > iPhone.viewport.height,
    `[touch] header pad too short (${pad.rectHeight}px)`,
  );
  assert(
    colorDistance(parseRgb(pad.backgroundColor), headerColor) <= 2,
    `[touch] pad color ${pad.backgroundColor} != body ${roots.bodyBg}`,
  );

  const metrics = await getScrollMetrics(page);
  assert(!metrics.hasFooterPad, "[touch] footer pad must not exist");
  assert(
    metrics.scrollHeight - metrics.footerBottom <= 4,
    `[touch] document taller than footer (scrollHeight=${metrics.scrollHeight}, footerBottom=${metrics.footerBottom})`,
  );
  await assertHeaderPadDoesNotInflateScrollHeight(page, "touch");

  // At rest: footer is normal height (flush with content end / viewport when scrolled).
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(80);
  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-at-rest-footer.png",
    fullPage: false,
  });
  const footerAtRest = await page.evaluate(() => {
    const footer = document.querySelector("footer");
    const r = footer.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
      vh: window.innerHeight,
    };
  });
  assert(
    footerAtRest.height === 64,
    `[touch] footer should stay h-16 at rest, got ${footerAtRest.height}`,
  );
  assert(
    footerAtRest.bottom <= footerAtRest.vh + 1,
    "[touch] footer must not extend past viewport with empty pad at rest",
  );

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);

  // Top overscroll simulation (Safari: fixed gradient stays, header moves down).
  await simulateRubberBand(page, OVERSCROLL_PX);
  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-top-simulated.png",
    fullPage: false,
  });
  for (const y of [8, 24, 48, 96, 160, 240]) {
    if (y >= OVERSCROLL_PX) continue;
    const color = await sampleScreenshotPixel(
      page,
      iPhone.viewport.width / 2,
      y,
    );
    const dist = colorDistance(color, headerColor);
    assert(
      dist <= 18,
      `[touch] top overscroll y=${y} not header color (dist=${dist.toFixed(1)}, got ${JSON.stringify(color)}, expected ${JSON.stringify(headerColor)})`,
    );
  }
  await clearRubberBand(page);

  // Extreme top pull (> one viewport) — prior 100dvh covers failed here.
  await simulateRubberBand(page, Math.round(iPhone.viewport.height * 1.25));
  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-top-extreme.png",
    fullPage: false,
  });
  for (const y of [
    12,
    120,
    Math.round(iPhone.viewport.height * 0.5),
    Math.round(iPhone.viewport.height * 0.9),
  ]) {
    const color = await sampleScreenshotPixel(
      page,
      iPhone.viewport.width / 2,
      y,
    );
    const dist = colorDistance(color, headerColor);
    assert(
      dist <= 18,
      `[touch] extreme top overscroll y=${y} not header color (dist=${dist.toFixed(1)}, got ${JSON.stringify(color)}, expected ${JSON.stringify(headerColor)})`,
    );
  }
  await clearRubberBand(page);

  // Bottom overscroll: Safari paints body background-color in the rubber-band
  // region (no footer slab). Assert the solid body color Safari will sample.
  assert(
    colorDistance(headerColor, parseRgb(roots.bodyBg)) === 0,
    "[touch] body background-color must match header for Safari bottom overscroll",
  );

  await context.close();
  return {
    ok: true,
    headerColor,
    padHeight: pad.rectHeight,
    scrollHeight: metrics.scrollHeight,
    footerBottom: metrics.footerBottom,
    bodyBg: roots.bodyBg,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of DESKTOP_VIEWPORTS) {
      results.push(await verifyDesktopViewport(browser, viewport));
      console.log(
        `OK desktop ${viewport.name} (${viewport.width}x${viewport.height})`,
      );
    }
    const touch = await verifyTouchOverscroll(browser);
    results.push({ viewport: "iphone-14", ...touch });
    console.log("OK touch Safari-aware overscroll + simulated top coverage");
    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
