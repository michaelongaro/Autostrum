// Verify Chord dialog note inputs match editing TabNote chrome:
// 29x24 centered hover border, empty full-row click target, filled minimal width.
//
// Usage:
//   1. npm run dev
//   2. node scripts/verifyChordDialogTabNotes.mjs [baseURL]
//
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts/chord-dialog-tabnotes";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function uuid() {
  return crypto.randomUUID();
}

const draft = {
  title: "Chord dialog verify",
  artistId: null,
  description: null,
  genre: "rock",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 120,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [
    {
      id: uuid(),
      name: "Em",
      color: "#22c55e",
      frets: ["0", "0", "0", "2", "2", "0"],
    },
  ],
  strummingPatterns: [],
  tabData: [
    {
      id: uuid(),
      title: "Section 1",
      data: [
        {
          id: uuid(),
          type: "tab",
          bpm: -1,
          repetitions: 1,
          baseNoteLength: "eighth",
          data: [
            {
              type: "note",
              palmMute: "",
              firstString: "",
              secondString: "",
              thirdString: "",
              fourthString: "",
              fifthString: "",
              sixthString: "",
              chordEffects: "",
              noteLength: "eighth",
              id: uuid(),
            },
          ],
        },
      ],
    },
  ],
  sectionProgression: [],
};

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1000, height: 900 } })
).newPage();

await page.addInitScript((data) => {
  localStorage.setItem("autostrum-tabData", JSON.stringify(data));
}, draft);

await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });

// Open the Chords accordion, then edit the seeded Em chord
await page.getByText("Chords", { exact: true }).click();
const editChordButton = page
  .locator(".baseVertFlex.overflow-hidden.rounded-md.border-2")
  .filter({ hasText: "Em" })
  .getByRole("button")
  .first();
await editChordButton.waitFor({ timeout: 20000 });
await editChordButton.click();

await page.locator("#input-chordModal-chordModal-0").waitFor({ timeout: 10000 });

async function measureFret(index) {
  const input = page.locator(`#input-chordModal-chordModal-${index}`);
  await input.hover();
  await page.waitForTimeout(50);

  return page.evaluate((idx) => {
    const inputEl = document.getElementById(
      `input-chordModal-chordModal-${idx}`,
    );
    if (!inputEl) return { error: "no input" };

    const row = inputEl.closest(".baseFlex.relative");
    if (!row) return { error: "no row" };

    const wrapper = inputEl.parentElement;
    if (!wrapper) return { error: "no wrapper" };

    const border = [...wrapper.children].find((el) => {
      if (el === inputEl) return false;
      const style = getComputedStyle(el);
      return (
        style.position === "absolute" &&
        (el.className.includes("w-[29px]") ||
          Math.round(el.getBoundingClientRect().width) === 29)
      );
    });
    if (!border) return { error: "no border" };

    const column = row.parentElement;
    if (!column) return { error: "no column" };

    const rowRect = row.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const inputRect = inputEl.getBoundingClientRect();
    const borderRect = border.getBoundingClientRect();
    // The chord editor is CSS-zoomed. Layout checks use unscaled CSS pixels;
    // getBoundingClientRect is in zoomed viewport pixels.
    let zoom = 1;
    for (let node = row; node; node = node.parentElement) {
      const z = Number(getComputedStyle(node).zoom);
      if (z) zoom *= z;
    }

    const columnCenterX = columnRect.left + columnRect.width / 2;
    const rowCenterY = rowRect.top + rowRect.height / 2;
    const borderCenterX = borderRect.left + borderRect.width / 2;
    const borderCenterY = borderRect.top + borderRect.height / 2;

    const segments = [...row.querySelectorAll(":scope > div")].filter(
      (el) => el !== wrapper && getComputedStyle(el).flexGrow === "1",
    );

    return {
      noteValue: inputEl.value,
      inputWidth: inputRect.width / zoom,
      inputIsFullRow: Math.abs(inputRect.width - rowRect.width) < 2,
      borderWidth: borderRect.width / zoom,
      borderHeight: borderRect.height / zoom,
      deltaX: Math.abs(borderCenterX - columnCenterX),
      deltaY: Math.abs(borderCenterY - rowCenterY),
      leftSegWidth: (segments[0]?.getBoundingClientRect().width ?? 0) / zoom,
      rightSegWidth: (segments[1]?.getBoundingClientRect().width ?? 0) / zoom,
      rowHeight: rowRect.height / zoom,
      columnWidth: columnRect.width / zoom,
    };
  }, index);
}

// Clear top fret so we can measure empty full-row behavior
await page.locator("#input-chordModal-chordModal-0").click();
await page.locator("#input-chordModal-chordModal-0").press("Control+a");
await page.locator("#input-chordModal-chordModal-0").press("Backspace");
await page.waitForTimeout(50);

const empty = await measureFret(0);
const filled = await measureFret(3); // "2" from Em frets

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "chord-dialog-editor.png"),
  fullPage: false,
});

console.log("empty", empty);
console.log("filled", filled);

for (const [label, sample] of [
  ["empty", empty],
  ["filled", filled],
]) {
  assert.ok(!sample.error, `${label}: ${sample.error}`);
  assert.ok(
    Math.abs(sample.borderWidth - 29) <= 1 &&
      Math.abs(sample.borderHeight - 24) <= 1,
    `${label}: border is 29x24 (got ${sample.borderWidth}x${sample.borderHeight})`,
  );
  assert.ok(
    sample.deltaX <= 2,
    `${label}: border centered horizontally (deltaX=${sample.deltaX.toFixed(2)})`,
  );
  assert.ok(
    sample.deltaY <= 2,
    `${label}: border centered vertically on row (deltaY=${sample.deltaY.toFixed(2)})`,
  );
  assert.equal(sample.rowHeight, 24, `${label}: row height is 24px`);
  assert.equal(sample.columnWidth, 40, `${label}: column width is 40px`);
}

assert.ok(empty.inputIsFullRow, "empty fret input spans the full string row");
assert.ok(
  filled.inputWidth < empty.inputWidth / 2,
  `filled fret input is minimal (w=${filled.inputWidth.toFixed(1)} vs empty ${empty.inputWidth.toFixed(1)})`,
);
assert.ok(
  filled.leftSegWidth > 2 && filled.rightSegWidth > 2,
  "filled fret leaves room for flanking string segments",
);
assert.ok(
  Math.abs(filled.leftSegWidth - filled.rightSegWidth) <= 2,
  "flanking string segments stay balanced around a filled fret",
);

// Filled frets shrink to the glyphs. Hovering or clicking the rest of the
// cell still shows the outline and focuses the input.
const offGlyph = await page.evaluate(() => {
  const input = document.getElementById("input-chordModal-chordModal-3");
  const row = input?.closest(".baseFlex.relative");
  if (!input || !row) return { error: "missing row" };
  const inputRect = input.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  return {
    x: rowRect.left + 3,
    y: rowRect.top + rowRect.height / 2,
    inputLeft: inputRect.left,
  };
});
assert.ok(!offGlyph.error, offGlyph.error);
assert.ok(
  offGlyph.x < offGlyph.inputLeft - 1,
  `probe is left of the glyph (x=${offGlyph.x}, inputLeft=${offGlyph.inputLeft})`,
);
await page.mouse.move(offGlyph.x, offGlyph.y);
await page.waitForTimeout(50);
const offGlyphBorder = await page.evaluate(() => {
  const input = document.getElementById("input-chordModal-chordModal-3");
  const border = [...(input?.parentElement?.children ?? [])].find((el) =>
    el.className.includes("w-[29px]"),
  );
  return border ? getComputedStyle(border).borderTopWidth : null;
});
assert.ok(
  Number.parseFloat(offGlyphBorder) > 0,
  `outline shows when hovering beside a filled fret (got ${offGlyphBorder})`,
);
await page.mouse.click(offGlyph.x, offGlyph.y);
await page.waitForTimeout(50);
const focusedFret = await page.evaluate(
  () => document.activeElement?.id ?? "",
);
assert.equal(
  focusedFret,
  "input-chordModal-chordModal-3",
  `clicking beside a filled fret focuses it (focused ${focusedFret})`,
);

// Chord letter hotkey still works
await page.locator("#input-chordModal-chordModal-2").click();
await page.locator("#input-chordModal-chordModal-2").press("Control+a");
await page.locator("#input-chordModal-chordModal-2").press("Backspace");
await page.locator("#input-chordModal-chordModal-2").type("A");
await page.waitForTimeout(50);
const afterHotkey = await page.evaluate(() =>
  [0, 1, 2, 3, 4, 5].map(
    (i) =>
      document.getElementById(`input-chordModal-chordModal-${i}`)?.value ?? null,
  ),
);
assert.deepEqual(
  afterHotkey,
  ["0", "2", "2", "2", "0", ""],
  `A major hotkey frets (got ${JSON.stringify(afterHotkey)})`,
);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "chord-dialog-after-hotkey.png"),
  fullPage: false,
});

console.log("\nALL CHORD DIALOG TABNOTE CHECKS PASSED");
await browser.close();
