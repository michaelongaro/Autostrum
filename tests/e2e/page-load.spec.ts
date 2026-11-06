import { expect, test } from "@playwright/test";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";

test.beforeAll(async () => {
  await clerkSetup();
});

test("resolving authentication preserves the page that has already faded in", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL,
    "Requires an existing onboarded E2E_CLERK_USER_EMAIL account",
  );
  await setupClerkTestingToken({ page });
  await page.goto("/tools");
  await clerk.loaded({ page });
  const content = page.locator("main > div.baseVertFlex");
  await content.evaluate((element) => {
    element.setAttribute("data-page-instance", "guest");
  });
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
  });
  // A real sign-in must still remount the query provider to drop private caches.
  await expect(content).not.toHaveAttribute("data-page-instance", "guest");

  for (const load of ["direct", "refresh", "navigation"] as const) {
    await test.step(load, async () => {
      let releaseAuth!: () => void;
      const authReady = new Promise<void>((resolve) => {
        releaseAuth = resolve;
      });
      // Let the first fade finish before Clerk resolves the signed-in user.
      // This exposes remounts even when normal auth loads too quickly to see.
      await page.route("**/clerk.browser.js", async (route) => {
        await authReady;
        await route.continue();
      });

      try {
        if (load === "refresh") {
          await page.reload({ waitUntil: "commit" });
        } else {
          await page.goto("/tools", { waitUntil: "commit" });
        }

        if (load === "navigation") {
          await page.locator('a[href="/tools/metronome"]').first().click();
          await expect(page).toHaveURL(/\/tools\/metronome$/);
        }

        await expect(content).toHaveCSS("opacity", "1");
        expect(await page.evaluate(() => !!window.Clerk?.loaded)).toBe(false);
        await content.evaluate((element) => {
          element.setAttribute("data-page-instance", "original");
        });
        releaseAuth();
        await page.waitForFunction(
          () => window.Clerk?.loaded && !!window.Clerk.user,
        );
        // Allow auth context updates to commit before checking DOM identity.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              );
            }),
        );
        await expect(content).toHaveAttribute("data-page-instance", "original");
      } finally {
        releaseAuth();
        await page.unroute("**/clerk.browser.js");
      }
    });
  }
});
