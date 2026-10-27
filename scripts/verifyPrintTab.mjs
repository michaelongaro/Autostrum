// Run npm run dev, then node scripts/verifyPrintTab.mjs [baseURL].
// Uses only a local editor fixture and blocks writes to the remote database.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const artifacts = join(tmpdir(), "autostrum-print-verification");
mkdirSync(artifacts, { recursive: true });
const pattern = {
  id: crypto.randomUUID(),
  baseNoteLength: "eighth",
  strums: Array.from({ length: 32 }, (_, index) => ({
    strum: ["v", "^", "v~>", "s", "r", "^.", "", "v"][index % 8],
    noteLength: ["whole", "half", "quarter", "eighth dotted", "sixteenth"][
      index % 5
    ],
    palmMute:
      index === 0 ? "start" : index === 7 ? "end" : index < 7 ? "-" : "",
  })),
};
const tabColumns = Array.from({ length: 90 }, (_, index) =>
  index % 9 === 8
    ? {
        id: crypto.randomUUID(),
        type: "measureLine",
        isInPalmMuteSection: false,
        bpmAfterLine: index === 17 ? 95 : null,
      }
    : {
        id: crypto.randomUUID(),
        type: "note",
        palmMute: "",
        firstString: index === 88 ? "17" : "3",
        secondString: "2",
        thirdString: "0",
        fourthString: "0",
        fifthString: "3",
        sixthString: "3",
        noteLength: "eighth",
        chordEffects: "",
      },
);
const sections = [
  {
    id: "intro",
    title: "Intro <&>",
    data: [
      {
        id: "tab",
        type: "tab",
        bpm: -1,
        baseNoteLength: "eighth",
        repetitions: 2,
        data: tabColumns,
      },
    ],
  },
  {
    id: "chorus",
    title: "Chorus",
    data: [
      {
        id: "chords",
        type: "chord",
        bpm: -1,
        repetitions: 2,
        data: [
          {
            id: "sequence",
            bpm: 135,
            repetitions: 2,
            strummingPattern: pattern,
            data: pattern.strums.map((_, index) =>
              index % 8 === 0 ? (index % 16 === 0 ? "C" : "Gmaj7/B") : "",
            ),
          },
        ],
      },
    ],
  },
  { id: "outro", title: "Outro", data: [] },
];
const fixture = {
  title: "Print <practice> & repeat",
  artistName: "Local verification",
  description:
    "Keep every note, tempo change, and repeat.\nA second paragraph for practice.",
  tuning: "d2 a2 d3 g3 b3 e4",
  bpm: 120,
  capo: 2,
  key: "D major",
  chords: [
    {
      id: "C",
      name: "C",
      color: "#E093B2",
      frets: ["0", "1", "0", "2", "3", "x"],
    },
    {
      id: "G",
      name: "Gmaj7/B",
      color: "#94CE9A",
      frets: ["2", "0", "0", "0", "2", "x"],
    },
  ],
  tabData: sections,
  sectionProgression: [
    {
      id: "p1",
      sectionId: "chorus",
      title: "Stale title",
      repetitions: 2,
      startSeconds: 0,
      endSeconds: 10,
    },
    {
      id: "deleted",
      sectionId: "missing",
      title: "Missing",
      repetitions: 1,
      startSeconds: 10,
      endSeconds: 20,
    },
    {
      id: "p2",
      sectionId: "intro",
      title: "Intro",
      repetitions: 1,
      startSeconds: 20,
      endSeconds: 30,
    },
    {
      id: "p3",
      sectionId: "chorus",
      title: "Chorus",
      repetitions: 1,
      startSeconds: 30,
      endSeconds: 40,
    },
  ],
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.route("**/api/trpc/**", (route) => {
  if (route.request().method() !== "POST") return route.continue();
  const url = new URL(route.request().url());
  if (url.pathname.endsWith("/tab.processPageView")) {
    // Suppress remote analytics writes without creating an expected mutation
    // error overlay while testing the read-only published-view fixture.
    const response = { result: { data: { json: null } } };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? [response] : response,
      ),
    });
  }
  return route.fulfill({
    status: 403,
    body: "Verification uses local state only",
  });
});
await context.addInitScript(() => {
  localStorage.setItem("autostrum-color-coded-chords", "false");
  // Next's development toolbar can cover floating actions after navigation.
  // Keep app interactions and screenshots independent of that development UI.
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    },
    { once: true },
  );
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const printButton = () =>
  page.getByRole("button", { name: "Print", exact: true });
const frame = () =>
  page
    .frames()
    .find((candidate) => candidate.parentFrame() === page.mainFrame());

async function ready() {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[role="dialog"] button')].some(
        (button) => button.textContent.trim() === "Print" && !button.disabled,
      ),
    { timeout: 30000 },
  );
  // A fast preview can finish while the dialog is still animating in.
  await page
    .locator('[role="dialog"][data-state="open"]')
    .evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
}

async function choosePrintOption(id, value) {
  const labels = {
    compact: "Compacted sections",
    expanded: "Expanded sections",
    letter: "US Letter",
    a4: "A4",
    portrait: "Portrait",
    landscape: "Landscape",
  };
  const trigger = page.locator(`#${id}`);
  if ((await trigger.textContent()).trim() === labels[value]) return;
  await trigger.click();
  await page.getByRole("option", { name: labels[value], exact: true }).click();
}

async function closePrintDialog(method = "close", checkAnimation = false) {
  const dialog = page.locator('[role="dialog"][data-state]');
  if (checkAnimation) {
    // Sample inside the browser from animationstart; a tool round trip can
    // otherwise miss the middle of a short animation on a busy dev server.
    await dialog.evaluate((element) => {
      window.__printExitSamples = [];
      element.addEventListener(
        "animationstart",
        (event) => {
          if (event.target !== element || element.dataset.state !== "closed")
            return;
          const sample = () => {
            if (!element.isConnected) return;
            window.__printExitSamples.push({
              state: element.dataset.state,
              opacity: Number(getComputedStyle(element).opacity),
              duration: element.getAnimations()[0]?.effect.getTiming().duration,
            });
            requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        },
        { once: true },
      );
    });
  }
  if (method === "escape") await page.keyboard.press("Escape");
  else await page.getByRole("button", { name: "Close", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  if (checkAnimation) {
    const samples = await page.evaluate(() => window.__printExitSamples);
    assert.ok(
      samples.some(
        (sample) =>
          sample.state === "closed" &&
          sample.duration === 300 &&
          sample.opacity > 0 &&
          sample.opacity < 1,
      ),
      "the closing dialog must stay mounted and fade smoothly over 300ms",
    );
  }
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Print tab",
  );
}

async function setPrintScale(value) {
  const track = page
    .locator("#print-scale")
    .locator("xpath=ancestor::*[@data-scale-slider]")
    .locator("[data-scale-track]");
  await track.scrollIntoViewIfNeeded();
  const box = await track.boundingBox();
  const offset = Math.max(
    1,
    Math.min(box.width - 1, ((value - 60) / 80) * box.width),
  );
  await track.click({ position: { x: offset, y: box.height / 2 } });
  assert.equal(
    await page.locator("#print-scale").getAttribute("aria-valuenow"),
    String(value),
  );
}

async function assertSettingsFades(top, bottom) {
  await page.waitForFunction(
    ({ top, bottom }) => {
      const panel = document.querySelector(
        'aside[aria-label="Print settings"]',
      );
      return (
        panel?.dataset.scrollFadeTop === String(top) &&
        panel.dataset.scrollFadeBottom === String(bottom)
      );
    },
    { top, bottom },
  );
  const mask = await page
    .locator('aside[aria-label="Print settings"]')
    .evaluate((element) => getComputedStyle(element).maskImage);
  assert.equal(
    mask === "none",
    !top && !bottom,
    "fades must disappear when the settings fit",
  );
}

async function exerciseSettingsFades() {
  const panel = page.locator('aside[aria-label="Print settings"]');
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.waitForFunction(() => {
    const panel = document.querySelector('aside[aria-label="Print settings"]');
    return panel.scrollHeight > panel.clientHeight;
  });
  await panel.evaluate((element) => {
    element.scrollTop = 0;
  });
  await assertSettingsFades(false, true);
  await panel.evaluate((element) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
  });
  await assertSettingsFades(true, true);
  await page.screenshot({ path: join(artifacts, "settings-scroll-fades.png") });
  await panel.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await assertSettingsFades(true, false);
  await panel.evaluate((element) => {
    element.scrollTop = 0;
  });
  await assertSettingsFades(false, true);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await assertSettingsFades(false, false);
  await page.setViewportSize({ width: 1440, height: 1000 });
}
async function metrics() {
  return frame().evaluate(() => {
    const pages = document.querySelector("#print-pages");
    return {
      count: pages.querySelectorAll(".print-page").length,
      headings: [...pages.querySelectorAll(".print-section-heading")].map(
        (element) => element.textContent,
      ),
      columns: pages.querySelectorAll("[data-static-tab-column]").length,
      strums: pages.querySelectorAll(".print-strum").length,
      overflow: [...pages.querySelectorAll(".print-page-content")].flatMap(
        (content) =>
          [...content.children]
            .filter(
              (child) =>
                child.getBoundingClientRect().bottom >
                content.getBoundingClientRect().bottom + 1,
            )
            .map((child) => child.textContent.slice(0, 80)),
      ),
      horizontalOverflow: [
        ...pages.querySelectorAll("[data-print-tab-row], .print-strum-row"),
      ].filter((row) => row.scrollWidth > row.clientWidth + 1).length,
      orphanHeadings: [...pages.querySelectorAll(".print-page-content")].filter(
        (content) => content.lastElementChild?.hasAttribute("data-keep-next"),
      ).length,
      text: pages.textContent,
    };
  });
}
async function assertLayout() {
  const result = await metrics();
  assert.deepEqual(
    result.overflow,
    [],
    "music must fit vertically on every page",
  );
  assert.equal(
    result.horizontalOverflow,
    0,
    "music must fit inside the paper width",
  );
  assert.equal(
    result.orphanHeadings,
    0,
    "headings must stay with the following music",
  );
  assert.ok(result.count > 0);
  assert.ok(
    await frame()
      .locator("#print-pages .print-page-footer > span:first-child")
      .evaluateAll((elements) =>
        elements.every(
          (element) =>
            element.textContent ===
            "Autostrum · Find your next favorite song to play.",
        ),
      ),
  );
  const notation = await frame().evaluate(() => {
    const pages = document.querySelector("#print-pages");
    const failures = [];
    for (const row of pages.querySelectorAll("[data-print-tab-row]")) {
      const first = row.querySelector("[data-static-tab-column]");
      if (!first) continue;
      const strings = [...first.children[0].children[1].children]
        .filter((element) => getComputedStyle(element).position !== "absolute")
        .map((element) => element.getBoundingClientRect());
      const scale = strings[0].height / 24;
      const tolerance = Math.max(0.3, scale);
      const centers = strings.map((rect) => rect.y + rect.height / 2);
      const notes = [...row.firstElementChild.querySelectorAll("p")].filter(
        (element) => /^[A-G]$/.test(element.textContent),
      );
      if (
        notes.length !== 6 ||
        notes.some((element, index) => {
          const rect = element.getBoundingClientRect();
          return (
            Math.abs(rect.y + rect.height / 2 - centers[index]) > tolerance
          );
        })
      )
        failures.push("tuning is not centered on each string");
      for (const line of row.querySelectorAll(
        "[data-static-tab-measure-staff]",
      )) {
        const rect = line.getBoundingClientRect();
        if (
          Math.abs(rect.y - centers[0]) > tolerance ||
          Math.abs(rect.bottom - centers[5] - scale) > tolerance
        ) {
          failures.push(
            "measure line is not aligned with the first and last strings",
          );
        }
      }
    }
    for (const svg of pages.querySelectorAll(".print-tempo svg")) {
      const style = getComputedStyle(svg);
      if (
        Math.abs(parseFloat(style.height) - 22) > 0.05 ||
        parseFloat(style.width) > 12
      )
        failures.push("tempo icon dimensions are incorrect");
    }
    for (const svg of pages.querySelectorAll(".print-rhythm-guide svg")) {
      if (parseFloat(getComputedStyle(svg).height) > 16.05)
        failures.push("rhythm icon extends outside its guide");
    }
    return failures;
  });
  assert.deepEqual(
    notation,
    [],
    "tuning, measure lines and note-length icons must match the notation geometry",
  );
  return result;
}

async function assertFloatingActions() {
  const dialog = await page.getByRole("dialog").boundingBox();
  const actions = await page.locator("[data-print-actions]").boundingBox();
  assert.ok(
    Math.abs(dialog.x + dialog.width - actions.x - actions.width) <= 21,
  );
  assert.ok(
    Math.abs(dialog.y + dialog.height - actions.y - actions.height) <= 18,
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .locator(":scope > header, :scope > footer")
      .count(),
    0,
  );
}

async function assertShareOrder() {
  // Responsive metadata replaces the toolbar after the resize event.
  await page.waitForFunction(() => {
    const share = document
      .querySelector('button[aria-label="Share tab"]')
      ?.getBoundingClientRect();
    const print = document
      .querySelector('button[aria-label="Print tab"]')
      ?.getBoundingClientRect();
    return (
      share &&
      print &&
      share.width > 0 &&
      print.width > 0 &&
      print.x >= share.right &&
      Math.abs(print.y - share.y) < 1
    );
  });
}

try {
  await page.goto(`${baseURL}/create`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Tab block", exact: true })
    .waitFor({ timeout: 90000 });
  await page.evaluate((data) => {
    const store = window.__AUTOSTRUM_GET_TAB_STORE__();
    store.setTitle(data.title);
    store.setArtistName(data.artistName);
    store.setDescription(data.description);
    store.setTuning(data.tuning);
    store.setBpm(data.bpm);
    store.setCapo(data.capo);
    store.setKey(data.key);
    store.setChords(data.chords);
    store.setStrummingPatterns([
      data.tabData[1].data[0].data[0].strummingPattern,
    ]);
    store.setTabData((draft) => {
      draft.splice(0, draft.length, ...data.tabData);
    });
    store.setSectionProgression(data.sectionProgression);
    store.clearEditorHistory();
  }, fixture);
  await page.getByRole("button", { name: "Print tab", exact: true }).click();
  await ready();
  let result = await assertLayout();
  const scale = page.getByRole("slider", { name: "Tab scale", exact: true });
  assert.equal(await scale.getAttribute("aria-valuenow"), "85");
  assert.equal(await page.locator("[data-scale-mark]").count(), 17);
  await scale.press("ArrowRight");
  await ready();
  assert.equal(await scale.getAttribute("aria-valuenow"), "90");
  await scale.press("ArrowLeft");
  await ready();
  assert.equal(await scale.getAttribute("aria-valuenow"), "85");
  const ticks = await page
    .locator("[data-scale-slider]")
    .evaluate((element) => {
      const track = element
        .querySelector("[data-scale-track]")
        .getBoundingClientRect();
      const mark = element
        .querySelector("[data-scale-mark]")
        .getBoundingClientRect();
      return {
        trackHeight: track.height,
        markBottom: mark.bottom,
        trackBottom: track.bottom,
      };
    });
  assert.equal(ticks.trackHeight, 8);
  assert.ok(
    ticks.markBottom > ticks.trackBottom,
    "tick markers must extend below the range",
  );
  await exerciseSettingsFades();
  console.log(
    "PASS react-range keyboard controls, tick markers and top/bottom scroll fades",
  );
  assert.equal(await page.getByRole("dialog").getByRole("combobox").count(), 3);
  assert.equal(
    await page.locator("#print-layout").textContent(),
    "Compacted sections",
  );
  assert.equal(
    await page.getByText("Paper & size", { exact: true }).count(),
    0,
  );
  assert.deepEqual(
    await page
      .getByRole("dialog")
      .locator("legend")
      .filter({ hasText: /^(On the page|Sections to print)$/ })
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).paddingLeft),
      ),
    ["0px", "0px"],
  );
  await assertFloatingActions();
  assert.equal(await page.getByLabel("Tab scale", { exact: true }).count(), 1);
  assert.equal(await page.locator("#print-notes, #print-legend").count(), 0);
  assert.ok(result.text.includes("Tuning: D A D G B E"));
  for (const removed of [
    "AUTOSTRUM · PRACTICE TAB",
    "low to high",
    "Compact · each selected section once",
    "Notation key",
    "Practice notes",
  ]) {
    assert.ok(
      !result.text.includes(removed),
      `${removed} must be omitted from the printout`,
    );
  }
  assert.deepEqual(result.headings, ["1. Intro <&>", "2. Chorus", "3. Outro"]);
  assert.equal(result.columns, 80, "offscreen tab notes must all be printed");
  assert.equal(result.strums, 32);
  assert.ok(
    result.text.includes("95"),
    "measure tempo changes must be retained",
  );
  assert.ok(result.text.includes("17"), "the last note must be retained");
  assert.ok(
    result.text.includes("Gmaj7/B"),
    "full chord names must be retained",
  );
  assert.ok(
    !result.text.includes("Stale title") && !result.text.includes("Missing"),
  );
  assert.equal(
    await frame().locator("#print-pages .print-chord-diagram").count(),
    2,
  );
  await page.screenshot({ path: join(artifacts, "desktop-preview.png") });
  console.log(
    `PASS compact preview: ${result.count} pages, every tab column and strum retained`,
  );

  await page.locator("#print-colors").click();
  await ready();
  assert.notEqual(
    await frame()
      .locator("#print-pages .print-chord-name")
      .first()
      .evaluate((element) => getComputedStyle(element).color),
    "rgb(24, 24, 24)",
  );
  const appColorMode = await page.evaluate(
    () => window.__AUTOSTRUM_GET_TAB_STORE__().chordDisplayMode,
  );
  assert.equal(
    appColorMode,
    "text",
    "print colors must not change the app setting",
  );
  await page.locator("#print-left-handed").click();
  await ready();
  assert.ok(
    await frame()
      .locator("#print-pages")
      .textContent()
      .then((text) => text.includes("left-handed")),
  );
  console.log("PASS color, handedness and simplified print controls");

  await choosePrintOption("print-layout", "expanded");
  await ready();
  result = await assertLayout();
  assert.deepEqual(result.headings, [
    "1. Chorus (1/2)",
    "2. Chorus (2/2)",
    "3. Intro <&>",
    "4. Chorus",
  ]);
  assert.equal(
    result.columns,
    160,
    "expanded tab subsection repeats must be printed",
  );
  assert.equal(
    result.strums,
    384,
    "all section, subsection and sequence repeats must be expanded",
  );
  await page.locator("#print-expand").click();
  await ready();
  result = await assertLayout();
  assert.equal(result.columns, 80);
  assert.equal(result.strums, 64);
  console.log(
    "PASS saved playing order, stale references, and all repeat levels",
  );

  await choosePrintOption("print-paper", "a4");
  await choosePrintOption("print-orientation", "landscape");
  await setPrintScale(140);
  await ready();
  result = await assertLayout();
  await page.locator("#print-new-page").click();
  await ready();
  const starts = await frame().evaluate(() =>
    [...document.querySelectorAll("#print-pages .print-section-heading")].map(
      (heading) =>
        heading
          .closest(".print-page-content")
          .firstElementChild.contains(heading),
    ),
  );
  assert.ok(starts.slice(1).every(Boolean));
  console.log("PASS A4, landscape, 140% scaling and section page breaks");

  // Export the exact frame document through Chromium's print engine. Catch
  // fractional paper-size rounding that can otherwise add blank PDF pages.
  const pdfPage = await context.newPage();
  for (const paper of ["letter", "a4"]) {
    for (const orientation of ["portrait", "landscape"]) {
      await choosePrintOption("print-paper", paper);
      await choosePrintOption("print-orientation", orientation);
      for (const scale of [60, 100, 140]) {
        await setPrintScale(scale);
        await ready();
        await assertLayout();
      }
      const expectedPages = (await metrics()).count;
      // Materialize CSSOM rules: development stylesheets can contain rules
      // inserted by JavaScript that frame.content() does not serialize.
      const html = await frame().evaluate(() => {
        const css = [...document.styleSheets]
          .filter((sheet) => !sheet.disabled)
          .map((sheet) =>
            [...sheet.cssRules].map((rule) => rule.cssText).join("\n"),
          )
          .join("\n");
        return `<!doctype html><html><head><style>${css}</style></head><body>${document.body.innerHTML}</body></html>`;
      });
      await pdfPage.setContent(html, { waitUntil: "networkidle" });
      assert.equal(
        await pdfPage
          .locator("[data-print-tab-row]")
          .first()
          .evaluate((element) => getComputedStyle(element).display),
        "flex",
      );
      const pdf = await pdfPage.pdf({
        path: join(artifacts, `${paper}-${orientation}.pdf`),
        preferCSSPageSize: true,
        printBackground: true,
      });
      const actualPages = [
        ...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g),
      ].length;
      assert.equal(
        actualPages,
        expectedPages,
        `${paper} ${orientation}: PDF pages must match preview pages`,
      );
    }
  }
  await pdfPage.close();
  console.log(
    "PASS all paper/orientation combinations at 60%, 100% and 140%; PDF pages match the preview",
  );

  // Verify the print action targets this exact document and remains reusable.
  await frame().evaluate(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls++;
    };
  });
  await printButton().click();
  await printButton().click();
  assert.equal(await frame().evaluate(() => window.__printCalls), 2);
  await page.locator("#print-scale").focus();
  await page.keyboard.press("Control+p");
  assert.equal(
    await frame().evaluate(() => window.__printCalls),
    3,
    "the keyboard shortcut must print the tab document",
  );
  await page.emulateMedia({ media: "print" });
  assert.equal(
    await frame()
      .locator("#print-source")
      .evaluate((element) => getComputedStyle(element).display),
    "none",
  );
  assert.equal(
    await frame()
      .locator("#print-pages")
      .evaluate((element) => getComputedStyle(element).zoom),
    "1",
  );
  await assertLayout();
  await page.emulateMedia({ media: "screen" });
  console.log(
    "PASS isolated print action, repeat printing and actual print-media layout",
  );

  await page.getByRole("button", { name: "Clear", exact: true }).click();
  assert.equal(await printButton().isDisabled(), true);
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await ready();
  await page
    .getByRole("button", { name: "Reset settings", exact: true })
    .click();
  await ready();
  await page.getByLabel("3. Outro", { exact: true }).uncheck();
  await ready();
  assert.equal((await metrics()).headings.length, 2);
  await closePrintDialog("close", true);
  assert.equal(await page.getByRole("dialog").count(), 0);
  console.log(
    "PASS section selection, empty selection, reset and cancellation",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Print tab", exact: true }).click();
  await ready();
  await assertLayout();
  const dialogBox = await page.getByRole("dialog").boundingBox();
  assert.ok(Math.abs(dialogBox.x) < 1 && Math.abs(dialogBox.y) < 1);
  assert.equal(dialogBox.width, 390);
  assert.equal(dialogBox.height, 844);
  await assertFloatingActions();
  assert.ok(await printButton().isVisible());
  await page.screenshot({ path: join(artifacts, "mobile-preview.png") });
  await closePrintDialog("close", true);
  // No progression: expanded output must fall back to the document order.
  await page.evaluate(() =>
    window.__AUTOSTRUM_GET_TAB_STORE__().setSectionProgression([]),
  );
  await page.getByRole("button", { name: "Print tab", exact: true }).click();
  await ready();
  await choosePrintOption("print-layout", "expanded");
  await ready();
  assert.deepEqual((await metrics()).headings, [
    "1. Intro <&>",
    "2. Chorus",
    "3. Outro",
  ]);
  console.log("PASS mobile preview and progression fallback");
  await closePrintDialog();
  // The published view uses a separate metadata component and virtualizes
  // offscreen sections. Its Print entry must still include the whole tab.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/dev-virtualization-harness?fixture=realistic`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('#devVirtualizationHarness[data-ready="true"]').waitFor();
  await assertShareOrder();
  const expected = await page.evaluate(() => {
    const state = window.__AUTOSTRUM_GET_TAB_STORE__();
    return {
      sections: state.tabData.length,
      notes: state.tabData
        .flatMap((section) => section.data)
        .filter((sub) => sub.type === "tab")
        .flatMap((sub) => sub.data)
        .filter((column) => column.type === "note").length,
    };
  });
  await page.getByRole("button", { name: "Print tab", exact: true }).click();
  await ready();
  result = await assertLayout();
  assert.equal(result.headings.length, expected.sections);
  assert.equal(result.columns, expected.notes);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset settings", exact: true })
    .click();
  await ready();
  assert.equal((await metrics()).columns, expected.notes);
  console.log(
    "PASS published-view entry, offscreen sections and resetting an empty preview",
  );
  await closePrintDialog();
  await page.setViewportSize({ width: 390, height: 844 });
  await assertShareOrder();
  await page.getByRole("button", { name: "Print tab", exact: true }).click();
  await ready();
  await assertFloatingActions();
  await closePrintDialog();
  // Cover measures with/without tempo changes both inside and outside PM spans.
  await page.goto(`${baseURL}/dev-virtualization-harness?fixture=bpm`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('#devVirtualizationHarness[data-ready="true"]').waitFor();
  await page.getByRole("button", { name: "Print tab", exact: true }).click();
  await ready();
  await assertLayout();
  console.log(
    "PASS Share/Print order on both viewports and all measure-line states",
  );
  await closePrintDialog("escape", true);
  await page.getByRole("button", { name: "Print tab", exact: true }).click();
  await ready();
  await closePrintDialog("close", true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#sectionIndex0").scrollIntoViewIfNeeded();
  await page.locator("#stickyBottomControls button").last().click();
  const zoom = page.getByRole("slider", { name: "Zoom", exact: true });
  const initialZoom = Number(await zoom.getAttribute("aria-valuenow"));
  assert.equal(
    await zoom
      .locator("xpath=ancestor::*[@data-scale-slider]")
      .locator("[data-scale-mark]")
      .count(),
    11,
  );
  await zoom.press("ArrowRight");
  assert.equal(
    Number(await zoom.getAttribute("aria-valuenow")),
    Number((initialZoom + 0.1).toFixed(1)),
  );
  await zoom.press("ArrowLeft");
  assert.equal(Number(await zoom.getAttribute("aria-valuenow")), initialZoom);
  console.log(
    "PASS existing Zoom control retains its styling, ticks and keyboard behavior",
  );
  console.log(
    "PASS smooth exit on desktop/mobile, Escape and Close; reopening restores the preview",
  );
  assert.deepEqual(errors, [], "no uncaught browser errors");
  console.log(`Print verification passed. Screenshots: ${artifacts}`);
} catch (error) {
  await page.screenshot({ path: join(artifacts, "failure.png") });
  throw error;
} finally {
  await browser.close();
}
