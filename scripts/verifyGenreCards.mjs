// Start npm run dev, then: node scripts/verifyGenreCards.mjs [baseURL]
// Hold hydration and genre counts separately to expose refresh-time flashes.
import assert from "node:assert/strict";
import { chromium, webkit, devices, expect } from "@playwright/test";
import superjson from "superjson";

const baseURL = process.argv[2] ?? "http://localhost:3000";

for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch();
  try {
    for (const layout of ["mobile", "desktop"]) {
      const context = await browser.newContext(
        layout === "mobile"
          ? devices["iPhone 13"]
          : { viewport: { width: 1440, height: 1000 } },
      );
      const page = await context.newPage();
      const errors = [];
      const apiRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (request.url().includes("/api/trpc/"))
          apiRequests.push(request.url());
      });

      try {
        for (const load of ["direct", "refresh"]) {
          let releaseScripts;
          let releaseCounts;
          const scriptsReady = new Promise((resolve) => {
            releaseScripts = resolve;
          });
          const countsReady = new Promise((resolve) => {
            releaseCounts = resolve;
          });
          await page.route("**/_next/static/chunks/**", async (route) => {
            if (route.request().resourceType() === "script") await scriptsReady;
            await route.continue();
          });
          await page.route(
            /\/api\/trpc\/[^?]*genre\.getAllWithTotalTabCount/,
            async (route) => {
              await countsReady;
              // Desktop search suggestions can share the same tRPC batch.
              const procedures = new URL(route.request().url()).pathname
                .split("/")
                .at(-1)
                .split(",");
              await route.fulfill({
                contentType: "application/json",
                body: JSON.stringify(
                  procedures.map((procedure) => {
                    assert(
                      [
                        "genre.getAllWithTotalTabCount",
                        "search.getMostPopularDailyTabsAndArtists",
                      ].includes(procedure),
                      `Unexpected batched query: ${procedure}`,
                    );
                    return {
                      result: {
                        data: superjson.serialize(
                          procedure === "genre.getAllWithTotalTabCount"
                            ? new Map([["Rock", 123]])
                            : { tabs: [], artists: [] },
                        ),
                      },
                    };
                  }),
                ),
              });
            },
          );

          try {
            if (load === "direct") {
              await page.goto(baseURL, {
                waitUntil: "commit",
                timeout: 90_000,
              });
            } else {
              await page.reload({ waitUntil: "commit", timeout: 90_000 });
            }
            const images = page.locator('img[alt$="genre thumbnail"]');
            await expect(images).toHaveCount(12);
            // Even with all application JS held back, the first row can paint.
            await expect
              .poll(() =>
                images.evaluateAll((elements) =>
                  elements
                    .slice(0, 4)
                    .every((img) => img.complete && img.naturalWidth > 0),
                ),
              )
              .toBe(true);

            const initial = await images.evaluateAll((elements) => {
              window.genreImageNodes = elements;
              window.genreOpacityDrops = [];
              window.checkGenreFrames = true;
              function inspect() {
                for (const img of elements) {
                  for (
                    let node = img.parentElement;
                    node;
                    node = node.parentElement
                  ) {
                    if (Number(getComputedStyle(node).opacity) !== 1) {
                      window.genreOpacityDrops.push(node.getAttribute("style"));
                    }
                  }
                }
                if (window.checkGenreFrames) requestAnimationFrame(inspect);
              }
              inspect();
              return elements.map((img) => ({
                src: img.getAttribute("src"),
                loading: img.loading,
                filter: getComputedStyle(img.parentElement).filter,
              }));
            });
            assert(initial.every((img) => img.filter === "none"));
            assert(initial.slice(0, 4).every((img) => img.loading === "eager"));
            assert(initial.slice(4).every((img) => img.loading === "lazy"));

            const queryStarted = page.waitForRequest((request) =>
              request.url().includes("genre.getAllWithTotalTabCount"),
            );
            releaseScripts();
            await queryStarted;
            releaseCounts();
            const rock = images.first().locator("..");
            await expect(rock).toContainText("123 tabs");
            await page.evaluate(
              () =>
                new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                ),
            );

            const final = await images.evaluateAll((elements) => {
              window.checkGenreFrames = false;
              return {
                sameNodes: elements.every(
                  (img, index) => img === window.genreImageNodes[index],
                ),
                sources: elements.map((img) => img.getAttribute("src")),
                opacityDrops: window.genreOpacityDrops,
              };
            });
            assert(
              final.sameNodes,
              "Hydration/counts must preserve the image elements",
            );
            assert.deepEqual(
              final.sources,
              initial.map((img) => img.src),
            );
            assert.deepEqual(
              final.opacityDrops,
              [],
              "Cards must stay opaque through hydration and count updates",
            );
            console.log(
              `${browserType.name()} ${layout} ${load}: visible before JS; images stable through hydration/counts`,
            );
          } catch (error) {
            console.error(`${browserType.name()} ${layout} ${load}`, {
              errors,
              apiRequests,
            });
            throw error;
          } finally {
            releaseScripts();
            releaseCounts();
            await page.unrouteAll({ behavior: "wait" });
          }
        }

        // Preserve keyboard navigation while removing the card's motion wrapper.
        await page
          .locator('img[alt="Rock genre thumbnail"]')
          .locator("..")
          .focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/search\/filters\?genre=Rock$/);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
