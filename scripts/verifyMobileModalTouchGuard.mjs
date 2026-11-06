// No server or remote data needed. Runs the actual guard against browser DOM,
// scroll geometry, event cancellation, nested portals, and ref-style cleanup.
// node scripts/verifyMobileModalTouchGuard.mjs [chromium|webkit] [baseURL]
// An optional running dev app also checks the actual Dialog/Drawer wrappers.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { chromium, webkit } from "playwright";

const engine = process.argv[2] ?? "chromium";
assert.ok(["chromium", "webkit"].includes(engine));
const source = ts.transpileModule(
  await readFile(
    new URL("../src/utils/modalTouchGuard.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const browser = await (engine === "webkit" ? webkit : chromium).launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width">
    <style>
      body { margin: 0; min-height: 5000px; }
      .scroller { height: 80px; width: 160px; overflow: auto; }
      .tall { height: 400px; }
    </style>
    <div id="background" class="scroller"><div class="tall"></div></div>
    <div id="portal" data-base-ui-portal style="position:fixed;inset:0">
      <div id="backdrop"></div>
      <div id="popup">
        <div id="outer" class="scroller"><div class="tall">
          <div id="inner" class="scroller"><div class="tall" id="target"></div></div>
        </div></div>
        <div id="horizontal" style="width:100px;overflow-x:auto"><div style="width:400px;height:20px"></div></div>
        <input id="range" type="range">
      </div>
      <div data-base-ui-portal id="select-portal"><div id="options" class="scroller"><div class="tall"></div></div></div>
    </div>`);
  const results = await page.evaluate(async (moduleSource) => {
    const { registerModalTouchGuard } = await import(
      `data:text/javascript;base64,${btoa(moduleSource)}`
    );
    const checks = [];
    function check(value, message) {
      if (!value) throw new Error(message);
      checks.push(message);
    }
    const el = (id) => document.getElementById(id);
    const event = (target, type, points, cancelable = true) => {
      const e = new Event(type, { bubbles: true, cancelable });
      Object.defineProperty(e, "touches", {
        value: points.map(([x, y], identifier) => ({
          clientX: x,
          clientY: y,
          identifier,
        })),
      });
      target.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const move = (target, dx = 0, dy = 20) => {
      event(target, "touchstart", [[100, 100]]);
      return event(target, "touchmove", [[100 - dx, 100 - dy]]);
    };
    const wheel = (target, dx, dy, ctrlKey = false) => {
      const e = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaX: dx,
        deltaY: dy,
        ctrlKey,
      });
      target.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const styles = () => [
      document.body.style.cssText,
      document.documentElement.style.cssText,
    ];
    window.scrollTo(0, 300);
    const initialStyles = JSON.stringify(styles());
    const initialScroll = window.scrollY;
    const remove = registerModalTouchGuard(el("popup"));
    check(
      JSON.stringify(styles()) === initialStyles &&
        window.scrollY === initialScroll,
      "registration preserves document styles and scroll position",
    );
    check(move(el("background")), "background scrollers are blocked");
    check(move(el("backdrop")), "backdrop swipes are blocked");
    check(
      wheel(el("background"), 0, 20),
      "background wheel scrolling is blocked",
    );
    check(
      !wheel(el("background"), 0, 20, true),
      "trackpad zoom remains available",
    );

    el("inner").scrollTop = 50;
    check(!move(el("target")), "inner scrolling is allowed");
    check(!move(el("target"), 0, -20), "inner reverse scrolling is allowed");
    el("inner").scrollTop = 0;
    check(move(el("target"), 0, -20), "top edge cannot chain to the document");
    el("outer").scrollTop = 50;
    check(
      !move(el("target"), 0, -20),
      "an exhausted inner scroller can scroll its parent",
    );
    el("outer").scrollTop = 1000;
    el("inner").scrollTop = 1000;
    check(move(el("target")), "bottom edge cannot chain to the document");
    el("horizontal").scrollLeft = 50;
    check(
      !move(el("horizontal").firstElementChild, 20, 0),
      "horizontal scrolling is allowed",
    );
    el("horizontal").scrollLeft = 1000;
    check(
      move(el("horizontal").firstElementChild, 20, 0),
      "horizontal edge is blocked",
    );
    check(!move(el("range"), 20, 0), "native range input can be dragged");
    check(!move(el("options")), "portaled select options can scroll");
    check(
      move(el("options"), 0, -20),
      "portaled select edges cannot scroll the page",
    );
    event(el("backdrop"), "touchstart", [
      [100, 100],
      [150, 150],
    ]);
    check(
      !event(el("backdrop"), "touchmove", [
        [90, 90],
        [160, 160],
      ]),
      "pinch zoom is preserved",
    );
    event(el("backdrop"), "touchstart", [[100, 100]]);
    check(
      !event(el("backdrop"), "touchmove", [[100, 80]], false),
      "non-cancelable moves are tolerated",
    );

    const nestedPortal = document.createElement("div");
    nestedPortal.setAttribute("data-base-ui-portal", "");
    nestedPortal.innerHTML =
      '<div id="nested" class="scroller"><div class="tall"></div></div>';
    el("portal").append(nestedPortal);
    const removeNested = registerModalTouchGuard(el("nested"));
    el("inner").scrollTop = 50;
    check(move(el("target")), "nested modal blocks its underlying parent");
    check(
      !move(el("nested").firstElementChild),
      "topmost nested modal can scroll",
    );
    // Ref attachment order may put the parent after its child.
    const removeParentAgain = registerModalTouchGuard(el("popup"));
    check(
      move(el("target")),
      "nested modal wins even if the parent registers later",
    );
    removeParentAgain();
    removeNested();
    nestedPortal.remove();
    check(!move(el("target")), "parent resumes after nested modal closes");
    el("popup").hidden = true;
    check(
      !move(el("background")),
      "hidden keepMounted popups do not intercept gestures",
    );
    el("popup").hidden = false;
    check(move(el("background")), "guard resumes when a kept popup reopens");
    remove();
    check(
      !move(el("background")) && !wheel(el("background"), 0, 20),
      "all interception stops after cleanup",
    );
    const removeAgain = registerModalTouchGuard(el("popup"));
    check(
      move(el("background")),
      "guard can remount after cleanup (Strict Mode)",
    );
    removeAgain();
    // PlaybackModal is a plain element; its portaled controls live under body.
    document.body.append(el("popup"));
    const trigger = document.createElement("button");
    trigger.setAttribute("aria-controls", "options");
    el("popup").append(trigger);
    const removeCustom = registerModalTouchGuard(el("popup"));
    check(move(el("background")), "custom modal blocks background scrolling");
    check(
      !move(el("options")),
      "custom modal allows its ARIA-linked portaled scroller",
    );
    const nestedSelectPortal = document.createElement("div");
    nestedSelectPortal.setAttribute("data-base-ui-portal", "");
    nestedSelectPortal.innerHTML =
      '<div class="scroller"><div class="tall"></div></div>';
    el("select-portal").append(nestedSelectPortal);
    check(
      !move(nestedSelectPortal.firstElementChild),
      "custom modal allows popups nested inside an owned portal",
    );
    nestedSelectPortal.remove();
    check(
      move(el("options"), 0, -20),
      "custom modal blocks scrolling past its portaled scroller edge",
    );
    el("popup").style.cssText = "height:80px;overflow:auto";
    el("popup").scrollTop = 10;
    check(!move(el("popup")), "a custom modal can scroll its own root element");
    const removeCustomChild = registerModalTouchGuard(el("options"));
    const removeCustomAgain = registerModalTouchGuard(el("popup"));
    check(
      move(el("target")),
      "ARIA-linked nested modal wins over a custom parent registered later",
    );
    removeCustomAgain();
    removeCustomChild();
    removeCustom();
    check(
      JSON.stringify(styles()) === initialStyles &&
        window.scrollY === initialScroll,
      "cleanup preserves document styles and scroll position",
    );
    return checks;
  }, source);
  console.log(
    `${engine}: ${results.length} mobile modal gesture checks passed.`,
  );
  if (process.argv[3]) {
    for (const mobile of [true, false]) {
      const context = await browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1280, height: 1000 },
        hasTouch: mobile,
        isMobile: mobile,
      });
      const baseURL = process.argv[3];
      await context.addCookies([
        { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
      ]);
      const app = await context.newPage();
      await app.goto(`${baseURL}/dev-base-ui-harness`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await app
        .locator('[data-testid="base-ui-harness"][data-ready="true"]')
        .waitFor();
      await app.addStyleTag({
        content: "nextjs-portal { display: none !important; }",
      });
      const cdp =
        mobile && engine === "chromium"
          ? await context.newCDPSession(app)
          : null;
      async function swipe(x, y, deltaY) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 10; step++) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x, y: y + (deltaY * step) / 10 }],
          });
        }
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await app.evaluate(() => new Promise(requestAnimationFrame));
      }
      for (const kind of ["dialog", "drawer"]) {
        const trigger = app.getByRole("button", {
          name: `Open ${kind}`,
          exact: true,
        });
        // Let Playwright bring the trigger into view before capturing scrollY.
        await trigger.scrollIntoViewIfNeeded();
        const before = await app.evaluate(() => ({
          body: document.body.style.cssText,
          html: document.documentElement.style.cssText,
          y: window.scrollY,
        }));
        await trigger.click();
        const popup = app.getByRole("dialog", {
          name: `Fixture ${kind}`,
          exact: true,
        });
        await popup.waitFor();
        if (mobile) {
          assert.deepEqual(
            await app.evaluate(() => ({
              body: document.body.style.cssText,
              html: document.documentElement.style.cssText,
              y: window.scrollY,
            })),
            before,
            `${kind}: mobile open preserves document styles and position`,
          );
          assert.equal(
            await app.evaluate(() => {
              const event = new WheelEvent("wheel", {
                bubbles: true,
                cancelable: true,
                deltaY: 50,
              });
              document.body.dispatchEvent(event);
              return event.defaultPrevented;
            }),
            true,
            `${kind}: gesture guard is attached`,
          );
          await popup.evaluate((node) => {
            const scroller = document.createElement("div");
            scroller.style.cssText = "height:60px;overflow:auto;flex-shrink:0";
            scroller.dataset.testid = "modal-inner-scroller";
            scroller.innerHTML =
              '<div style="height:400px">Scrollable modal content</div>';
            node.append(scroller);
          });
          const scroller = app.getByTestId("modal-inner-scroller");
          assert.equal(
            await scroller.evaluate((node) => {
              node.scrollTop = 100;
              const event = new WheelEvent("wheel", {
                bubbles: true,
                cancelable: true,
                deltaY: 50,
              });
              node.dispatchEvent(event);
              return event.defaultPrevented;
            }),
            false,
            `${kind}: inner scrolling works`,
          );
          assert.equal(
            await scroller.evaluate((node) => {
              node.scrollTop = node.scrollHeight;
              const event = new WheelEvent("wheel", {
                bubbles: true,
                cancelable: true,
                deltaY: 50,
              });
              node.dispatchEvent(event);
              return event.defaultPrevented;
            }),
            true,
            `${kind}: inner edge is guarded`,
          );
          if (cdp) {
            await scroller.scrollIntoViewIfNeeded();
            const startY = await app.evaluate(() => window.scrollY);
            const box = await scroller.boundingBox();
            await scroller.evaluate((node) => {
              node.scrollTop = 100;
            });
            await swipe(box.x + box.width / 2, box.y + 50, -40);
            assert.ok(
              await scroller.evaluate((node) => node.scrollTop > 100),
              `${kind}: native touch scrolls inner content`,
            );
            await scroller.evaluate((node) => {
              node.scrollTop = node.scrollHeight;
            });
            await swipe(box.x + box.width / 2, box.y + 50, -40);
            assert.equal(
              await app.evaluate(() => window.scrollY),
              startY,
              `${kind}: native touch at inner edge leaves page still`,
            );
            await swipe(10, 80, -50);
            assert.equal(
              await app.evaluate(() => window.scrollY),
              startY,
              `${kind}: native backdrop swipe leaves page still`,
            );
            assert.equal(
              await popup.isVisible(),
              true,
              `${kind}: backdrop swipe does not dismiss`,
            );
          }
          await scroller.evaluate((node) => node.remove());
        } else {
          assert.equal(
            await app.evaluate(() =>
              [document.body, document.documentElement].some(
                (node) =>
                  ["hidden", "clip"].includes(
                    getComputedStyle(node).overflowY,
                  ) || getComputedStyle(node).position === "fixed",
              ),
            ),
            true,
            `${kind}: desktop native scroll lock is retained`,
          );
        }
        await app.keyboard.press("Tab");
        assert.equal(
          await popup.evaluate((node) => node.contains(document.activeElement)),
          true,
          `${kind}: focus stays inside`,
        );
        await popup
          .getByRole("button", {
            name: kind === "drawer" ? "Close drawer" : "Close",
            exact: true,
          })
          .click();
        await popup.waitFor({ state: "hidden" });
        assert.equal(
          await app.evaluate(() => {
            const event = new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: 50,
            });
            document.body.dispatchEvent(event);
            return event.defaultPrevented;
          }),
          false,
          `${kind}: guard is removed after closing`,
        );
        if (cdp && kind === "drawer") {
          await trigger.click();
          await popup.waitFor();
          await popup.scrollIntoViewIfNeeded();
          const handle = await popup
            .locator('[data-slot="drawer-swipe-handle"]')
            .boundingBox();
          await swipe(
            handle.x + handle.width / 2,
            handle.y + handle.height / 2,
            220,
          );
          await popup.waitFor({ state: "hidden" });
        }
      }
      console.log(
        `${engine}: ${mobile ? "mobile" : "desktop"} Dialog/Drawer integration checks passed.`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
