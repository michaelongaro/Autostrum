// With the dev server running: node scripts/verifyStaticTabHeader.mjs [baseURL]
// Uses the dev fixture and mocked metadata; no tab or page-view writes.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
for (const [engineName, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext();
    await context.addCookies([
      { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
    ]);
    await context.route("**/api/trpc/**", (route) => {
      const url = new URL(route.request().url());
      const results = url.pathname
        .split("/")
        .at(-1)
        .split(",")
        .map((name) => ({
          result: {
            data: {
              json:
                name === "tab.getRatingBookmarkAndViewCount"
                  ? {
                      averageRating: 4.5,
                      ratingsCount: 12,
                      userRating: null,
                      bookmarked: false,
                      pageViews: 42,
                    }
                  : null,
            },
          },
        }));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          url.searchParams.get("batch") === "1" ? results : results[0],
        ),
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/dev-virtualization-harness?fixture=huge`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .locator('#devVirtualizationHarness[data-ready="true"]')
      .waitFor();
    await page.getByRole("button", { name: "Rate toggle" }).waitFor();
    for (const [title, artistName] of [
      ["Wish You Were Here", "Pink Floyd"],
      [
        "A long song title that should wrap without squeezing the actions",
        "An artist with a particularly long name",
      ],
      ["UnbrokenSongTitle".repeat(6), "UnbrokenArtistName".repeat(6)],
    ]) {
      await page.evaluate(
        ({ title, artistName }) => {
          const store = window.__AUTOSTRUM_GET_TAB_STORE__();
          store.setTitle(title);
          store.setArtistName(artistName);
          store.setArtistId(1);
        },
        { title, artistName },
      );
      for (const width of [390, 640, 767, 768, 820, 1023, 1024, 1280, 1536]) {
        await page.setViewportSize({ width, height: 700 });
        // Match the real tab page's container, rather than the full-width harness.
        await page.evaluate(() => {
          document.querySelector("#devVirtualizationHarness").style.width =
            innerWidth >= 1536 ? "70%" : innerWidth >= 768 ? "85%" : "100%";
        });
        await page.waitForFunction(() => {
          const header = document.querySelector(
            "#mainTabComponent > div > div",
          );
          return !!header?.querySelector(
            innerWidth >= 1024
              ? ".flex-wrap.items-baseline, [class*='!items-baseline']"
              : ".relative",
          );
        });
        const header = page.locator("#mainTabComponent > div > div").first();
        const geometry = await header.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const title = element
            .querySelector(".font-bold")
            .getBoundingClientRect();
          const actions = [
            ...element.querySelectorAll("button[aria-label]"),
          ].map((button) => button.getBoundingClientRect());
          return {
            overflow: element.scrollWidth - element.clientWidth,
            pageOverflow: document.documentElement.scrollWidth - innerWidth,
            titleHeight: title.height,
            contained: actions.every(
              (r) =>
                r.width >= 39 &&
                r.left >= bounds.left &&
                r.right <= bounds.right + 1 &&
                r.bottom <= bounds.bottom + 1,
            ),
            separateRows: actions.every((r) => r.top >= title.bottom),
            nonOverlapping: actions.every((r, i) =>
              actions.every(
                (other, j) =>
                  i === j ||
                  r.right <= other.left + 1 ||
                  r.left >= other.right - 1 ||
                  r.bottom <= other.top + 1 ||
                  r.top >= other.bottom - 1,
              ),
            ),
          };
        });
        assert(
          geometry.overflow <= 1 && geometry.pageOverflow <= 1,
          JSON.stringify({ width, title, geometry }),
        );
        assert(
          geometry.contained && geometry.nonOverlapping,
          JSON.stringify({ width, title, geometry }),
        );
        if (width < 1024)
          assert(
            geometry.separateRows,
            "Actions sit below the title before lg",
          );
        if (title === "Wish You Were Here" && width >= 640)
          assert(
            geometry.titleHeight < 40,
            "A normal title must not be squeezed into multiple lines",
          );
        console.log(`PASS ${engineName} ${width}px ${title.slice(0, 24)}`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
