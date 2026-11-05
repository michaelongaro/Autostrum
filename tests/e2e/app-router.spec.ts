import { expect, test } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

test.beforeAll(async () => {
  await clerkSetup();
});

test("App Router links, history, and direct loads preserve route metadata", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tools");
  await expect(page).toHaveTitle("Tools | Autostrum");
  // A document-scoped value distinguishes an App Router transition from a reload.
  await page.evaluate(() => {
    document.documentElement.dataset.navigationCheck = "preserved";
  });
  await page.locator('a[href="/tools/metronome"]').first().click();
  await expect(page).toHaveURL(/\/tools\/metronome$/);
  await expect(
    page.getByRole("heading", { name: "Metronome", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Metronome | Autostrum");
  await expect(page.locator("html")).toHaveAttribute(
    "data-navigation-check",
    "preserved",
  );
  await page.goBack();
  await expect(page).toHaveTitle("Tools | Autostrum");
  await page.goForward();
  await expect(page).toHaveTitle("Metronome | Autostrum");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Metronome", exact: true }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/tools\/metronome$/,
  );
  expect(errors).toEqual([]);
});

test("Route Handlers preserve validation, method restrictions, and authentication", async ({
  request,
}) => {
  const invalidImage = await request.get(
    "/api/getTabScreenshot/not-an-id/light",
  );
  expect(invalidImage.status()).toBe(400);
  expect(invalidImage.headers()["cache-control"]).toBe("no-store");
  const invalidMask = await request.get(
    "/api/getTabScreenshotMasks/1?v=invalid",
  );
  expect(invalidMask.status()).toBe(400);
  const wrongMethod = await request.post("/api/getTabScreenshot/1/light");
  expect(wrongMethod.status()).toBe(405);
  const cron = await request.get("/api/crons/weekly");
  expect(cron.status()).toBe(401);
  const privateQuery = await request.get("/api/trpc/draft.list", {
    params: { input: JSON.stringify({ json: { ownerId: "guest" } }) },
  });
  expect(privateQuery.status()).toBe(401);
  const profile = await request.get("/profile/settings", { maxRedirects: 0 });
  expect([302, 303, 307]).toContain(profile.status());
});

test("search parameters round-trip percent signs and reserved characters", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search/filters?search=100%25%20%26%20space&genre=Rock");
  const search = page.getByPlaceholder("Search for your favorite songs...");
  await expect(search).toHaveValue("100% & space");
  await search.fill("new 50% & song");
  await search.press("Enter");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("search"))
    .toBe("new 50% & song");
  await page.reload();
  await expect(search).toHaveValue("new 50% & song");
  expect(errors).toEqual([]);
});
