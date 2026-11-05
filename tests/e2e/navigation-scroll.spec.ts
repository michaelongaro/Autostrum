import { expect, test } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

test.beforeAll(async () => {
  await clerkSetup();
});

for (const { name, viewport } of [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
]) {
  test.describe(name, () => {
    test.use({ viewport });
    test("fresh page navigation starts at the document top and history restores scrolling", async ({
      page,
    }) => {
      await setupClerkTestingToken({ page });
      await page.goto("/search/filters");
      const tabLink = page.locator('a[href^="/tab/"]').first();
      await expect(tabLink).toBeVisible();
      const tabPath = await tabLink.getAttribute("href");
      await page.evaluate(() =>
        window.scrollTo({ top: 80, behavior: "instant" }),
      );
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);
      await tabLink.click();
      await expect(page).toHaveURL((url) => url.pathname === tabPath);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

      await page.goBack();
      await expect(page).toHaveURL(/\/search\/filters$/);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);
      // Repeat the navigation after the tab route is already cached.
      await tabLink.click();
      await expect(page).toHaveURL((url) => url.pathname === tabPath);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

      await page.evaluate(() =>
        window.scrollTo({ top: 200, behavior: "instant" }),
      );
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);
      await page.goBack();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);
      await page.goForward();
      await expect(page).toHaveURL((url) => url.pathname === tabPath);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);

      await page.evaluate(() => {
        window.location.hash = "related-tabs";
      });
      await expect(page).toHaveURL(/#related-tabs$/);
      await expect(page.locator("#related-tabs")).toBeInViewport();
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(0);
    });
  });
}

test("other page links reset small offsets while search filter updates retain scrolling", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await page.goto("/tools");
  await expect(
    page.getByRole("heading", { name: "Guitar Tools", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 20, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(20);
  await page.locator('a[href="/tools/metronome"]').first().click();
  await expect(page).toHaveURL(/\/tools\/metronome$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goto("/search/filters");
  await expect(page.locator('a[href^="/tab/"]').first()).toBeVisible();
  await page.getByRole("combobox", { name: "Sort by", exact: true }).click();
  await page.getByRole("option", { name: "Oldest", exact: true }).click();
  // Stay within the scroll range of the temporary empty results shell, so
  // browser clamping during the fetch is distinct from a route scroll reset.
  await page.evaluate(() => window.scrollTo({ top: 40, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(40);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/sortBy=oldest/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(40);
});
