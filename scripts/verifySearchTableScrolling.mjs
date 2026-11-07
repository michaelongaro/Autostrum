// Run against the local dev server, with existing public tabs (no data writes):
// node scripts/verifySearchTableScrolling.mjs [baseURL] [chromium|webkit|both]
import assert from "node:assert/strict";
import { chromium, devices, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engineName = process.argv[3] ?? "both";
assert(["both", "chromium", "webkit"].includes(engineName));

async function snapshot(page, scrollTo) {
  return page.locator("table").evaluate((table, top) => {
    // Sample in the same task as the scroll, before any JS scroll callback.
    if (top !== undefined) window.scrollTo(0, top);
    const track = table.closest("[data-search-table]");
    const presentation = track.querySelector("[data-table-headings]");
    const usesPresentation = getComputedStyle(presentation).display !== "none";
    const header = usesPresentation
      ? presentation
      : table.querySelector("thead");
    const toggle = document.querySelector('[aria-label="Table view"]');
    const toolbar =
      toggle.closest(".sticky") ?? toggle.closest('[class*="stickyHeader"]');
    let scroller = table.parentElement;
    while (!/auto|scroll/.test(getComputedStyle(scroller).overflowX)) {
      scroller = scroller.parentElement;
    }
    const heads = usesPresentation
      ? [...header.firstElementChild.children]
      : [...header.querySelectorAll("th")];
    const cells = [...table.querySelectorAll("tbody tr:first-child td")];
    const genreIndex = heads.findIndex((head) => head.textContent === "Genre");
    const genreHeading = document.createRange();
    genreHeading.selectNodeContents(heads[genreIndex]);
    return {
      pageScroll: window.scrollY,
      tableTop: table.getBoundingClientRect().top,
      tableBottom: (usesPresentation ? track : table).getBoundingClientRect()
        .bottom,
      headerTop: header.getBoundingClientRect().top,
      headerHeight: header.getBoundingClientRect().height,
      headerPosition: getComputedStyle(header).position,
      headerTransform: getComputedStyle(header).transform,
      toolbarBottom: toolbar.getBoundingClientRect().bottom,
      innerScroll: scroller.scrollTop,
      innerOverflow: scroller.scrollHeight - scroller.clientHeight,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      aligned: heads.every(
        (head, index) =>
          Math.abs(
            head.getBoundingClientRect().left -
              cells[index].getBoundingClientRect().left,
          ) < 1,
      ),
      genreHeadingLeft: genreHeading.getBoundingClientRect().left,
      genreBadgeLeft:
        cells[
          genreIndex
        ].firstElementChild.firstElementChild.getBoundingClientRect().left,
    };
  }, scrollTo);
}

async function check(page, scrollTo) {
  if (scrollTo !== undefined) {
    const immediate = await snapshot(page, scrollTo);
    const expected = Math.min(
      Math.max(immediate.tableTop, immediate.toolbarBottom),
      immediate.tableBottom - immediate.headerHeight,
    );
    assert(
      Math.abs(immediate.headerTop - expected) < 1,
      "Native sticky position must be correct before any scroll callback",
    );
  }
  // Allow horizontal CSS timelines to sample their scroll position.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const state = await snapshot(page);
  const expectedTop = Math.min(
    Math.max(state.tableTop, state.toolbarBottom),
    state.tableBottom - state.headerHeight,
  );
  assert(Math.abs(state.headerTop - expectedTop) < 1, JSON.stringify(state));
  assert.equal(state.headerHeight, 32);
  assert.equal(state.headerPosition, "sticky");
  assert.equal(
    state.headerTransform,
    "none",
    "Vertical sticking must be native",
  );
  assert.equal(
    state.innerScroll,
    0,
    "The document must own vertical scrolling",
  );
  assert(state.innerOverflow <= 1, "No nested vertical scroll region");
  assert(
    state.pageOverflow <= 1,
    "Horizontal scrolling stays inside the table",
  );
  assert(state.aligned, "Column headings and cells stay aligned");
  assert(Math.abs(state.genreHeadingLeft - state.genreBadgeLeft) < 1);
  assert.equal(await page.locator("table").count(), 1);
  assert.equal(await page.locator("thead").count(), 1);
  return state;
}

for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  if (engineName !== "both" && engineName !== name) continue;
  const browser = await engine.launch();
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1024, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      const page = await browser.newPage({
        ...(viewport.width === 390 ? devices["iPhone 13"] : {}),
        viewport,
      });
      try {
        // The fixture is public; this cookie bypasses Clerk's dev handshake.
        await page.context().addCookies([
          {
            name: "__clerk_db_jwt",
            value: "dev_browser_fake_jwt",
            url: baseURL,
          },
        ]);
        await page.goto(`${baseURL}/search/filters`, {
          waitUntil: "domcontentloaded",
          timeout: 120_000,
        });
        const tableToggle = page.getByRole("button", { name: "Table view" });
        await tableToggle.click();
        await page.locator("table tbody tr").first().waitFor();
        // Wait for the layout fade, not for scrolling to catch up.
        await page.waitForTimeout(500);
        await check(page);
        for (const y of [300, 450, 350, 150, 0]) {
          await check(page, y);
        }
        await page.locator("table").evaluate((table) => {
          let scroller = table.parentElement;
          while (!/auto|scroll/.test(getComputedStyle(scroller).overflowX)) {
            scroller = scroller.parentElement;
          }
          scroller.scrollLeft = 180;
        });
        await check(page, 350);
        await page.getByRole("button", { name: "Grid view" }).click();
        await page.locator("table").waitFor({ state: "detached" });
        await tableToggle.click();
        await page.locator("table tbody tr").first().waitFor();
        await page.waitForTimeout(500);
        await check(page);
        console.log(
          `PASS ${name} ${viewport.width}px: page scroll and heading alignment`,
        );
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
