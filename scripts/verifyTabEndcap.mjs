/**
 * The 1px subsection end nut must stay on the same row as the last column.
 * Flex-wrap used to drop that 1px line onto the next row by itself when the
 * last column filled the line exactly.
 *
 * Usage:
 *   1. npm run dev
 *   2. node scripts/verifyTabEndcap.mjs [baseURL]
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function note(id) {
  return {
    type: "note",
    palmMute: "",
    firstString: "0",
    secondString: "2",
    thirdString: "2",
    fourthString: "1",
    fifthString: "0",
    sixthString: "",
    chordEffects: "",
    noteLength: "quarter",
    id,
  };
}

function makeDraft(columnCount) {
  return {
    title: "Endcap verify",
    artistId: null,
    artistName: "",
    artistIsVerified: false,
    description: null,
    genre: "rock",
    tuning: "e2 a2 d3 g3 b3 e4",
    bpm: 120,
    capo: 0,
    key: null,
    difficulty: 1,
    chords: [],
    strummingPatterns: [],
    sectionProgression: [],
    tabData: [
      {
        id: "endcap-section",
        title: "Section 1",
        data: [
          {
            id: "endcap-sub",
            type: "tab",
            bpm: -1,
            repetitions: 1,
            baseNoteLength: "quarter",
            data: Array.from({ length: columnCount }, (_, index) =>
              note(`endcap-n-${index}`),
            ),
          },
        ],
      },
    ],
  };
}

function assertEndcapAttached(measurement, label) {
  assert.ok(measurement.group, `${label}: endcap group exists`);
  assert.equal(measurement.nutCount, 1, `${label}: one end nut`);
  assert.ok(
    Math.abs(measurement.columnTop - measurement.nutTop) < 2,
    `${label}: end nut shares the last column's row (columnTop=${measurement.columnTop}, nutTop=${measurement.nutTop})`,
  );
  assert.ok(
    Math.abs(measurement.nutLeft - measurement.columnRight) < 2,
    `${label}: end nut sits against the last column (columnRight=${measurement.columnRight}, nutLeft=${measurement.nutLeft})`,
  );
  assert.ok(
    measurement.nutRight <= measurement.boundsRight + 1,
    `${label}: end nut stays inside the row (nutRight=${measurement.nutRight}, boundsRight=${measurement.boundsRight})`,
  );
}

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
});
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(err.message));

async function readEndcap(boundsSelector) {
  return page.evaluate((selector) => {
    const group = document.querySelector("[data-tab-endcap-group]");
    const nut = group?.querySelector("[data-tab-end-nut]") ?? null;
    const column = group
      ? [...group.children].find((child) => child !== nut)
      : null;
    const bounds = boundsSelectorElement(selector);
    if (!group || !nut || !column || !bounds) {
      return {
        group: Boolean(group),
        nutCount: document.querySelectorAll("[data-tab-end-nut]").length,
        columnTop: 0,
        nutTop: 0,
        columnRight: 0,
        nutLeft: 0,
        nutRight: 0,
        boundsRight: 0,
      };
    }
    const columnRect = column.getBoundingClientRect();
    const nutRect = nut.getBoundingClientRect();
    const boundsRect = bounds.getBoundingClientRect();
    return {
      group: true,
      nutCount: document.querySelectorAll("[data-tab-end-nut]").length,
      columnTop: columnRect.top,
      nutTop: nutRect.top,
      columnRight: columnRect.right,
      nutLeft: nutRect.left,
      nutRight: nutRect.right,
      boundsRight: boundsRect.right,
      columnWidth: columnRect.width,
      nutWidth: nutRect.width,
      groupWidth: group.getBoundingClientRect().width,
    };

    function boundsSelectorElement(boundsSelectorValue) {
      if (boundsSelectorValue === "row") return group.parentElement;
      return document.querySelector(boundsSelectorValue);
    }
  }, boundsSelector);
}

async function highlightEndcap() {
  await page.evaluate(() => {
    const group = document.querySelector("[data-tab-endcap-group]");
    if (!group) return;
    group.style.outline = "3px solid #e11d48";
    group.style.outlineOffset = "3px";
    group.scrollIntoView({ block: "center", inline: "nearest" });
  });
}

// --- Editing, flex-wrap (short subsection) ---
await page.addInitScript((data) => {
  localStorage.setItem("autostrum-tabData", JSON.stringify(data));
}, makeDraft(8));
await page.goto(`${BASE}/create`, { waitUntil: "domcontentloaded" });
await page.locator("[data-editing-tab-staff]").waitFor({ timeout: 30000 });
await page.waitForFunction(
  () =>
    document
      .querySelector("[data-editing-tab-staff]")
      ?.getAttribute("data-editing-tab-virtualized") === "false",
);

const editingWrap = await page.evaluate(() => {
  const staff = document.querySelector("[data-editing-tab-staff]");
  staff.style.width = "4000px";
  staff.style.maxWidth = "4000px";
  staff.style.flex = "none";
  const items = [...staff.children].filter(
    (el) => getComputedStyle(el).position !== "absolute",
  );
  const group = staff.querySelector("[data-tab-endcap-group]");
  const nut = group.querySelector("[data-tab-end-nut]");
  const sum = items.reduce((total, el) => total + el.offsetWidth, 0);
  // Exact fill of every column, with no pixel left for the end nut.
  const width = sum - nut.offsetWidth;
  staff.style.width = `${width}px`;
  staff.style.maxWidth = `${width}px`;
  const column = [...group.children].find((child) => child !== nut);
  const previous = group.previousElementSibling;
  return {
    width,
    sum,
    nutWidth: nut.offsetWidth,
    columnTop: column.getBoundingClientRect().top,
    nutTop: nut.getBoundingClientRect().top,
    previousTop: previous.getBoundingClientRect().top,
    columnRight: column.getBoundingClientRect().right,
    nutLeft: nut.getBoundingClientRect().left,
    nutRight: nut.getBoundingClientRect().right,
    staffRight: staff.getBoundingClientRect().right,
  };
});
console.log("editing flex-wrap exact fill:", editingWrap);
assert.ok(
  editingWrap.previousTop < editingWrap.columnTop - 8,
  "editing: last column wrapped onto the next line instead of orphaning the end nut",
);
assertEndcapAttached(
  {
    group: true,
    nutCount: 1,
    columnTop: editingWrap.columnTop,
    nutTop: editingWrap.nutTop,
    columnRight: editingWrap.columnRight,
    nutLeft: editingWrap.nutLeft,
    nutRight: editingWrap.nutRight,
    boundsRight: editingWrap.staffRight,
  },
  "editing flex-wrap exact fill",
);
await highlightEndcap();
await page.screenshot({
  path: `${ARTIFACT_DIR}/editing-endcap-stays-with-last-chord.png`,
});

// Room for the nut: it stays on the first line with the last column.
const editingFit = await page.evaluate(() => {
  const staff = document.querySelector("[data-editing-tab-staff]");
  const width = Number.parseFloat(staff.style.width) + 1;
  staff.style.width = `${width}px`;
  staff.style.maxWidth = `${width}px`;
  const group = staff.querySelector("[data-tab-endcap-group]");
  const nut = group.querySelector("[data-tab-end-nut]");
  const column = [...group.children].find((child) => child !== nut);
  const first = [...staff.children].find(
    (el) =>
      getComputedStyle(el).position !== "absolute" &&
      !el.hasAttribute("data-tab-endcap-group"),
  );
  return {
    columnTop: column.getBoundingClientRect().top,
    nutTop: nut.getBoundingClientRect().top,
    firstTop: first.getBoundingClientRect().top,
    columnRight: column.getBoundingClientRect().right,
    nutLeft: nut.getBoundingClientRect().left,
    nutRight: nut.getBoundingClientRect().right,
    staffRight: staff.getBoundingClientRect().right,
  };
});
console.log("editing flex-wrap with room:", editingFit);
assert.ok(
  Math.abs(editingFit.firstTop - editingFit.columnTop) < 2,
  "editing: last column stays on the first line when the end nut fits",
);
assertEndcapAttached(
  {
    group: true,
    nutCount: 1,
    columnTop: editingFit.columnTop,
    nutTop: editingFit.nutTop,
    columnRight: editingFit.columnRight,
    nutLeft: editingFit.nutLeft,
    nutRight: editingFit.nutRight,
    boundsRight: editingFit.staffRight,
  },
  "editing flex-wrap with room",
);

// Reordering the last chord must still be able to leave the endcap group.
// restrictToParentElement would clamp that drag to the 41px group.
await page.evaluate(() => {
  const staff = document.querySelector("[data-editing-tab-staff]");
  staff.style.width = "720px";
  staff.style.maxWidth = "720px";
});
await page.getByRole("button", { name: "Reorder chords" }).click();
const handle = page.locator("[data-tab-endcap-group] .cursor-grab");
await handle.waitFor();
const handleBox = await handle.boundingBox();
await page.mouse.move(
  handleBox.x + handleBox.width / 2,
  handleBox.y + handleBox.height / 2,
);
await page.mouse.down();
await page.mouse.move(handleBox.x - 160, handleBox.y, { steps: 12 });
const dragTransform = await page.evaluate(() => {
  const group = document.querySelector("[data-tab-endcap-group]");
  const column = group?.firstElementChild;
  return {
    transform: column ? getComputedStyle(column).transform : "missing",
    groupWidth: group?.getBoundingClientRect().width ?? 0,
  };
});
await page.mouse.up();
console.log("editing reorder drag:", dragTransform);
const dragX = Number(
  /matrix\([^,]+,[^,]+,[^,]+,[^,]+, ([-\d.]+)/.exec(
    dragTransform.transform,
  )?.[1] ?? "0",
);
assert.ok(
  dragX < -80,
  `last chord can drag across the staff (x=${dragX}), not only inside the endcap group`,
);

// --- Editing, virtualized: last column would exactly fill a later row ---
await page.evaluate(() => {
  localStorage.setItem(
    "autostrum-tabData",
    localStorage.getItem("autostrum-tabData") ?? "",
  );
});
await page.addInitScript((data) => {
  localStorage.setItem("autostrum-tabData", JSON.stringify(data));
}, makeDraft(49));
await page.goto(`${BASE}/create`, { waitUntil: "domcontentloaded" });
await page.locator("[data-editing-tab-staff]").waitFor({ timeout: 30000 });
await page.waitForFunction(
  () =>
    window.__AUTOSTRUM_GET_TAB_STORE__?.().tabData?.[0]?.data?.[0]?.data
      ?.length === 49,
  null,
  { timeout: 20000 },
);

const editingVirtual = await page.evaluate(() => {
  const staff = document.querySelector("[data-editing-tab-staff]");
  const column = staff.querySelector('[id^="section0-subSection0-chord"]');
  const columnWidth = column.getBoundingClientRect().width;
  const gutter =
    [...staff.children].find(
      (el) => getComputedStyle(el).position !== "absolute",
    ) ?? staff.querySelector(".absolute > .baseVertFlex");
  const width = columnWidth * 5;
  staff.style.width = `${width}px`;
  staff.style.maxWidth = `${width}px`;
  staff.style.flex = "none";
  return { width, columnWidth, gutterWidth: gutter.offsetWidth };
});
await page.waitForFunction(
  () =>
    document
      .querySelector("[data-editing-tab-staff]")
      ?.getAttribute("data-editing-tab-virtualized") === "true",
  null,
  { timeout: 10000 },
);
await page.evaluate(() => {
  const staff = document.querySelector("[data-editing-tab-staff]");
  staff?.scrollIntoView({ block: "end" });
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(250);
const editingVirtualMeasure = await readEndcap("[data-editing-tab-staff]");
console.log("editing virtualized:", editingVirtual, editingVirtualMeasure);
assert.equal(editingVirtual.columnWidth, 40, "editing column width is 40px");
assertEndcapAttached(editingVirtualMeasure, "editing virtualized");
const editingVirtualRows = await page.evaluate(() => {
  const group = document.querySelector("[data-tab-endcap-group]");
  const nut = group.querySelector("[data-tab-end-nut]");
  const column = [...group.children].find((child) => child !== nut);
  const row = group.parentElement;
  const columnsInRow = [...row.children].filter(
    (el) => !el.querySelector("[data-tab-end-nut]") && el !== group,
  );
  return {
    rowChildCount: row.childElementCount,
    otherColumnsInLastRow: columnsInRow.length,
    columnTop: column.getBoundingClientRect().top,
    nutTop: nut.getBoundingClientRect().top,
  };
});
console.log("editing virtualized last row:", editingVirtualRows);
const row0Columns = Math.floor(
  (editingVirtual.width - editingVirtual.gutterWidth + 0.1) /
    editingVirtual.columnWidth,
);
const columnsAfterFirstRow = 49 - row0Columns;
const columnsPerLaterRow = Math.floor(
  (editingVirtual.width + 0.1) / editingVirtual.columnWidth,
);
const lastRowRemainder = columnsAfterFirstRow % columnsPerLaterRow;
console.log("editing virtualized packing:", {
  row0Columns,
  columnsAfterFirstRow,
  columnsPerLaterRow,
  lastRowRemainder,
});
assert.equal(
  lastRowRemainder,
  0,
  "fixture width is an exact later-row boundary",
);
assert.equal(
  editingVirtualRows.otherColumnsInLastRow,
  0,
  "editing virtualized: the 1px end nut forces the last column onto its own row",
);

// --- Static flex-wrap and virtualized ---
await page.goto(
  `${BASE}/dev-virtualization-harness?fixture=bpm&bare=1&virtualized=false`,
  { waitUntil: "domcontentloaded" },
);
await page.waitForFunction(
  () =>
    document.querySelector("#devVirtualizationHarness")?.dataset.ready ===
      "true" && document.querySelector("[data-tab-endcap-group]"),
  null,
  { timeout: 20000 },
);

const staticWrap = await page.evaluate(() => {
  const group = document.querySelector("[data-tab-endcap-group]");
  const body = document.querySelector("[data-static-tab-body]");
  body.style.width = "4000px";
  body.style.maxWidth = "4000px";
  body.style.flex = "none";
  const items = [...body.children].filter(
    (el) => getComputedStyle(el).position !== "absolute",
  );
  const nut = group.querySelector("[data-tab-end-nut]");
  const sum = items.reduce((total, el) => total + el.offsetWidth, 0);
  const width = sum - nut.offsetWidth;
  body.style.width = `${width}px`;
  body.style.maxWidth = `${width}px`;
  const column = [...group.children].find((child) => child !== nut);
  const previous = group.previousElementSibling;
  return {
    width,
    virtualizedClass: body.className,
    columnTop: column.getBoundingClientRect().top,
    nutTop: nut.getBoundingClientRect().top,
    previousTop: previous.getBoundingClientRect().top,
    columnRight: column.getBoundingClientRect().right,
    nutLeft: nut.getBoundingClientRect().left,
    nutRight: nut.getBoundingClientRect().right,
    boundsRight: body.getBoundingClientRect().right,
  };
});
console.log("static flex-wrap exact fill:", staticWrap);
assert.ok(
  staticWrap.virtualizedClass.includes("flex-wrap"),
  "static exact-fill case uses the flex-wrap path",
);
assert.ok(
  staticWrap.previousTop < staticWrap.columnTop - 8,
  "static: last column wrapped onto the next line instead of orphaning the end nut",
);
assertEndcapAttached(
  {
    group: true,
    nutCount: 1,
    columnTop: staticWrap.columnTop,
    nutTop: staticWrap.nutTop,
    columnRight: staticWrap.columnRight,
    nutLeft: staticWrap.nutLeft,
    nutRight: staticWrap.nutRight,
    boundsRight: staticWrap.boundsRight,
  },
  "static flex-wrap exact fill",
);
await highlightEndcap();
await page.screenshot({
  path: `${ARTIFACT_DIR}/static-endcap-stays-with-last-chord.png`,
});

await page.goto(
  `${BASE}/dev-virtualization-harness?fixture=bpm&bare=1&virtualized=true`,
  { waitUntil: "domcontentloaded" },
);
await page.waitForFunction(
  () =>
    document.querySelector("#devVirtualizationHarness")?.dataset.ready ===
      "true" && document.querySelector("[data-tab-endcap-group]"),
  null,
  { timeout: 20000 },
);

const staticVirtualWidths = [180, 220, 273, 340];
for (const width of staticVirtualWidths) {
  await page.evaluate((nextWidth) => {
    const measured = document.querySelector("[data-static-tab-body]");
    measured.style.width = `${nextWidth}px`;
    measured.style.maxWidth = `${nextWidth}px`;
    measured.style.flex = "none";
  }, width);
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    document
      .querySelector("[data-static-tab-body]")
      ?.scrollIntoView({ block: "end" });
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(150);
  const measurement = await readEndcap("row");
  console.log(`static width ${width}:`, measurement);
  assertEndcapAttached(measurement, `static width ${width}`);
}

assert.equal(pageErrors.length, 0, `no page errors: ${pageErrors.join("; ")}`);
console.log("\nALL TAB ENDCAP CHECKS PASSED");
await browser.close();
