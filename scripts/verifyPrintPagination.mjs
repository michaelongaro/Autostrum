// Run: node scripts/verifyPrintPagination.mjs (Node 22.15+).
// No server or database needed. Chromium checks physical PDF pagination;
// WebKit checks print layout, but cannot emulate the native iOS print sheet.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "playwright";
import ts from "typescript";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("~/")) {
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) {
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ESNext,
          },
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});

const { getPrintPageSize } = await import("../src/utils/printTab.ts");
const { getPrintStyles } =
  await import("../src/components/Tab/Print/printStyles.ts");
const { paginatePrintDocument } =
  await import("../src/components/Tab/Print/paginatePrintDocument.ts");

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    for (const paper of ["letter", "a4"]) {
      for (const orientation of ["portrait", "landscape"]) {
        const options = { paper, orientation };
        const size = getPrintPageSize(options);
        for (const density of ["sparse", "full"]) {
          await page.setContent(`<!doctype html><html><head>
            <style>${getPrintStyles(options)}</style></head><body>
            <div id="print-source"></div><main id="print-pages"></main>
            </body></html>`);
          // Execute the production paginator with its production sizing helper.
          await page.addScriptTag({
            content: `${getPrintPageSize.toString()}\n${paginatePrintDocument.toString()}`,
          });
          const count = await page.evaluate(
            ({ options, blockHeight }) => {
              const source = document.getElementById("print-source");
              // Measure offscreen source blocks as in the real preview.
              source.style.display = "block";
              for (let index = 0; index < 9; index++) {
                const block = document.createElement("div");
                block.dataset.printBlock = "";
                if (index % 3 === 0) block.dataset.newPage = "true";
                block.style.height = `${blockHeight}px`;
                block.textContent = `Music row ${index + 1}`;
                source.append(block);
              }
              const count = window.paginatePrintDocument(
                source,
                document.getElementById("print-pages"),
                { title: "Print pagination regression" },
                options,
              );
              source.style.display = "none";
              return count;
            },
            {
              options,
              blockHeight:
                density === "full"
                  ? Math.floor((size.contentHeight - 2) / 3)
                  : 60,
            },
          );
          assert.equal(count, 3);
          assert.equal(await page.locator("[data-print-block]").count(), 18);
          assert.deepEqual(
            await page
              .locator(".print-page-footer span:last-child")
              .allTextContents(),
            ["1 / 3", "2 / 3", "3 / 3"],
          );
          if (engine === chromium) {
            for (const margin of [12, 13]) {
              // Model a native print area slightly smaller than CSS requested.
              // The old fixed-height content pushes each footer onto a new sheet.
              const override = await page.addStyleTag({
                content: `@page { margin: ${margin}mm 12mm; }`,
              });
              const pdf = await page.pdf({ preferCSSPageSize: true });
              const actual = [
                ...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g),
              ].length;
              assert.equal(
                actual,
                count,
                `${paper} ${orientation}, ${density}, ${margin}mm: no footer-only sheets`,
              );
              await override.evaluate((element) => element.remove());
            }
          }
          const layout = await page
            .locator(".print-page")
            .evaluateAll((pages) =>
              pages.map((page) => {
                const content = page.querySelector(".print-page-content");
                const footer = page.querySelector(".print-page-footer");
                const last = content.lastElementChild.getBoundingClientRect();
                const footerRect = footer.getBoundingClientRect();
                return {
                  spacer: content.getBoundingClientRect().bottom - last.bottom,
                  overlaps: footerRect.top < last.bottom - 0.1,
                  outside:
                    footerRect.bottom >
                    page.getBoundingClientRect().bottom + 0.1,
                };
              }),
            );
          assert.ok(
            layout.every(
              ({ spacer, overlaps, outside }) =>
                Math.abs(spacer) < 1 && !overlaps && !outside,
            ),
            `${engine.name()} ${paper} ${orientation}, ${density}: footer follows the music without a full-page spacer`,
          );
        }
      }
    }
    console.log(
      `PASS ${engine.name()}: sparse/full pages, Letter/A4, portrait/landscape${engine === chromium ? ", PDF sheet counts with native-margin allowance" : " print layout"}`,
    );
  } finally {
    await browser.close();
  }
}
