/**
 * Verify page background gradient is viewport-fixed, touch overscroll pads do
 * not inflate document height, and simulated rubber-band gaps are painted with
 * the solid header color (not the page gradient).
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
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  assert(match, `expected rgb/rgba color, got ${input}`);
  return {
    r: Math.round(Number(match[1])),
    g: Math.round(Number(match[2])),
    b: Math.round(Number(match[3])),
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

async function getHeaderColor(page) {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).backgroundColor,
  );
}

async function getPadBoxShadow(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return getComputedStyle(el).boxShadow;
  }, selector);
}

async function getScrollMetrics(page) {
  return page.evaluate(() => {
    const footer = document.querySelector("footer");
    const footerRect = footer?.getBoundingClientRect();
    const footerBottom =
      (footerRect ? footerRect.bottom + window.scrollY : 0) || 0;
    return {
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      footerBottom: Math.round(footerBottom),
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    };
  });
}

/**
 * Simulate the failure mode where the fixed gradient stays put while page
 * chrome rubber-bands (translate every main child except the gradient).
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
    // Keep the footer as the last in-flow child so height-inflation checks remain valid.
    if (main && footer) main.insertBefore(spacer, footer);
    else main?.appendChild(spacer);
  });
}

/** Pads must not extend document scrollHeight (the old abspos 100dvh footer did). */
async function assertPadsDoNotInflateScrollHeight(page, label) {
  const before = await page.evaluate(() => document.documentElement.scrollHeight);
  const after = await page.evaluate(() => {
    for (const el of document.querySelectorAll(
      ".overscrollHeaderPad, .overscrollFooterPad",
    )) {
      el.remove();
    }
    return document.documentElement.scrollHeight;
  });
  assert(
    before === after,
    `[${label}] overscroll pads inflated scrollHeight (${before} -> ${after} without pads)`,
  );
  // Restore pads for subsequent assertions by reloading would be heavy; re-add empty hosts.
  await page.evaluate(() => {
    const header = document.querySelector("nav.sticky, nav#desktopHeader, nav");
    const footer = document.querySelector("footer");
    if (header && !header.querySelector(".overscrollHeaderPad")) {
      const pad = document.createElement("div");
      pad.setAttribute("aria-hidden", "true");
      pad.className = "overscrollHeaderPad";
      header.prepend(pad);
    }
    if (footer && !footer.querySelector(".overscrollFooterPad")) {
      const pad = document.createElement("div");
      pad.setAttribute("aria-hidden", "true");
      pad.className = "overscrollFooterPad";
      footer.prepend(pad);
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
  assert(afterScroll, `[${viewport.name}] gradient missing after scroll`);
  assert(
    afterScroll.y === 0 && afterScroll.x === 0,
    `[${viewport.name}] gradient moved after scroll to y=${afterScroll.y} x=${afterScroll.x}`,
  );

  const headerShadow = await getPadBoxShadow(page, ".overscrollHeaderPad");
  const footerShadow = await getPadBoxShadow(page, ".overscrollFooterPad");
  assert(
    !headerShadow || headerShadow === "none",
    `[${viewport.name}] desktop must not paint header overscroll pad shadow, got ${headerShadow}`,
  );
  assert(
    !footerShadow || footerShadow === "none",
    `[${viewport.name}] desktop must not paint footer overscroll pad shadow, got ${footerShadow}`,
  );

  const metrics = await getScrollMetrics(page);
  // Footer should sit at (or extremely near) the document end — no 100dvh phantom tail.
  assert(
    metrics.scrollHeight - metrics.footerBottom <= 4,
    `[${viewport.name}] document taller than footer (scrollHeight=${metrics.scrollHeight}, footerBottom=${metrics.footerBottom})`,
  );
  await assertPadsDoNotInflateScrollHeight(page, viewport.name);

  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/overscroll-desktop-${viewport.name}.png`,
    fullPage: false,
  });

  await context.close();
  return { viewport: viewport.name, ok: true };
}

async function verifyTouchOverscroll(browser) {
  const iPhone = devices["iPhone 14"];
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await ensureScrollable(page);

  const gradient = await measureGradient(page);
  assert(gradient, "[touch] missing .pageBackgroundGradient");
  assert(
    gradient.position === "fixed",
    `[touch] expected position:fixed, got ${gradient.position}`,
  );

  const headerShadow = await getPadBoxShadow(page, ".overscrollHeaderPad");
  const footerShadow = await getPadBoxShadow(page, ".overscrollFooterPad");
  assert(
    headerShadow && headerShadow !== "none" && headerShadow.includes("rgb"),
    `[touch] header pad shadow missing, got ${headerShadow}`,
  );
  assert(
    footerShadow && footerShadow !== "none" && footerShadow.includes("rgb"),
    `[touch] footer pad shadow missing, got ${footerShadow}`,
  );

  const metrics = await getScrollMetrics(page);
  assert(
    metrics.scrollHeight - metrics.footerBottom <= 4,
    `[touch] footer pad inflated document height (scrollHeight=${metrics.scrollHeight}, footerBottom=${metrics.footerBottom})`,
  );
  await assertPadsDoNotInflateScrollHeight(page, "touch");

  const headerColor = parseRgb(await getHeaderColor(page));

  // Sample a gradient-ish pixel mid-viewport for contrast sanity (should differ
  // from solid header, or at least we still assert overscroll samples match header).
  const midPixel = await sampleScreenshotPixel(
    page,
    iPhone.viewport.width / 2,
    iPhone.viewport.height / 2,
  );

  // Top overscroll: content rubber-bands down, fixed gradient stays.
  await simulateRubberBand(page, OVERSCROLL_PX);
  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-top-simulated.png",
    fullPage: false,
  });
  const topSamples = [];
  for (const y of [8, 24, 48, 96, 160, 240]) {
    if (y >= OVERSCROLL_PX) continue;
    topSamples.push({
      y,
      color: await sampleScreenshotPixel(page, iPhone.viewport.width / 2, y),
    });
  }
  for (const sample of topSamples) {
    const dist = colorDistance(sample.color, headerColor);
    assert(
      dist <= 18,
      `[touch] top overscroll y=${sample.y} not header color (dist=${dist.toFixed(1)}, got ${JSON.stringify(sample.color)}, expected ${JSON.stringify(headerColor)}, mid=${JSON.stringify(midPixel)})`,
    );
  }
  await clearRubberBand(page);

  // Bottom overscroll: scroll to end, rubber-band content up.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(100);
  await simulateRubberBand(page, -OVERSCROLL_PX);
  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-bottom-simulated.png",
    fullPage: false,
  });
  const vh = iPhone.viewport.height;
  const bottomSamples = [];
  for (const y of [vh - 8, vh - 24, vh - 48, vh - 96, vh - 160, vh - 240]) {
    if (vh - y >= OVERSCROLL_PX) continue;
    bottomSamples.push({
      y,
      color: await sampleScreenshotPixel(page, iPhone.viewport.width / 2, y),
    });
  }
  for (const sample of bottomSamples) {
    const dist = colorDistance(sample.color, headerColor);
    assert(
      dist <= 18,
      `[touch] bottom overscroll y=${sample.y} not header color (dist=${dist.toFixed(1)}, got ${JSON.stringify(sample.color)}, expected ${JSON.stringify(headerColor)})`,
    );
  }
  await clearRubberBand(page);

  // Extreme overscroll beyond one viewport (prior 100dvh abspos still failed here).
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
  await simulateRubberBand(page, Math.round(iPhone.viewport.height * 1.25));
  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-top-extreme.png",
    fullPage: false,
  });
  const extremeSamples = [
    await sampleScreenshotPixel(page, iPhone.viewport.width / 2, 12),
    await sampleScreenshotPixel(page, iPhone.viewport.width / 2, 120),
    await sampleScreenshotPixel(
      page,
      iPhone.viewport.width / 2,
      Math.round(iPhone.viewport.height * 0.5),
    ),
  ];
  for (const [index, color] of extremeSamples.entries()) {
    const dist = colorDistance(color, headerColor);
    assert(
      dist <= 18,
      `[touch] extreme top overscroll sample[${index}] not header color (dist=${dist.toFixed(1)}, got ${JSON.stringify(color)}, expected ${JSON.stringify(headerColor)})`,
    );
  }
  await clearRubberBand(page);

  await context.close();
  return {
    ok: true,
    headerColor,
    headerShadow,
    footerShadow,
    scrollHeight: metrics.scrollHeight,
    footerBottom: metrics.footerBottom,
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
    console.log("OK touch overscroll pads + simulated rubber-band coverage");
    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
