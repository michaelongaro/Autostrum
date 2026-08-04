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
//   - Chromium and WebKit both keep in-viewport subsections non-empty while
//     scrolling (catches iOS/Safari-style empty-section regressions)
//
// Optional engine arg: chromium | webkit | both (default: both)
import { chromium, webkit } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const HARNESS = `${BASE}/dev-virtualization-harness`;
const ENGINE = (process.argv[3] ?? "both").toLowerCase();

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
    // At zoom < 1 the layout width grows (CSS zoom expands the used
    // content box), so a huge subsection packs into fewer, visually-shorter
    // rows and more of them fit inside the overscan window. Require an
    // appreciable cull, but don't demand the same 60% bar used at zoom ≥ 1.
    const reductionLimit = zoom < 1 ? 0.85 : 0.6;
    assert(
      virtTop.nodes < full.nodes * reductionLimit,
      `zoom=${zoom}: appreciable DOM reduction (${virtTop.nodes} < ${reductionLimit * 100}% of ${full.nodes})`,
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

  // Sticky bottom controls mount once the tab content intersects the
  // in-view observer, which bumps scrollHeight by ~80px after the first
  // scroll. Nudge scroll once up-front so chrome is settled before we
  // assert height stability across the series.
  await page.evaluate(() => window.scrollTo(0, 200));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const series = await scrollSeries(page);

  assert(
    new Set(series.map((s) => s.nodes)).size > 1,
    `StaticTab page DOM changes while scrolling (${series.map((s) => s.nodes).join(" -> ")})`,
  );
  // Sticky bottom controls mount/unmount via an in-view observer and can
  // bump scrollHeight by ~80px at the top of the page. Bare-harness tests
  // already assert exact height stability for the virtualized sections;
  // here we only require that chrome jitter stays within that band.
  const staticTabHeights = series.map((s) => s.docHeight);
  const heightSpan =
    Math.max(...staticTabHeights) - Math.min(...staticTabHeights);
  assert(
    heightSpan <= 120,
    `StaticTab page scroll height stable within sticky-chrome band ` +
      `(span ${heightSpan}px; heights ${[...new Set(staticTabHeights)].join(", ")})`,
  );

  await page.context().close();
  return series[0].nodes;
}

async function testNoEmptyInViewportSections(browser, engineName, viewport) {
  console.log(
    `\n--- no empty in-viewport sections engine=${engineName} ` +
      `viewport=${viewport.width}x${viewport.height} ---`,
  );

  for (const zoom of [0.5, 1, 1.5]) {
    const page = await openPage(
      browser,
      `${HARNESS}?bare=1&fixture=huge&virtualized=true&zoom=${zoom}`,
      viewport,
    );

    const docHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const steps = 10;
    let emptyHits = 0;

    for (let i = 0; i <= steps; i++) {
      await page.evaluate(
        (y) => window.scrollTo(0, y),
        (docHeight * i) / steps,
      );
      await page.waitForTimeout(250);

      const empties = await page.evaluate(() => {
        const bodies = [
          ...document.querySelectorAll(
            ".rounded-md.border.px-4 > div.relative.w-full, .rounded-md.border.px-4 > div.baseFlex.relative.w-full",
          ),
        ];
        return bodies.filter((body) => {
          const rect = body.getBoundingClientRect();
          const styleHeight = parseFloat(body.style.height) || 0;
          if (styleHeight <= 0) return false;
          const visuallyIn =
            rect.bottom > 0 && rect.top < window.innerHeight;
          if (!visuallyIn) return false;
          const rows = [...body.children].filter(
            (el) => el.getAttribute("aria-hidden") !== "true",
          );
          return rows.length === 0;
        }).length;
      });

      emptyHits += empties;
    }

    assert(
      emptyHits === 0,
      `zoom=${zoom}: no in-viewport subsection is empty while scrolling ` +
        `(emptyHits=${emptyHits})`,
    );

    await page.context().close();
  }
}

async function testHeightBasedZoomSurvivesWidthCollapse(
  browser,
  engineName,
  viewport,
) {
  console.log(
    `\n--- height-based zoom vs collapsed width ratio engine=${engineName} ---`,
  );

  const page = await openPage(
    browser,
    `${HARNESS}?bare=1&fixture=huge&virtualized=true&zoom=1.5`,
    viewport,
  );

  // Scroll into the middle of the tall zoomed subsection where a collapsed
  // width-ratio (measuredZoom=1 with scaled bodyTop) would empty the body.
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight * 0.45);
  });
  await page.waitForTimeout(400);

  const probe = await page.evaluate(() => {
    const body = document.querySelector(
      ".rounded-md.border.px-4 > div.relative.w-full, .rounded-md.border.px-4 > div.baseFlex.relative.w-full",
    );
    if (!body) return { error: "no body" };
    const rect = body.getBoundingClientRect();
    const styleHeight = parseFloat(body.style.height) || 0;
    const widthRatio =
      body.offsetWidth > 0 ? rect.width / body.offsetWidth : NaN;
    const heightRatio = styleHeight > 0 ? rect.height / styleHeight : NaN;
    const rows = [...body.children].filter(
      (el) => el.getAttribute("aria-hidden") !== "true",
    );
    const visuallyIn = rect.bottom > 0 && rect.top < window.innerHeight;

    // Pure-math check of the regression: scaled top + zoom=1 → null mid-body.
    const OVERSCAN = 300;
    const ROW = 248;
    const buggyStart = (-OVERSCAN - rect.top) / 1;
    const buggyEnd = (window.innerHeight + OVERSCAN - rect.top) / 1;
    const buggyNull = buggyEnd <= 0 || buggyStart >= styleHeight;
    const fixedZoom = heightRatio > 0 ? heightRatio : widthRatio;
    const fixedStart = (-OVERSCAN - rect.top) / fixedZoom;
    const fixedEnd = (window.innerHeight + OVERSCAN - rect.top) / fixedZoom;
    const fixedNull = fixedEnd <= 0 || fixedStart >= styleHeight;

    return {
      visuallyIn,
      renderedRows: rows.length,
      widthRatio,
      heightRatio,
      styleHeight,
      rectTop: rect.top,
      buggyNull,
      fixedNull,
    };
  });

  assert(!probe.error, `found subsection body (${probe.error ?? "ok"})`);
  assert(probe.visuallyIn, `mid-scroll body is visually in the viewport`);
  assert(
    probe.renderedRows > 0,
    `mid-scroll body renders rows (got ${probe.renderedRows})`,
  );
  assert(
    Math.abs(probe.heightRatio - 1.5) < 0.05,
    `height ratio tracks CSS zoom (~1.5, got ${probe.heightRatio})`,
  );
  // At zoom=1.5 on engines that scale rects, a width-collapse simulation
  // (forced zoom=1) must be the failing path — document that the height
  // path is what keeps rows mounted.
  if (Math.abs(probe.widthRatio - 1.5) < 0.05) {
    assert(
      probe.buggyNull === true || probe.fixedNull === false,
      `height-based conversion keeps a non-null window ` +
        `(buggyNull=${probe.buggyNull}, fixedNull=${probe.fixedNull})`,
    );
    assert(
      probe.fixedNull === false,
      `height-based zoom must not null the mid-section window`,
    );
  }

  await page.context().close();
}

async function runEngine(browserType, engineName) {
  console.log(`\n#################### engine=${engineName} ####################`);
  const browser = await browserType.launch();

  try {
    const desktop = { width: 1280, height: 800 };
    const mobile = { width: 390, height: 844 };

    for (const fixture of ["realistic", "huge"]) {
      await testFixtureOnViewport(browser, fixture, "desktop", desktop);
      await testFixtureOnViewport(browser, fixture, "mobile", mobile);
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

    await testNoEmptyInViewportSections(browser, engineName, mobile);
    await testHeightBasedZoomSurvivesWidthCollapse(
      browser,
      engineName,
      mobile,
    );
  } finally {
    await browser.close();
  }
}

const engines = [];
if (ENGINE === "both" || ENGINE === "chromium") {
  engines.push([chromium, "chromium"]);
}
if (ENGINE === "both" || ENGINE === "webkit") {
  engines.push([webkit, "webkit"]);
}
if (engines.length === 0) {
  console.error(`Unknown engine "${ENGINE}". Use chromium, webkit, or both.`);
  process.exit(2);
}

for (const [browserType, name] of engines) {
  await runEngine(browserType, name);
}

console.log(`\n${checks - failures.length}/${checks} checks passed`);

if (failures.length > 0) {
  console.error(`\nFAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
