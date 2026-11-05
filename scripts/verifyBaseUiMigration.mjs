// Start npm run dev, then: node scripts/verifyBaseUiMigration.mjs [baseURL] [chromium|webkit]
// Exercises local fixtures only; does not create remote users or tabs.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "chromium";
assert.ok(["chromium", "webkit"].includes(engine));
const browser = await (engine === "webkit" ? webkit : chromium).launch();
try {
  for (const viewport of [
    { width: 1280, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([
      { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
    ]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/dev-base-ui-harness`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const fixture = page.getByTestId("base-ui-harness");
    await fixture.waitFor({ state: "visible" });
    // WebKit installations without Web Audio log a caught initialization error.
    // Next's development overlay then blocks pointer input. This fixture tests
    // UI primitives only; keep development chrome out of hit testing.
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    assert.equal(
      await fixture.locator("button button, button a, a button").count(),
      0,
      "render composition has no nested interactive elements",
    );
    assert.equal(
      await fixture.getByRole("link", { name: "Link button" }).count(),
      1,
    );

    const accordion = fixture.getByRole("button", { name: "Expand details" });
    await accordion.click();
    await page
      .getByText("Accordion details", { exact: true })
      .waitFor({ state: "visible" });
    assert.equal(await accordion.getAttribute("aria-expanded"), "true");
    await accordion.click();
    await page
      .getByText("Accordion details", { exact: true })
      .waitFor({ state: "hidden" });

    const select = fixture.getByRole("combobox", { name: "Fixture select" });
    assert.equal(
      (await select.innerText()).trim(),
      "Option 0",
      "label is available before popup mount",
    );
    await select.focus();
    await page.keyboard.press("ArrowDown");
    await page.getByRole("listbox").waitFor();
    await page.keyboard.press("End");
    const last = page.getByRole("option", { name: "Option 29", exact: true });
    await last.waitFor();
    const box = await last.boundingBox();
    const listBox = await page.getByRole("listbox").boundingBox();
    assert.ok(
      box.y >= listBox.y &&
        box.y + box.height <= listBox.y + listBox.height + 1,
      "keyboard navigation scrolls the final option into view",
    );
    await page.keyboard.press("Enter");
    await page.getByRole("listbox").waitFor({ state: "hidden" });
    assert.equal((await select.innerText()).trim(), "Option 29");

    const checkbox = fixture.getByRole("checkbox", {
      name: "Fixture checkbox",
      exact: true,
    });
    await fixture.getByText("Fixture checkbox", { exact: true }).click();
    assert.equal(
      await checkbox.isChecked(),
      true,
      "native label activates checkbox",
    );
    assert.equal(
      await fixture
        .getByRole("checkbox", { name: "Disabled checkbox" })
        .isDisabled(),
      true,
    );
    const switchControl = fixture.getByRole("switch", {
      name: "Fixture switch",
    });
    const switchBox = await switchControl.boundingBox();
    assert.equal(switchBox.width, 50);
    assert.equal(switchBox.height, 24);
    await switchControl.click();
    assert.equal(await switchControl.isChecked(), true);
    await fixture.getByRole("button", { name: "Fixture toggle" }).click();
    assert.equal(
      await fixture
        .getByRole("button", { name: "Fixture toggle" })
        .getAttribute("aria-pressed"),
      "true",
    );

    const tooltip = fixture.getByRole("button", { name: "Tooltip target" });
    await tooltip.hover();
    await page.getByText("Fixture tooltip", { exact: true }).waitFor();
    await page.mouse.move(0, 0);
    await page.keyboard.press("Escape");

    const popoverTrigger = fixture.getByRole("button", {
      name: "Open popover",
    });
    await popoverTrigger.click();
    const popover = page.getByRole("dialog");
    await popover.waitFor();
    const popupBox = await popover.boundingBox();
    assert.ok(
      popupBox.x >= 0 && popupBox.x + popupBox.width <= viewport.width,
      "popover fits viewport",
    );
    await page.keyboard.press("Escape");
    await popover.waitFor({ state: "hidden" });
    assert.equal(
      await popoverTrigger.evaluate((el) => el === document.activeElement),
      true,
      "popover restores trigger focus",
    );

    const menuTrigger = fixture.getByRole("button", { name: "Open menu" });
    await menuTrigger.click();
    await page
      .getByRole("menuitem", { name: "Run action", exact: true })
      .click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    assert.equal(
      await fixture.getByRole("status", { name: "Action count" }).innerText(),
      "1",
    );
    await menuTrigger.click();
    await page.getByRole("menuitem", { name: "More actions" }).hover();
    await page
      .getByRole("menuitem", { name: "Nested action", exact: true })
      .click();
    assert.equal(
      await fixture.getByRole("status", { name: "Action count" }).innerText(),
      "2",
    );
    await menuTrigger.click();
    await page.getByRole("menuitemradio", { name: "Radio B" }).click();
    assert.equal(
      await page
        .getByRole("menuitemradio", { name: "Radio B" })
        .getAttribute("aria-checked"),
      "true",
    );
    await page.keyboard.press("Escape");

    await fixture
      .getByRole("button", { name: "Open note length menu" })
      .click();
    await page.getByRole("menuitem").first().click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    assert.equal(
      await fixture
        .getByRole("status", { name: "Selected note length" })
        .innerText(),
      "whole",
    );

    const dialogTrigger = fixture.getByRole("button", { name: "Open dialog" });
    await dialogTrigger.click();
    const dialog = page.getByRole("dialog", { name: "Fixture dialog" });
    await dialog.waitFor();
    await dialog.getByRole("combobox", { name: "Nested select" }).click();
    await page.getByRole("option", { name: "Beta", exact: true }).click();
    assert.equal(
      await dialog.isVisible(),
      true,
      "select portal does not dismiss its dialog",
    );
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await dialogTrigger.evaluate((el) => el === document.activeElement),
      true,
      "dialog restores trigger focus",
    );

    await fixture.getByRole("button", { name: "Open alert" }).click();
    const alert = page.getByRole("alertdialog", { name: "Fixture alert" });
    await alert.waitFor();
    await page.mouse.click(2, 2);
    assert.equal(await alert.isVisible(), true, "alert ignores outside press");
    await alert.getByRole("button", { name: "Cancel action" }).click();
    await alert.waitFor({ state: "hidden" });
    await fixture.getByRole("button", { name: "Open alert" }).click();
    await alert.getByRole("button", { name: "Confirm action" }).click();
    await alert.waitFor({ state: "hidden" });
    assert.equal(
      await fixture.getByRole("status", { name: "Action count" }).innerText(),
      "3",
    );
    const drawerTrigger = fixture.getByRole("button", {
      name: "Open drawer",
      exact: true,
    });
    await drawerTrigger.click();
    const drawer = page.getByRole("dialog", { name: "Fixture drawer" });
    await drawer.waitFor();
    await drawer.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map((a) => a.finished.catch(() => {})),
      );
    });
    const drawerBox = await drawer.boundingBox();
    assert.ok(
      Math.abs(drawerBox.width - Math.min(448, viewport.width - 16)) < 1,
      "drawer keeps its original width and side margins",
    );
    assert.ok(
      Math.abs(drawerBox.y + drawerBox.height - (viewport.height - 8)) < 1,
      "drawer keeps its 8px bottom inset",
    );
    await drawer.getByRole("combobox", { name: "Drawer select" }).click();
    await page.getByRole("option", { name: "Beta", exact: true }).click();
    assert.equal(
      await drawer.isVisible(),
      true,
      "nested select does not dismiss drawer",
    );
    async function swipeDrawer() {
      const handle = await drawer
        .locator('[data-slot="drawer-swipe-handle"]')
        .boundingBox();
      const x = handle.x + handle.width / 2;
      const y = handle.y + handle.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(
        x,
        Math.min(viewport.height - 1, y + drawerBox.height),
        { steps: 15 },
      );
      await page.mouse.up();
    }
    await drawer.getByText("Lock swipe", { exact: true }).click();
    await swipeDrawer();
    assert.equal(
      await drawer.isVisible(),
      true,
      "locked drawer ignores swipes",
    );
    await drawer.getByText("Lock swipe", { exact: true }).click();
    await swipeDrawer();
    await drawer.waitFor({ state: "hidden" });
    await drawerTrigger.click();
    await drawer.waitFor();
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    assert.equal(
      await drawerTrigger.evaluate((el) => el === document.activeElement),
      true,
      "drawer returns focus",
    );

    assert.deepEqual(errors, [], "no runtime errors");
    console.log(
      `PASS ${engine} ${viewport.width}px: labels, keyboard scroll, controls, tooltip, popover, menus, nested dialog, alert, drawer swipes and focus return`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
