// Run against `next start`, never `next dev`. See docs/editor-performance.md.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { installEditorPerformanceSuite } from "./editorPerformanceSuite.mjs";
import { verifyEditorPerformance } from "./editorPerformanceChecks.mjs";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const label = process.env.PERF_LABEL ?? "production";
const fixtures = (
  process.env.PERF_FIXTURES ?? "small,short,chords,mixed,long,metadata"
).split(",");
const variants = (process.env.PERF_VARIANTS ?? "default").split(",");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/create`);
  // The store exists before Clerk/DraftEditor finish guest initialization.
  // Seeding earlier can race hydration and silently reset the fixture.
  await page.waitForSelector("#mainTabComponent");
  await page.waitForFunction(
    () => window.__AUTOSTRUM_GET_TAB_STORE__?.().editing,
  );
  await page.evaluate(installEditorPerformanceSuite);
  await mkdir("reports/editor-performance", { recursive: true });
  async function saveReport(checks) {
    const results = await page.evaluate(() => window.editorPerformance.results);
    await writeFile(
      `reports/editor-performance/${label}.json`,
      JSON.stringify(
        { label, base, browserVersion: browser.version(), results, checks },
        null,
        2,
      ),
    );
  }
  for (const fixture of fixtures) {
    console.log(
      await page.evaluate(
        (name) => window.editorPerformance.seed(name),
        fixture,
      ),
    );
    for (const variant of variants) {
      await page.evaluate(
        (name) => window.editorPerformance.variant(name),
        variant,
      );
      console.log(
        JSON.stringify(
          await page.evaluate(
            (name) => window.editorPerformance.measure(name),
            variant,
          ),
        ),
      );
    }
    await saveReport();
  }
  let checks;
  if (process.env.PERF_VERIFY === "1") {
    checks = await page.evaluate(verifyEditorPerformance);
    checks.resize = [];
    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(850);
      const geometry = await page.evaluate(async () => {
        const elements = [
          ...document.querySelectorAll("[data-editor-section-body]"),
        ];
        const styles = elements.map((element) => element.getAttribute("style"));
        const contained = document.documentElement.scrollHeight;
        elements.forEach((element) => {
          element.style.contentVisibility = "visible";
          element.style.containIntrinsicSize = "none";
        });
        await new Promise((resolve) => setTimeout(resolve, 150));
        const natural = document.documentElement.scrollHeight;
        elements.forEach((element, index) =>
          element.setAttribute("style", styles[index] ?? ""),
        );
        return { width: innerWidth, contained, natural };
      });
      if (Math.abs(geometry.contained - geometry.natural) > 2) {
        throw new Error(
          `Resized containment geometry differs: ${JSON.stringify(geometry)}`,
        );
      }
      checks.resize.push(geometry);
    }
    console.log(checks);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await saveReport(checks);
} finally {
  await browser.close();
}
