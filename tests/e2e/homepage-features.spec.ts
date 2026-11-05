import { expect, test } from "@playwright/test";

test("Compose keeps the homepage visible and preserves scrolling while its demo loads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });

  const heading = page.getByRole("heading", { name: "Features you'll love" });
  const compose = page.getByRole("button", { name: "Compose", exact: true });
  await compose.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => {
    document.documentElement.dataset.composeCheck = "preserved";
    return window.scrollY;
  });

  // Hold newly requested chunks to exercise a cold, slow dynamic import.
  // Matching all chunks also works when production filenames are hashed.
  let releaseChunks!: () => void;
  const chunksReady = new Promise<void>((resolve) => {
    releaseChunks = resolve;
  });
  await page.route("**/_next/static/chunks/**", async (route) => {
    await chunksReady;
    await route.continue();
  });
  try {
    const chunkRequested = page.waitForRequest(
      (request) =>
        request.resourceType() === "script" &&
        request.url().includes("/_next/static/chunks/"),
    );
    await compose.click();
    await chunkRequested;

    await expect(heading).toBeVisible();
    await expect(compose).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#feature-panel-hotkeys")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
    await expect(page.locator("html")).toHaveAttribute(
      "data-compose-check",
      "preserved",
    );
  } finally {
    releaseChunks();
    await page.unrouteAll({ behavior: "wait" });
  }

  // The lazy glossary still works after the chunk finishes loading.
  await page
    .locator("#feature-panel-hotkeys")
    .getByRole("button", { name: "Note lengths", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Glossary", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Modifier Glossary" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(page.locator("#feature-panel-zoom")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
  expect(errors).toEqual([]);
});
