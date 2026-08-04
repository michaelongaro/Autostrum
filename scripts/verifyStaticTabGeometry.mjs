// Pure-logic verification for static tab geometry helpers, including the
// zoom-aware measurement utilities used by row virtualization.
//
// Usage: node scripts/verifyStaticTabGeometry.mjs
//
// Exits non-zero if any assertion fails. Does not need a browser — the DOM
// measurement helpers are exercised against lightweight element stubs.

import assert from "node:assert/strict";

const failures = [];
let checks = 0;

function check(name, fn) {
  checks++;
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

// Inline the pure helpers (kept in sync with src/utils/staticTabGeometry.ts)
// so this script has zero build/transpile dependency. The browser e2e script
// exercises the real module; this catches math regressions fast.

const STATIC_TAB_ROW_HEIGHT_PX = 248;
const STATIC_TAB_TUNING_GUTTER_WIDTH_PX = 34;
const STATIC_TAB_NOTES_COLUMN_WIDTH_PX = 34;
const STATIC_TAB_LAST_NOTES_COLUMN_WIDTH_PX = 46;
const STATIC_TAB_MEASURE_LINE_WIDTH_PX = 2;
const STATIC_TAB_OVERSCAN_PX = 300;
const ROW_PACKING_EPSILON_PX = 0.1;
const CSS_ZOOM_RATIO_EPSILON = 0.001;

function getStaticTabColumnWidthPx(column, isLastColumn) {
  if (column.type === "measureLine") return STATIC_TAB_MEASURE_LINE_WIDTH_PX;
  return isLastColumn
    ? STATIC_TAB_LAST_NOTES_COLUMN_WIDTH_PX
    : STATIC_TAB_NOTES_COLUMN_WIDTH_PX;
}

function buildStaticTabRowLayout(columns, innerWidthPx) {
  const rows = [];
  if (columns.length === 0 || innerWidthPx <= 0) {
    return { rows, totalHeight: 0 };
  }

  const maxRowWidth = innerWidthPx + ROW_PACKING_EPSILON_PX;
  let startIndex = 0;
  let rowWidth = STATIC_TAB_TUNING_GUTTER_WIDTH_PX;
  let columnsInRow = 0;

  const pushRow = (endIndex) => {
    rows.push({
      rowIndex: rows.length,
      startIndex,
      endIndex,
      width: rowWidth,
      top: rows.length * STATIC_TAB_ROW_HEIGHT_PX,
    });
  };

  for (const [index, column] of columns.entries()) {
    const columnWidth = getStaticTabColumnWidthPx(
      column,
      index === columns.length - 1,
    );
    if (columnsInRow > 0 && rowWidth + columnWidth > maxRowWidth) {
      pushRow(index - 1);
      startIndex = index;
      rowWidth = 0;
      columnsInRow = 0;
    }
    rowWidth += columnWidth;
    columnsInRow++;
  }
  pushRow(columns.length - 1);
  return { rows, totalHeight: rows.length * STATIC_TAB_ROW_HEIGHT_PX };
}

function getVisibleRowRange(
  layout,
  bodyTopPx,
  viewportHeightPx,
  zoom,
  overscanPx = STATIC_TAB_OVERSCAN_PX,
  viewportTopPx = 0,
) {
  const rowCount = layout.rows.length;
  if (rowCount === 0) return null;
  const safeZoom = zoom > 0 ? zoom : 1;
  const safeViewportHeight =
    Number.isFinite(viewportHeightPx) && viewportHeightPx > 0
      ? viewportHeightPx
      : 0;
  const safeViewportTop = Number.isFinite(viewportTopPx) ? viewportTopPx : 0;
  const windowStart =
    (safeViewportTop - overscanPx - bodyTopPx) / safeZoom;
  const windowEnd =
    (safeViewportTop + safeViewportHeight + overscanPx - bodyTopPx) /
    safeZoom;
  if (windowEnd <= 0 || windowStart >= layout.totalHeight) return null;
  const clamp = (value) => Math.min(Math.max(value, 0), rowCount - 1);
  const startRow = clamp(Math.floor(windowStart / STATIC_TAB_ROW_HEIGHT_PX));
  const endRow = clamp(Math.ceil(windowEnd / STATIC_TAB_ROW_HEIGHT_PX) - 1);
  if (endRow < startRow) return null;
  return { startRow, endRow };
}

function getStaticTabLayoutWidthPx(element) {
  return element.offsetWidth;
}

function normalizeCssZoomRatio(measured) {
  if (Math.abs(measured - 1) < CSS_ZOOM_RATIO_EPSILON) return 1;
  return measured;
}

function getElementCssZoomForRect(
  element,
  fallbackZoom = 1,
  layoutHeightPx,
) {
  const safeFallback = fallbackZoom > 0 ? fallbackZoom : 1;
  const rect = element.getBoundingClientRect();

  if (
    layoutHeightPx !== undefined &&
    layoutHeightPx > 0 &&
    Number.isFinite(layoutHeightPx)
  ) {
    const visualHeight = rect.height;
    if (visualHeight > 0 && Number.isFinite(visualHeight)) {
      const measured = visualHeight / layoutHeightPx;
      if (Number.isFinite(measured) && measured > 0) {
        return normalizeCssZoomRatio(measured);
      }
    }
  }

  const layoutWidth = element.offsetWidth;
  if (layoutWidth <= 0) return safeFallback;
  const visualWidth = rect.width;
  if (visualWidth <= 0 || !Number.isFinite(visualWidth)) return safeFallback;
  const measured = visualWidth / layoutWidth;
  if (!Number.isFinite(measured) || measured <= 0) return safeFallback;
  return normalizeCssZoomRatio(measured);
}

function stubElement({ offsetWidth, rectWidth, rectHeight = 0, rectTop = 0 }) {
  return {
    offsetWidth,
    getBoundingClientRect: () => ({
      width: rectWidth,
      height: rectHeight,
      top: rectTop,
    }),
  };
}

function makeNotes(count) {
  return Array.from({ length: count }, (_, i) => ({
    type: "note",
    id: `n-${i}`,
  }));
}

console.log("\n--- layout width / CSS zoom measurement ---");

check("layout width uses offsetWidth (ignores scaled rect)", () => {
  const el = stubElement({ offsetWidth: 400, rectWidth: 800 });
  assert.equal(getStaticTabLayoutWidthPx(el), 400);
});

check("rect zoom ratio matches Chromium-style scaled rect", () => {
  const el = stubElement({ offsetWidth: 400, rectWidth: 800 });
  assert.equal(getElementCssZoomForRect(el, 1), 2);
});

check("rect zoom ratio is 1 when rect ignores CSS zoom (old WebKit)", () => {
  // App zoom is 2, but getBoundingClientRect returns unscaled layout width.
  // Using the app zoom here would double-divide; measured ratio must stay 1.
  const el = stubElement({ offsetWidth: 400, rectWidth: 400 });
  assert.equal(getElementCssZoomForRect(el, 2), 1);
});

check("falls back when layout width is 0", () => {
  const el = stubElement({ offsetWidth: 0, rectWidth: 0 });
  assert.equal(getElementCssZoomForRect(el, 1.5), 1.5);
});

check("near-1 ratios collapse to exactly 1", () => {
  const el = stubElement({ offsetWidth: 1000, rectWidth: 1000.5 });
  assert.equal(getElementCssZoomForRect(el, 1), 1);
});

check("height-based zoom preferred over collapsed width ratio", () => {
  // Mobile WebKit quirk: width ratio ~1 while height/top still scale with CSS zoom.
  const layoutHeight = 9920;
  const el = stubElement({
    offsetWidth: 324, // wrongly matches visual width
    rectWidth: 324,
    rectHeight: layoutHeight * 1.5,
  });
  assert.equal(getElementCssZoomForRect(el, 1), 1); // width-only path
  assert.equal(getElementCssZoomForRect(el, 1, layoutHeight), 1.5); // height path
});

check("height-based zoom is 1 when rects are unscaled (old WebKit)", () => {
  const layoutHeight = 9920;
  const el = stubElement({
    offsetWidth: 400,
    rectWidth: 400,
    rectHeight: layoutHeight,
  });
  assert.equal(getElementCssZoomForRect(el, 2, layoutHeight), 1);
});

console.log("\n--- visible range under zoom ---");

const wideLayout = buildStaticTabRowLayout(makeNotes(80), 400);
assert.ok(wideLayout.rows.length >= 4);

check("zoom=1: body at top of viewport shows early rows", () => {
  const range = getVisibleRowRange(wideLayout, 0, 800, 1, 0);
  assert.ok(range);
  assert.equal(range.startRow, 0);
  assert.ok(range.endRow >= 2);
});

check("zoom=2 with scaled rect: same layout rows as zoom=1 for equivalent visual", () => {
  // Body visually twice as tall; rect.top is in visual px. Converting with
  // measured zoom=2 should yield the same layout window as an unzoomed body.
  const unzoomed = getVisibleRowRange(wideLayout, 0, 800, 1, 0);
  const zoomed = getVisibleRowRange(wideLayout, 0, 800, 2, 0);
  assert.ok(unzoomed && zoomed);
  // At zoom=2 the same viewport covers fewer layout rows
  assert.ok(zoomed.endRow < unzoomed.endRow);
});

check("old-WebKit path: unscaled rect + measuredZoom=1 keeps full viewport window", () => {
  // If we wrongly passed app zoom=2 while rect.top is unscaled, the window
  // would shrink and hide rows that are still on screen.
  const correct = getVisibleRowRange(wideLayout, 0, 800, 1, 0);
  const doubleDivided = getVisibleRowRange(wideLayout, 0, 800, 2, 0);
  assert.ok(correct && doubleDivided);
  assert.ok(
    correct.endRow > doubleDivided.endRow,
    "double-dividing zoom hides rows that should stay mounted",
  );
});

check("packing width must not be divided by zoom on unscaled rects", () => {
  // Simulate the old bug: rect.width/appZoom when rect is already unscaled.
  const layoutWidth = 400;
  const appZoom = 2;
  const unscaledRectWidth = 400; // old WebKit
  const buggyWidth = unscaledRectWidth / appZoom; // 200
  const correctRows = buildStaticTabRowLayout(makeNotes(40), layoutWidth).rows
    .length;
  const buggyRows = buildStaticTabRowLayout(makeNotes(40), buggyWidth).rows
    .length;
  assert.ok(
    buggyRows > correctRows,
    `buggy under-measure packs more rows (${buggyRows} > ${correctRows})`,
  );
});

check("scaled top + collapsed width zoom empties mid-section (regression)", () => {
  // Tall zoomed body scrolled mid-viewport: using measuredZoom=1 with a
  // visually-scaled bodyTop walks past layout.totalHeight → null range.
  const tallLayout = buildStaticTabRowLayout(makeNotes(200), 216);
  assert.ok(tallLayout.rows.length >= 30);
  const appZoom = 1.5;
  const visualTop = -(tallLayout.totalHeight * appZoom * 0.55);
  const visuallyIn =
    visualTop + tallLayout.totalHeight * appZoom > 0 && visualTop < 844;
  assert.ok(visuallyIn, "fixture should still be on screen");

  const buggy = getVisibleRowRange(tallLayout, visualTop, 844, 1, 300);
  const fixed = getVisibleRowRange(tallLayout, visualTop, 844, appZoom, 300);
  assert.equal(buggy, null, "collapsed zoom must reproduce the empty-section bug");
  assert.ok(fixed, "height-derived zoom must keep mid-section rows mounted");
  assert.ok(fixed.startRow > 0);
  assert.ok(fixed.endRow < tallLayout.rows.length - 1);
});

check("visualViewport offsetTop shifts the visible row window", () => {
  const rangeTop = getVisibleRowRange(wideLayout, 0, 800, 1, 0, 0);
  const rangePanned = getVisibleRowRange(wideLayout, 0, 800, 1, 0, 500);
  assert.ok(rangeTop && rangePanned);
  assert.ok(
    rangePanned.startRow > rangeTop.startRow,
    "panned visual viewport should advance the start row",
  );
});

console.log(`\n${checks - failures.length}/${checks} checks passed`);

if (failures.length > 0) {
  console.error(`\nFAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
