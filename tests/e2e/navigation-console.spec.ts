import { expect, test, type Page } from "@playwright/test";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";

test.beforeAll(async () => {
  await clerkSetup();
});

function collectConsoleProblems(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) =>
    problems.push(`${page.url()}: ${error.message}`),
  );
  page.on("console", (message) => {
    // Clerk's development-key notice and browser autoplay notices are expected.
    // Include component warnings as well as exceptions: React reports key and
    // native-button mistakes as caught console errors rather than pageerrors.
    if (
      message.type() === "error" ||
      (message.type() === "warning" &&
        /Base UI:|Image with src/.test(message.text()))
    ) {
      problems.push(`${page.url()}: ${message.text()}`);
    }
  });
  return problems;
}

async function visit(page: Page, path: string) {
  await page.goto(path);
  await clerk.loaded({ page });
  await expect(page.locator("main")).toBeVisible();
  // Allow route fades, image loads, and deferred effects to report diagnostics.
  await page.waitForTimeout(750);
}

test("public navigation, search layouts, tools and editor controls keep the console clean", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await setupClerkTestingToken({ page });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          document.documentElement.dataset.wakeLockRequested = "true";
          throw new DOMException(
            "Wake Lock permission request denied",
            "NotAllowedError",
          );
        },
      },
    });
  });
  const problems = collectConsoleProblems(page);
  await visit(page, "/");
  await visit(page, "/explore");
  const contentRoutes: string[] = [];
  for (const prefix of ["/tab/", "/artist/", "/user/"]) {
    const href = await page
      .locator(`a[href^="${prefix}"]`)
      .first()
      .getAttribute("href");
    if (href) contentRoutes.push(href);
  }
  for (const path of contentRoutes) {
    await visit(page, path);
    if (path.startsWith("/tab/")) {
      await page.locator("#sectionIndex0").scrollIntoViewIfNeeded();
      await page.getByText("Practice", { exact: true }).click();
      const modal = page.locator(".playbackModalGradient");
      await expect(
        modal.getByRole("button", { name: "Close", exact: true }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute(
        "data-wake-lock-requested",
        "true",
      );
      await modal.getByRole("button", { name: "Close", exact: true }).click();
    }
  }

  await visit(page, "/search/filters");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page.getByRole("combobox", { name: "Genre", exact: true }).click();
  await page.getByRole("option", { name: "Rock", exact: true }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/genre=Rock/);

  await visit(page, "/tools");
  await page.locator('a[href="/tools/metronome"]').first().click();
  await expect(page).toHaveURL(/\/tools\/metronome$/);
  await page
    .getByRole("button", { name: "Speed Trainer", exact: true })
    .click();
  for (const slider of await page.getByRole("slider").all()) {
    if (await slider.isVisible()) {
      await slider.focus();
      await page.keyboard.press("ArrowRight");
    }
  }
  for (const path of [
    "/tools/warmups",
    "/tools/scales",
    "/tools/chord-trainer",
    "/tools/note-trainer",
    "/tuner",
    "/privacy",
  ])
    await visit(page, path);

  await visit(page, "/create");
  await page.getByRole("button", { name: "Speed", exact: true }).click();
  await expect(page.getByRole("slider")).not.toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Chords", exact: true }).click();
  await page
    .getByRole("button", { name: "Strumming patterns", exact: true })
    .click();
  await page.waitForTimeout(500);
  expect(problems).toEqual([]);
});

test("signed-in profile navigation and upload controls keep the console clean", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL,
    "Requires an existing onboarded test account",
  );
  await setupClerkTestingToken({ page });
  const problems = collectConsoleProblems(page);
  await visit(page, "/tools");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
  for (const path of [
    "/profile/settings",
    "/profile/statistics",
    "/profile/tabs/filters",
    "/profile/bookmarks/filters",
  ]) {
    await visit(page, path);
    if (path === "/profile/settings") {
      const upload = page.getByRole("button", { name: "Upload", exact: true });
      await expect(upload).toBeEnabled();
      const fileChooser = page.waitForEvent("filechooser");
      await upload.focus();
      await page.keyboard.press("Enter");
      await fileChooser;
    }
  }
  expect(problems).toEqual([]);
});
