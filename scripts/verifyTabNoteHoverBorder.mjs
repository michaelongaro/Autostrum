// Verify TabNote hover border stays 29x29 and centered in the column
 // for both empty (full-width click target) and filled (minimal text width) states.
//
// Usage:
//   1. npm run dev
//   2. node scripts/verifyTabNoteHoverBorder.mjs [baseURL]
//
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts/tabnote-hover-border";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function uuid() {
  return crypto.randomUUID();
}

function note(fret = "") {
  return {
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "",
    thirdString: "",
    fourthString: "",
    fifthString: fret,
    sixthString: "",
    chordEffects: "",
    noteLength: "eighth",
    id: uuid(),
  };
}

const draft = {
  title: "Hover border verify",
  artistId: null,
  description: null,
  genre: "rock",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 120,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [],
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
          data: [note(""), note("1"), note("12"), note("x")],
        },
      ],
    },
  ],
  sectionProgression: [],
};

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 900, height: 800 } })
).newPage();

await page.addInitScript((data) => {
  localStorage.setItem("autostrum-tabData", JSON.stringify(data));
}, draft);

await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
await page.locator("#section0-subSection0-chord0").waitFor({ timeout: 20000 });

async function measureColumn(columnIndex) {
  return page.evaluate(async (col) => {
    const chord = document.getElementById(
      `section0-subSection0-chord${col}`,
    );
    if (!chord) return { error: "no chord" };

    // Fifth string row: noteIndex 5 → input-0-0-{col}-5
    const input = document.getElementById(`input-0-0-${col}-5`);
    if (!input) return { error: "no input" };

    const row = input.closest(".baseFlex.relative");
    if (!row) return { error: "no row" };

    // Hover to reveal border
    const hoverTarget = input;
    const evt = new MouseEvent("mouseover", { bubbles: true });
    hoverTarget.dispatchEvent(evt);

    // The border is the absolute 29x29 sibling inside the TabNote group wrapper
    const wrapper = input.parentElement;
    if (!wrapper) return { error: "no wrapper" };
    const border = [...wrapper.children].find((el) => {
      if (el === input) return false;
      const style = getComputedStyle(el);
      return (
        style.position === "absolute" &&
        (el.className.includes("size-[29px]") ||
          Math.round(el.getBoundingClientRect().width) === 29)
      );
    });
    if (!border) return { error: "no border" };

    // Force hover styles by adding a class temporarily if group-hover needs :hover
    wrapper.classList.add("force-hover-measure");
    // Also try real hover via coordinates
    const rowRect = row.getBoundingClientRect();
    const chordRect = chord.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const borderRect = border.getBoundingClientRect();

    const columnCenterX = chordRect.left + chordRect.width / 2;
    const rowCenterY = rowRect.top + rowRect.height / 2;
    const borderCenterX = borderRect.left + borderRect.width / 2;
    const borderCenterY = borderRect.top + borderRect.height / 2;

    // String segments flanking the note
    const segments = [...row.querySelectorAll(":scope > div")].filter(
      (el) => el !== wrapper && getComputedStyle(el).flexGrow === "1",
    );

    return {
      noteValue: input.value,
      inputWidth: inputRect.width,
      inputIsFullRow: Math.abs(inputRect.width - rowRect.width) < 2,
      borderWidth: borderRect.width,
      borderHeight: borderRect.height,
      columnCenterX,
      rowCenterY,
      borderCenterX,
      borderCenterY,
      deltaX: Math.abs(borderCenterX - columnCenterX),
      deltaY: Math.abs(borderCenterY - rowCenterY),
      segmentCount: segments.length,
      leftSegWidth: segments[0]?.getBoundingClientRect().width ?? null,
      rightSegWidth: segments[1]?.getBoundingClientRect().width ?? null,
      columnWidth: chordRect.width,
      rowWidth: rowRect.width,
    };
  }, columnIndex);
}

// Use Playwright hover for real :hover / group-hover
async function measureWithHover(columnIndex) {
  const input = page.locator(`#input-0-0-${columnIndex}-5`);
  await input.hover();
  await page.waitForTimeout(50);
  const result = await measureColumn(columnIndex);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `column-${columnIndex}.png`),
    fullPage: false,
  });
  return result;
}

const empty = await measureWithHover(0);
const single = await measureWithHover(1);
const double = await measureWithHover(2);
const mute = await measureWithHover(3);

console.log("empty", empty);
console.log("single", single);
console.log("double", double);
console.log("mute", mute);

for (const [label, sample] of [
  ["empty", empty],
  ["single", single],
  ["double", double],
  ["mute", mute],
]) {
  assert.ok(!sample.error, `${label}: ${sample.error}`);
  assert.ok(
    Math.abs(sample.borderWidth - 29) <= 1 &&
      Math.abs(sample.borderHeight - 29) <= 1,
    `${label}: border is 29x29 (got ${sample.borderWidth}x${sample.borderHeight})`,
  );
  assert.ok(
    sample.deltaX <= 2,
    `${label}: border centered horizontally (deltaX=${sample.deltaX.toFixed(2)})`,
  );
  assert.ok(
    sample.deltaY <= 2,
    `${label}: border centered vertically on row (deltaY=${sample.deltaY.toFixed(2)})`,
  );
}

assert.ok(empty.inputIsFullRow, "empty note input spans the full string row");
assert.ok(
  single.inputWidth < empty.inputWidth / 2,
  `filled single-digit input is minimal (w=${single.inputWidth.toFixed(1)} vs empty ${empty.inputWidth.toFixed(1)})`,
);
assert.ok(
  double.inputWidth > single.inputWidth,
  "two-digit note is wider than one-digit",
);
assert.ok(
  single.leftSegWidth > 2 && single.rightSegWidth > 2,
  "filled note leaves room for flanking string segments",
);
assert.ok(
  Math.abs(single.leftSegWidth - single.rightSegWidth) <= 2,
  "flanking string segments stay balanced around a filled note",
);

console.log("\nALL TABNOTE HOVER BORDER CHECKS PASSED");
await browser.close();
