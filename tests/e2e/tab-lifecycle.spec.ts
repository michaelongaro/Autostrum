import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/client";

// A unique title and the authenticated owner scope every lookup and cleanup.
const title = `E2E tab ${randomUUID()}`;
let db: PrismaClient;
let ownerId: string | undefined;

test.beforeAll(async () => {
  for (const name of [
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "E2E_CLERK_USER_EMAIL",
  ]) {
    if (!process.env[name]) throw new Error(`Missing E2E environment: ${name}`);
  }

  await clerkSetup();
  db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 15_000,
    }),
  });
});

test.afterEach(async ({ page, baseURL }) => {
  if (!db || !ownerId) return;

  // Use the authenticated app API for fallback cleanup so counters, caches,
  // and screenshot deletion follow the same path as a normal deletion.
  // This never substitutes for the UI deletion or its assertions below.
  const leftovers = await db.tab.findMany({
    where: { title, createdByUserId: ownerId },
    select: { id: true },
  });
  for (const tab of leftovers) {
    const response = await page.request.post(
      new URL("/api/trpc/tab.delete", baseURL).href,
      { data: { json: tab.id }, timeout: 30_000 },
    );
    expect(response.ok(), `Cleanup failed for test tab ${tab.id}`).toBe(true);
  }
  await expect
    .poll(() => db.tab.count({ where: { title, createdByUserId: ownerId } }))
    .toBe(0);

  // Stop the editor before removing only this run's draft recovery records.
  await page.goto("/");
  await db.tabDraft.deleteMany({ where: { title, ownerId } });
});

test.afterAll(async () => {
  await db?.$disconnect();
});

test("publish a tab, verify persistence, delete it, verify removal", async ({
  page,
}) => {
  console.info(`Tab lifecycle fixture: ${title}`);

  await test.step("Sign in to the existing, onboarded test account", async () => {
    await page.goto("/");
    await clerk.signIn({
      page,
      emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
    });
    ownerId = await page.evaluate(() => window.Clerk?.user?.id);
    expect(
      ownerId,
      "Clerk did not establish an authenticated user",
    ).toBeTruthy();
    const user = await db.user.findUnique({ where: { userId: ownerId! } });
    expect(
      user,
      "Complete Autostrum's username setup for E2E_CLERK_USER_EMAIL first. " +
        "DATABASE_URL must point to the database used by E2E_BASE_URL.",
    ).not.toBeNull();
  });

  await test.step("Create and publish through the editor", async () => {
    await page.goto("/create");
    await page.getByLabel("Title *", { exact: true }).fill(title);
    await page.getByLabel("Genre", { exact: false }).click();
    await page.getByRole("option", { name: "Rock", exact: true }).click();
    await page.getByLabel("Tempo", { exact: false }).fill("120");

    const addTabBlock = page.getByRole("button", {
      name: "Tab block",
      exact: true,
    });
    await addTabBlock.click();
    // Stable input ID: section 0, block 0, column 0, first string.
    await page.locator("#input-0-0-0-1").fill("3");
    // Compilation updates the editor's nonempty/publishable state asynchronously.
    await expect(
      page.getByRole("button", { name: "Play/Pause", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page).toHaveURL(/\/tab\/\d+\/(?!edit(?:\?|$))/);
  });

  const tabId = Number(new URL(page.url()).pathname.split("/")[2]);
  expect(Number.isSafeInteger(tabId) && tabId > 0).toBe(true);

  await test.step("Verify the uploaded tab directly in PostgreSQL", async () => {
    await expect
      .poll(async () => {
        const tab = await db.tab.findUnique({ where: { id: tabId } });
        return tab
          ? {
              title: tab.title,
              ownerId: tab.createdByUserId,
              bpm: tab.bpm,
              genre: tab.genre,
            }
          : null;
      })
      .toEqual({ title, ownerId, bpm: 120, genre: "Rock" });
    const tab = await db.tab.findUniqueOrThrow({ where: { id: tabId } });
    expect(JSON.stringify(tab.tabData)).toContain('"firstString":"3"');
    // A reload also exercises the published page's database read path.
    await page.reload();
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  });

  await test.step("Delete through the editor confirmation dialog", async () => {
    await page.goto(`/tab/${tabId}/edit`);
    await page
      .getByRole("button", {
        name: "Miscellaneous tab actions dropdown trigger",
      })
      .click();
    await page.getByRole("menuitem", { name: "Delete tab" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page).toHaveURL(/\/create(?:\?|$)/);
  });

  await test.step("Verify the tab no longer exists in PostgreSQL", async () => {
    await expect
      .poll(() => db.tab.findUnique({ where: { id: tabId } }))
      .toBeNull();
  });
});
