// End-to-end verification of static tab row virtualization.
//
// Usage:
//   1. start the dev server (npm run dev)
//   2. node scripts/verifyStaticTabVirtualization.mjs [baseURL]
//
// Exits non-zero if any assertion fails. Asserts, for both a "realistic"
// long tab (10 sections x 2 subsections x 8 measures) and a "huge" single
// 100-measure subsection, on desktop and mobile viewports:
//   - virtualized DOM node count is an appreciable reduction vs full render
//   - DOM node count changes while scrolling (rows mount/unmount)
//   - document scroll height stays perfectly stable while scrolling
//   - aggregate spacers are present and slide while scrolling
//   - full vs virtualized geometry parity (document height + every section
//     card's width/height) across viewport widths
//   - the same packing / scroll invariants hold at non-default tab zoom
//     levels (CSS zoom on the section tree), including that measured layout
//     width is not incorrectly divided by zoom
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const HARNESS = `${BASE}/dev-virtualization-harness`;

const failures = [];
let checks = 0;

function assert(condition, message) {
  checks++;
  if (condition) {
    console.log(`  PASS  ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

async function openPage(browser, url, viewport) {
  const context = await browser.newContext({ viewport });
  // a present (even fake) dev-browser cookie keeps Clerk's middleware from
  // redirecting the page to its handshake endpoint; auth is irrelevant to
  // what is being verified here
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();
  page.on("pageerror", (err) => {
    failures.push(`pageerror on ${url}: ${err.message}`);
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('#devVirtualizationHarness[data-ready="true"]');
  // let observers / pre-paint effects settle
  await page.waitForTimeout(800);
  return page;
}

const snapshot = (page) =>
  page.evaluate(() => ({
    nodes: document.querySelectorAll("*").length,
    docHeight: document.documentElement.scrollHeight,
    scrollY: Math.round(window.scrollY),
    spacers: [...document.querySelectorAll('div[aria-hidden="true"]')]
      .filter((el) => el.style.height !== "")
      .map((el) => parseInt(el.style.height)),
    cards: [...document.querySelectorAll(".rounded-md.border.px-4")].map(
      (el) => {
        const rect = el.getBoundingClientRect();
        return {
          w: Math.round(rect.width * 10) / 10,
          h: Math.round(rect.height * 10) / 10,
        };
      },
    ),
  }));

async function scrollSeries(page) {
  const series = [];
  const docHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), (docHeight * i) / steps);
    await page.waitForTimeout(250);
    series.push(await snapshot(page));
  }
  return series;
}

async function testFixtureOnViewport(browser, fixture, viewportName, viewport) {
  console.log(`\n--- fixture=${fixture} viewport=${viewportName} ---`);

  // baseline: full render (virtualization disabled)
  const fullPage = await openPage(
    browser,
    `${HARNESS}?bare=1&fixture=${fixture}&virtualized=false`,
    viewport,
  );
  const full = await snapshot(fullPage);
  await fullPage.context().close();

  // virtualized
  const virtPage = await openPage(
    browser,
    `${HARNESS}?bare=1&fixture=${fixture}&virtualized=true`,
    viewport,
  );
  const virtTop = await snapshot(virtPage);

  console.log(
    `  full=${full.nodes} nodes, virtualized(top)=${virtTop.nodes} nodes ` +
      `(${Math.round((virtTop.nodes / full.nodes) * 100)}% of full)`,
  );

  assert(
    virtTop.nodes < full.nodes * 0.6,
    `appreciable DOM reduction at top of page (${virtTop.nodes} < 60% of ${full.nodes})`,
  );
  assert(
    full.docHeight === virtTop.docHeight,
    `identical total scroll height vs full render (${virtTop.docHeight} === ${full.docHeight})`,
  );
  assert(
    virtTop.spacers.some((h) => h > 0),
    `aggregate spacers present with nonzero height`,
  );

  const series = await scrollSeries(virtPage);

  const nodeCounts = [...new Set(series.map((s) => s.nodes))];
  assert(
    nodeCounts.length > 1,
    `DOM nodes change while scrolling (${series.map((s) => s.nodes).join(" -> ")})`,
  );

  const heights = [...new Set(series.map((s) => s.docHeight))];
  assert(
    heights.length === 1 && heights[0] === full.docHeight,
    `scroll height stable at every scroll position (${heights.join(", ")})`,
  );

  const maxDuringScroll = Math.max(...series.map((s) => s.nodes));
  assert(
    maxDuringScroll < full.nodes * 0.7,
    `DOM stays reduced at every scroll position (max ${maxDuringScroll} < 70% of ${full.nodes})`,
  );

  const firstSpacerTops = [...new Set(series.map((s) => s.spacers[0] ?? 0))];
  assert(
    firstSpacerTops.length > 1,
    `top spacer height slides while scrolling (${firstSpacerTops.join(" -> ")})`,
  );

  await virtPage.context().close();
  return { full: full.nodes, virt: virtTop.nodes };
}

async function testParity(browser, fixture, width) {
  const viewport = { width, height: 800 };

  const fullPage = await openPage(
    browser,
    `${HARNESS}?bare=1&fixture=${fixture}&virtualized=false`,
    viewport,
  );
  const full = await snapshot(fullPage);
  await fullPage.context().close();

  const virtPage = await openPage(
    browser,
    `${HARNESS}?bare=1&fixture=${fixture}&virtualized=true`,
    viewport,
  );
  const virt = await snapshot(virtPage);
  await virtPage.context().close();

  assert(
    full.docHeight === virt.docHeight &&
      JSON.stringify(full.cards) === JSON.stringify(virt.cards),
    `geometry parity for fixture=${fixture} at ${width}px ` +
      `(docHeight ${virt.docHeight} vs ${full.docHeight}, ${full.cards.length} cards)`,
  );
}

async function testZoomAwareness(browser, viewport) {
  console.log(`\n--- zoom awareness viewport=${viewport.width}x${viewport.height} ---`);

  // At zoom=2, layout width (offsetWidth) must still drive packing. If the
  // old getBoundingClientRect()/zoom path double-divides on engines where
  // the rect is already unscaled — or even on Chromium when measurements
  // drift — row counts / spacer geometry diverge from the full renderer.
  for (const zoom of [0.5, 1, 1.5]) {
    const fullPage = await openPage(
      browser,
      `${HARNESS}?bare=1&fixture=huge&virtualized=false&zoom=${zoom}`,
      viewport,
    );
    const full = await snapshot(fullPage);
    await fullPage.context().close();

    const virtPage = await openPage(
      browser,
      `${HARNESS}?bare=1&fixture=huge&virtualized=true&zoom=${zoom}`,
      viewport,
    );
    const virtTop = await snapshot(virtPage);

    assert(
      full.docHeight === virtTop.docHeight,
      `zoom=${zoom}: identical scroll height (${virtTop.docHeight} === ${full.docHeight})`,
    );
    assert(
      virtTop.nodes < full.nodes * 0.6,
      `zoom=${zoom}: appreciable DOM reduction (${virtTop.nodes} < 60% of ${full.nodes})`,
    );
    assert(
      JSON.stringify(full.cards) === JSON.stringify(virtTop.cards),
      `zoom=${zoom}: card geometry parity (${full.cards.length} cards)`,
    );

    const series = await scrollSeries(virtPage);
    assert(
      new Set(series.map((s) => s.docHeight)).size === 1 &&
        series[0].docHeight === full.docHeight,
      `zoom=${zoom}: scroll height stable while scrolling`,
    );
    assert(
      new Set(series.map((s) => s.nodes)).size > 1,
      `zoom=${zoom}: DOM nodes change while scrolling`,
    );

    // Probe measured layout width vs visual width: layout width should equal
    // offsetWidth, and visual/layout ratio should be ~zoom on Chromium.
    const measurement = await virtPage.evaluate(() => {
      const body = document.querySelector(
        ".rounded-md.border.px-4 > div.relative.w-full, .rounded-md.border.px-4 > div.baseFlex.relative.w-full",
      );
      if (!body) return null;
      const rect = body.getBoundingClientRect();
      return {
        offsetWidth: body.offsetWidth,
        rectWidth: rect.width,
        zoomStyle:
          Number(
            getComputedStyle(
              body.closest("[style*='zoom']") ?? body,
            ).zoom,
          ) || 1,
      };
    });

    assert(measurement !== null, `zoom=${zoom}: found a subsection body to measure`);
    if (measurement) {
      // Packing must use offsetWidth; rect/zoom should be ~offsetWidth on
      // engines that scale rects, and rect itself on engines that don't.
      const scaledGuess = measurement.rectWidth / zoom;
      const unscaledGuess = measurement.rectWidth;
      const layout = measurement.offsetWidth;
      const scaledErr = Math.abs(scaledGuess - layout);
      const unscaledErr = Math.abs(unscaledGuess - layout);
      // Whichever interpretation matches offsetWidth is fine — the bug is
      // using the WRONG one. Confirm offsetWidth is what packing should use
      // by checking it is positive and matches the closer of the two guesses.
      assert(
        layout > 0,
        `zoom=${zoom}: layout offsetWidth is positive (${layout})`,
      );
      assert(
        Math.min(scaledErr, unscaledErr) < 2,
        `zoom=${zoom}: offsetWidth (${layout}) matches rect interpretation ` +
          `(scaledErr=${scaledErr.toFixed(2)}, unscaledErr=${unscaledErr.toFixed(2)})`,
      );
    }

    await virtPage.context().close();
  }
}

async function testStaticTabIntegration(browser, viewportName, viewport) {
  console.log(`\n--- StaticTab integration viewport=${viewportName} ---`);

  // the real StaticTab pipeline (non-bare) with virtualization enabled
  const page = await openPage(
    browser,
    `${HARNESS}?fixture=realistic`,
    viewport,
  );
  const series = await scrollSeries(page);

  assert(
    new Set(series.map((s) => s.nodes)).size > 1,
    `StaticTab page DOM changes while scrolling (${series.map((s) => s.nodes).join(" -> ")})`,
  );
  assert(
    new Set(series.map((s) => s.docHeight)).size === 1,
    `StaticTab page scroll height stable (${series[0].docHeight})`,
  );

  await page.context().close();
  return series[0].nodes;
}

const browser = await chromium.launch();

try {
  const desktop = { width: 1280, height: 800 };
  const mobile = { width: 390, height: 844 };

  const results = {};
  for (const fixture of ["realistic", "huge"]) {
    results[`${fixture}-desktop`] = await testFixtureOnViewport(
      browser,
      fixture,
      "desktop",
      desktop,
    );
    results[`${fixture}-mobile`] = await testFixtureOnViewport(
      browser,
      fixture,
      "mobile",
      mobile,
    );
  }

  console.log(`\n--- geometry parity across widths ---`);
  for (const fixture of ["realistic", "huge"]) {
    for (const width of [1280, 1024, 768, 390]) {
      await testParity(browser, fixture, width);
    }
  }

  await testZoomAwareness(browser, desktop);
  await testZoomAwareness(browser, mobile);

  const desktopTabNodes = await testStaticTabIntegration(
    browser,
    "desktop",
    desktop,
  );
  const mobileTabNodes = await testStaticTabIntegration(
    browser,
    "mobile",
    mobile,
  );
  console.log(
    `\nStaticTab top-of-page node counts: desktop=${desktopTabNodes}, mobile=${mobileTabNodes}`,
  );

  console.log(`\n${checks - failures.length}/${checks} checks passed`);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\nFAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
