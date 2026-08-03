// Verify that opening a Framer modal locks document scroll, including when
// wheeling over the modal panel itself.
//
// Usage: node scripts/verifyModalScrollLock.mjs [baseURL]

import { chromium } from "playwright";

const BASE = process.argv[2] ?? ("http://" + "127.0.0.1" + ":3000");
const failures = [];

function assert(condition, message) {
  if (condition) console.log(`  PASS  ${message}`);
  else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "4000px";
    document.body.appendChild(spacer);
    window.scrollTo(0, 500);
  });
  await page.waitForTimeout(200);

  const startY = await page.evaluate(() => window.scrollY);
  assert(startY >= 450, `page scrolled before modal (scrollY=${startY})`);

  await page.getByText("Section progression").first().click();
  await page.waitForTimeout(400);
  await page
    .getByLabel("Section progression")
    .getByRole("button", { name: "Add section" })
    .click();
  await page.waitForTimeout(700);

  const lockState = await page.evaluate(() => ({
    modal: !!document.querySelector(".modalGradient"),
    htmlHasLock: document.documentElement.classList.contains("modalScrollLock"),
    htmlOverflow: getComputedStyle(document.documentElement).overflowY,
    bodyOverflow: getComputedStyle(document.body).overflowY,
    headerPosition: getComputedStyle(
      document.getElementById("desktopHeader") ?? document.body,
    ).position,
    audioPosition: getComputedStyle(
      document.getElementById("audioControls") ?? document.body,
    ).position,
  }));
  console.log("  lockState:", lockState);
  assert(lockState.modal, "modal panel visible");
  assert(lockState.htmlHasLock, "html.modalScrollLock class applied");
  assert(
    lockState.htmlOverflow === "hidden",
    `html overflow hidden (got ${lockState.htmlOverflow})`,
  );
  assert(
    lockState.headerPosition === "fixed",
    `desktop header pinned fixed while locked (got ${lockState.headerPosition})`,
  );
  assert(
    lockState.audioPosition === "fixed",
    `audio controls pinned fixed while locked (got ${lockState.audioPosition})`,
  );

  const before = await page.evaluate(() => window.scrollY);
  const box = await page.evaluate(() => {
    const panel = document.querySelector(".modalGradient");
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  assert(Boolean(box), "modal box found");

  if (box) {
    await page.mouse.move(box.x, box.y);
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(20);
    }
  }
  const afterInner = await page.evaluate(() => window.scrollY);
  assert(
    Math.abs(afterInner - before) <= 1,
    `wheel inside modal keeps scrollY (before=${before}, after=${afterInner})`,
  );

  await page.mouse.move(12, 300);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(20);
  }
  const afterBackdrop = await page.evaluate(() => window.scrollY);
  assert(
    Math.abs(afterBackdrop - before) <= 1,
    `wheel on backdrop keeps scrollY (before=${before}, after=${afterBackdrop})`,
  );

  // Close modal and confirm scrolling works again
  await page
    .locator(".modalGradient")
    .getByRole("button")
    .filter({ has: page.locator("svg") })
    .first()
    .click();
  await page.waitForTimeout(600);
  const unlocked = await page.evaluate(() => ({
    htmlHasLock: document.documentElement.classList.contains("modalScrollLock"),
    modal: !!document.querySelector(".modalGradient"),
  }));
  assert(!unlocked.modal, "modal closed");
  assert(!unlocked.htmlHasLock, "modalScrollLock removed after close");

  const yBeforeUnlockScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.move(400, 400);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(20);
  }
  const yAfterUnlockScroll = await page.evaluate(() => window.scrollY);
  assert(
    yAfterUnlockScroll > yBeforeUnlockScroll + 50,
    `page scrolls again after close (${yBeforeUnlockScroll} -> ${yAfterUnlockScroll})`,
  );

  // Guard the Mac false-positive that used to skip locking on desktop Chrome.
  const iosCheck = await page.evaluate(() => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const iOS = /iP(ad|hone|od)/.test(ua);
    const badMacTouch = /Macintosh/.test(ua) && typeof null !== "undefined";
    const goodMacTouch =
      /Macintosh/.test(ua) &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1;
    return {
      badWouldSkip: iOS || badMacTouch,
      goodWouldSkip: iOS || goodMacTouch,
      maxTouchPoints: navigator.maxTouchPoints,
    };
  });
  console.log("  iosCheck:", iosCheck);
  assert(iosCheck.badWouldSkip === true, "documents old false-positive exists");
  assert(
    iosCheck.goodWouldSkip === false,
    "fixed isIOS does not skip desktop Mac Chrome",
  );

  await browser.close();

  console.log(
    `\n${failures.length ? "FAILED" : "OK"} (${failures.length} failures)`,
  );
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
