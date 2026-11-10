// Start npm run dev, then: node scripts/verifyHeroTablature.mjs [baseURL]
// Checks actual rasterized staff/beam continuity in Chromium and WebKit.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";
import sharp from "sharp";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const artifacts = "coverage/hero-tablature";
await mkdir(artifacts, { recursive: true });

for (const [engine, browserType] of Object.entries({ chromium, webkit })) {
  const browser = await browserType.launch();
  try {
    for (const width of [390, 1280]) {
      for (const deviceScaleFactor of [1, 2]) {
        for (const theme of ["light", "dark"]) {
          const context = await browser.newContext({
            viewport: { width, height: 844 },
            deviceScaleFactor,
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await context.addCookies([
            {
              name: "__clerk_db_jwt",
              value: "dev_browser_fake_jwt",
              url: baseURL,
            },
          ]);
          await context.addInitScript((theme) => {
            localStorage.setItem("autostrum-theme", theme);
            localStorage.setItem("autostrum-color", "maple");
            localStorage.setItem("autostrum-follows-device-theme", "false");
          }, theme);
          const page = await context.newPage();
          await page.goto(baseURL, {
            waitUntil: "domcontentloaded",
            timeout: 90_000,
          });
          const layout = width < 1280 ? "mobile" : "desktop";
          const track = page.locator(`[data-hero-tablature="${layout}"]`);
          await expect(track).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await page.evaluate(() => document.fonts.ready);
          const app = page.locator(".heroScreenshotApp").filter({ has: track });
          // The homepage fades in after hydration; sampling during that fade
          // measures the grainy page behind the preview rather than the staff.
          await expect
            .poll(() =>
              app.evaluate((element) => {
                let opacity = 1;
                for (let node = element; node; node = node.parentElement) {
                  opacity *= Number(getComputedStyle(node).opacity);
                }
                return opacity;
              }),
            )
            .toBe(1);
          const name = `${engine}-${layout}-${theme}-${deviceScaleFactor}x`;
          await app.screenshot({ path: `${artifacts}/${name}.png` });

          // Isolate notation from decorative grain when measuring stroke coverage.
          await page.addStyleTag({
            content: ".heroScreenshotApp::after { display:none!important }",
          });
          const svg = track.locator("svg").first();
          const geometry = await svg.evaluate((el) => {
            const staff = el.querySelector("[data-hero-staff]");
            const score = staff.ownerSVGElement;
            const matrix = score.getScreenCTM();
            const bounds = el.getBoundingClientRect();
            const point = (x, y) => {
              const p = new DOMPoint(x, y).matrixTransform(matrix);
              return { x: p.x - bounds.x, y: p.y - bounds.y };
            };
            const notes = [...el.querySelectorAll("text")];
            // Each numeral has a real gap in the staff, rather than an opaque
            // background patch that can mismatch the hero gradient.
            const noteFits = notes.every((note) => {
              const box = note.getBBox();
              return box.width < (note.textContent.length === 1 ? 14 : 24);
            });
            const notesCentered = notes.every((note) => {
              const box = note.getBBox();
              return (
                Math.abs(
                  box.y + box.height / 2 - Number(note.getAttribute("y")),
                ) < 1
              );
            });
            const head = el
              .querySelector("[data-hero-playhead]")
              .getBoundingClientRect();
            return {
              staffStart: point(10, 40.5),
              staffEnd: point(225, 40.5),
              beamStart: point(20, 196.5),
              beamEnd: point(115, 196.5),
              firstString: point(0, 40.5),
              lastString: point(0, 165.5),
              head: {
                x: head.x - bounds.x,
                y: head.y - bounds.y,
                height: head.height,
              },
              width: bounds.width,
              noteFits,
              notesCentered,
              staffCount: staff.children.length,
              notes: notes.length,
              uses: [...el.querySelectorAll("use")].every((use) =>
                Boolean(
                  document.getElementById(use.getAttribute("href").slice(1)),
                ),
              ),
            };
          });
          assert.equal(
            geometry.staffCount,
            8,
            "six strings and two measure lines",
          );
          assert.equal(geometry.notes, 38, "all transcribed notes are present");
          assert.ok(
            geometry.noteFits && geometry.uses,
            "note gaps and SVG references are valid",
          );
          assert.ok(
            geometry.notesCentered,
            "notes align with their strings in both engines",
          );
          assert.ok(Math.abs(geometry.head.x - geometry.width / 2) < 1);
          assert.ok(Math.abs(geometry.head.y - geometry.firstString.y) < 1);
          assert.ok(
            Math.abs(
              geometry.head.y + geometry.head.height - geometry.lastString.y,
            ) < 1,
          );

          const png = await svg.screenshot({
            path: `${artifacts}/${name}-notation.png`,
          });
          const { data, info } = await sharp(png)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          const ratio = info.width / geometry.width;
          function coverage(start, end) {
            const values = [];
            const y = start.y * ratio;
            for (
              let x = Math.ceil(start.x * ratio);
              x < Math.floor(end.x * ratio);
              x++
            ) {
              let contrast = 0;
              for (
                let row = Math.floor(y) - 2;
                row <= Math.ceil(y) + 2;
                row++
              ) {
                for (let channel = 0; channel < 3; channel++) {
                  const background = data[(2 * info.width + x) * 3 + channel];
                  contrast += Math.abs(
                    data[(row * info.width + x) * 3 + channel] - background,
                  );
                }
              }
              values.push(contrast);
            }
            return values;
          }
          const staffCoverage = coverage(
            geometry.staffStart,
            geometry.staffEnd,
          );
          assert.ok(
            Math.min(...staffCoverage) > 10,
            `${name}: staff remains visible`,
          );
          assert.ok(
            Math.max(...staffCoverage) - Math.min(...staffCoverage) < 8,
            `${name}: no seams or changes in staff thickness at column joins`,
          );
          const beamCoverage = coverage(geometry.beamStart, geometry.beamEnd);
          assert.ok(
            Math.min(...beamCoverage) > 20,
            `${name}: beam stays continuous across columns`,
          );
          console.log(`PASS ${name}`);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
