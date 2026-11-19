import { expect, test } from "@playwright/test";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";

test.beforeAll(async () => {
  await clerkSetup();
});

for (const signedIn of [false, true]) {
  test(`homepage stays visible through hydration when signed ${signedIn ? "in" : "out"}`, async ({
    page,
  }) => {
    test.skip(
      signedIn && !process.env.E2E_CLERK_USER_EMAIL,
      "Requires an existing onboarded E2E_CLERK_USER_EMAIL account",
    );
    await setupClerkTestingToken({ page });
    if (signedIn) {
      await page.goto("/tools");
      await clerk.loaded({ page });
      await clerk.signIn({
        page,
        emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
      });
    }

    let releaseScripts!: () => void;
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route("**/_next/static/chunks/**", async (route) => {
      if (route.request().resourceType() === "script") await scriptsReady;
      await route.continue();
    });

    try {
      await page.goto("/", { waitUntil: "commit" });
      const header = page.locator("#desktopHeader");
      const preview = page.locator(
        ".heroScreenshotStage:not(.heroScreenshotMobile)",
      );
      const explore = page.getByRole("link", { name: "Explore tabs" });
      await expect(header).toBeVisible();
      await expect(preview).toBeVisible();
      await expect(explore).toHaveCSS("height", "40px");

      const stableHomepage = await preview.evaluateHandle((frame) => {
        const header = document.getElementById("desktopHeader")!;
        const width = frame.getBoundingClientRect().width;
        const stageWidth = frame.parentElement!.getBoundingClientRect().width;
        const result = { width, stageWidth, stable: true, recording: true };
        function checkFrame() {
          result.stable &&=
            frame.isConnected &&
            header.isConnected &&
            header.getBoundingClientRect().height === 64 &&
            Math.abs(frame.getBoundingClientRect().width - width) < 1;
          if (result.recording) requestAnimationFrame(checkFrame);
        }
        checkFrame();
        return result;
      });
      expect(
        await stableHomepage.evaluate(({ width, stageWidth }) =>
          Math.abs(width - stageWidth),
        ),
      ).toBeLessThan(1);

      releaseScripts();
      await expect(
        header.getByRole("button", {
          name: signedIn ? "Account menu" : "Sign in",
        }),
      ).toBeVisible();
      await expect(explore).toHaveCSS("height", "40px");
      expect(
        await stableHomepage.evaluate((result) => {
          result.recording = false;
          return result.stable;
        }),
      ).toBe(true);
    } finally {
      releaseScripts();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
}

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
