/**
 * Verify page background gradient is viewport-fixed (does not track scroll)
 * and that touch-only overscroll covers are gated correctly.
 *
 * Usage: node scripts/verifyPageBackgroundOverscroll.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";

const baseUrl =
  process.argv[2] ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

const DESKTOP_VIEWPORTS = [
  { name: "hd-ready", width: 1280, height: 720 },
  { name: "full-hd", width: 1920, height: 1080 },
  { name: "qhd", width: 2560, height: 1440 },
  { name: "ultrawide", width: 3440, height: 1440 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function measureGradient(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".pageBackgroundGradient");
    if (!el) return null;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      position: style.position,
      top: style.top,
      left: style.left,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      y: Math.round(rect.y),
      x: Math.round(rect.x),
    };
  });
}

async function measureCovers(page) {
  return page.evaluate(() => {
    const header = document.querySelector(".overscrollHeaderCover");
    const footer = document.querySelector(".overscrollFooterCover");
    const headerBefore = header ? getComputedStyle(header, "::before") : null;
    const footerAfter = footer ? getComputedStyle(footer, "::after") : null;
    return {
      headerContent: headerBefore?.content ?? "none",
      footerContent: footerAfter?.content ?? "none",
      headerBg: headerBefore?.backgroundColor ?? "",
      footerBg: footerAfter?.backgroundColor ?? "",
      headerHeight: headerBefore?.height ?? "",
      footerHeight: footerAfter?.height ?? "",
      htmlBg: getComputedStyle(document.documentElement).backgroundColor,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
}

async function scrollDocument(page, y) {
  await page.evaluate((scrollY) => {
    window.scrollTo(0, scrollY);
  }, y);
  await page.waitForTimeout(100);
}

async function verifyDesktopViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    // Explicit fine pointer / hover: desktop mouse
    hasTouch: false,
    isMobile: false,
  });
  const page = await context.newPage();
  // Force fine-pointer media so cover rules stay off even if host reports coarse.
  await page.emulateMedia({ media: "screen" });
  await page.addInitScript(() => {
    // Playwright can't directly override matchMedia features easily for pointer;
    // we assert covers via computed style after setting a class probe below.
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });

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

  // Large viewports may fit the homepage; inject height so scroll-stability
  // of the fixed gradient is always exercised.
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "3000px";
    spacer.setAttribute("aria-hidden", "true");
    spacer.setAttribute("data-test-spacer", "true");
    document.querySelector("main")?.appendChild(spacer);
  });
  const targetScroll = 1200;
  await scrollDocument(page, targetScroll);
  const afterScroll = await measureGradient(page);
  assert(afterScroll, `[${viewport.name}] gradient missing after scroll`);
  assert(
    afterScroll.y === 0 && afterScroll.x === 0,
    `[${viewport.name}] gradient moved after scroll to y=${afterScroll.y} x=${afterScroll.x}`,
  );
  assert(
    afterScroll.position === "fixed",
    `[${viewport.name}] position changed after scroll: ${afterScroll.position}`,
  );

  // On desktop (no coarse+no-hover media), covers should not generate content.
  // Emulate fine pointer media features via CSSOM probe:
  const coverProbe = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "overscrollHeaderCover";
    probe.style.cssText =
      "position:sticky;top:0;height:1px;width:1px;visibility:hidden";
    document.body.appendChild(probe);
    const before = getComputedStyle(probe, "::before");
    const content = before.content;
    probe.remove();
    return content;
  });
  // Under default desktop media, content should be "none" / normal empty.
  assert(
    !coverProbe || coverProbe === "none" || coverProbe === "normal",
    `[${viewport.name}] desktop should not paint overscroll covers, got content=${coverProbe}`,
  );

  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/overscroll-desktop-${viewport.name}.png`,
    fullPage: false,
  });

  await context.close();
  return { viewport: viewport.name, ok: true, scrollTested: true };
}

async function verifyTouchCovers(browser) {
  const iPhone = devices["iPhone 14"];
  const context = await browser.newContext({
    ...iPhone,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  const gradient = await measureGradient(page);
  assert(gradient, "[touch] missing .pageBackgroundGradient");
  assert(
    gradient.position === "fixed",
    `[touch] expected position:fixed, got ${gradient.position}`,
  );

  const covers = await measureCovers(page);
  // Coarse + no-hover should activate pads. content becomes e.g. '""'
  assert(
    covers.headerContent.includes('"') || covers.headerContent === '""',
    `[touch] header cover ::before missing, content=${covers.headerContent}`,
  );
  assert(
    covers.footerContent.includes('"') || covers.footerContent === '""',
    `[touch] footer cover ::after missing, content=${covers.footerContent}`,
  );
  assert(
    covers.headerHeight === "100dvh" || covers.headerHeight.endsWith("px"),
    `[touch] unexpected header cover height ${covers.headerHeight}`,
  );
  assert(
    covers.footerHeight === "100dvh" || covers.footerHeight.endsWith("px"),
    `[touch] unexpected footer cover height ${covers.footerHeight}`,
  );

  // Scroll and confirm gradient stays fixed on touch viewport too.
  await scrollDocument(page, 400);
  const afterScroll = await measureGradient(page);
  assert(
    afterScroll?.y === 0,
    `[touch] gradient moved after scroll y=${afterScroll?.y}`,
  );

  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-iphone14.png",
    fullPage: false,
  });

  // Scroll to footer for a bottom-chrome screenshot
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(150);
  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/overscroll-touch-iphone14-footer.png",
    fullPage: false,
  });

  await context.close();
  return { ok: true, covers };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of DESKTOP_VIEWPORTS) {
      results.push(await verifyDesktopViewport(browser, viewport));
      console.log(`OK desktop ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
    const touch = await verifyTouchCovers(browser);
    results.push({ viewport: "iphone-14", ok: true, covers: touch.covers });
    console.log("OK touch iPhone 14 covers + fixed gradient");
    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
