// Run against a dev server: node scripts/verifyFeatureShowcase.mjs [baseURL]
// Exercises the real editor components and checks that demos leave drafts and
// preferences alone. Screenshots are written to the ignored coverage directory.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const artifacts = "coverage/feature-showcase";
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 950 },
});
await context.addInitScript(() => {
  // A pre-existing draft catches accidental reads/writes to the global store.
  localStorage.setItem(
    "autostrum-tabData",
    JSON.stringify({
      title: "Unpublished riff",
      artistId: null,
      description: null,
      genre: "Rock",
      tuning: "e2 a2 d3 g3 b3 e4",
      bpm: 96,
      capo: 0,
      key: null,
      difficulty: 1,
      chords: [],
      strummingPatterns: [],
      sectionProgression: [],
      tabData: [
        {
          id: "saved-section",
          title: "Verse",
          data: [
            {
              id: "saved-tab",
              type: "tab",
              bpm: -1,
              repetitions: 1,
              baseNoteLength: "quarter",
              data: [7, 8].map((fret, index) => ({
                id: `saved-note-${index}`,
                type: "note",
                palmMute: "",
                firstString: String(fret),
                secondString: "",
                thirdString: "",
                fourthString: "",
                fifthString: "",
                sixthString: "",
                chordEffects: "",
                noteLength: "quarter",
              })),
            },
          ],
        },
      ],
    }),
  );
});
await context.addInitScript(() => {
  const AudioContextBase = window.AudioContext;
  window.__demoAudioContexts = [];
  window.AudioContext = class extends AudioContextBase {
    constructor(...args) {
      super(...args);
      window.__demoAudioContexts.push(this);
    }
  };
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const section = page.locator('[aria-labelledby="platform-features-heading"]');
const panel = (feature) => page.locator(`#feature-panel-${feature}`);
const selectedSlide = page.locator(
  '[aria-roledescription="slide"][aria-hidden="false"]',
);
const prefs = () =>
  page.evaluate(() =>
    JSON.stringify(
      Object.entries(localStorage)
        .filter(([key]) => key.startsWith("autostrum"))
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
async function select(feature) {
  await page.locator(`#feature-tab-${feature}`).click();
  await panel(feature).waitFor({ state: "visible" });
  await page.waitForTimeout(300);
}
async function assertFits(locator) {
  const fits = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement.getBoundingClientRect();
    return (
      rect.left >= parent.left - 1 &&
      rect.right <= parent.right + 1 &&
      rect.top >= parent.top - 1 &&
      rect.bottom <= parent.bottom + 1 &&
      element.scrollWidth <= element.clientWidth + 1
    );
  });
  assert.ok(fits, "Demo fits inside its presentation frame");
}

try {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await section.waitFor();
  await page.waitForTimeout(1200);
  const before = await prefs();
  await section.scrollIntoViewIfNeeded();
  await section.getByRole("button", { name: "Editing", exact: true }).click();
  await select("navigation");
  await page.locator("#input-14-0-0-1").click();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "input-14-0-1-1",
  );
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "input-14-0-1-2",
  );
  await select("hotkeys");
  const firstNote = page.locator("#input-16-0-0-1");
  await firstNote.click();
  await page.keyboard.press("Shift+G");
  const chordValues = (column) =>
    panel("hotkeys")
      .locator(`input[id^="input-16-0-${column}-"]`)
      .evaluateAll((inputs) => inputs.map((input) => input.value));
  const insertedChord = await chordValues(0);
  assert.ok(
    insertedChord.slice(0, 6).every((value) => value !== ""),
    "Native major-chord shortcut fills six strings",
  );
  await page.keyboard.press("Control+c");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Control+v");
  assert.deepEqual(
    await chordValues(1),
    insertedChord,
    "Native chord copy/paste",
  );
  await page.keyboard.press("w");
  assert.equal(
    await panel("hotkeys").locator("input").count(),
    49,
    "Native insertion adds a column",
  );
  await page.keyboard.press("Shift+ArrowUp");
  await assertFits(panel("hotkeys").locator("[data-feature-demo]"));
  await page.setViewportSize({ width: 768, height: 950 });
  await assertFits(panel("hotkeys").locator("[data-feature-demo]"));
  await panel("hotkeys").screenshot({ path: `${artifacts}/hotkeys.png` });
  console.log("PASS: native editor navigation, hotkeys, and desktop sizing");

  await select("tuning");
  await panel("tuning").locator("input").fill("D A D G A D");
  await panel("tuning")
    .getByRole("button", { name: "Convert", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll("#feature-panel-tuning input").length === 6,
  );
  assert.deepEqual(
    await panel("tuning")
      .locator("input")
      .evaluateAll((inputs) => inputs.map((input) => input.value)),
    ["D2", "A2", "D3", "G3", "A3", "D4"],
  );
  await panel("tuning")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  assert.ok(
    await panel("tuning")
      .getByRole("button", { name: "Save", exact: true })
      .isDisabled(),
  );
  await assertFits(panel("tuning").locator("[data-feature-demo]"));
  console.log("PASS: native tuning conversion and save");

  await page.setViewportSize({ width: 1280, height: 950 });
  await select("autoscroll");
  await panel("autoscroll")
    .getByRole("button", { name: "Play example", exact: true })
    .click();
  await panel("autoscroll")
    .getByRole("button", { name: "Pause example", exact: true })
    .waitFor();
  const pageY = await page.evaluate(() => window.scrollY);
  await page.waitForFunction(
    () =>
      document.querySelector(
        "#feature-panel-autoscroll [data-feature-editor-scroll]",
      ).scrollTop > 100,
    null,
    { timeout: 12000 },
  );
  assert.equal(
    await page.evaluate(() => window.scrollY),
    pageY,
    "Autoscroll stays inside the demo",
  );
  await panel("autoscroll")
    .getByRole("switch", { name: "Autoscroll", exact: true })
    .click();
  await panel("autoscroll")
    .locator("[data-feature-editor-scroll]")
    .evaluate((element) => {
      element.scrollTop = 0;
    });
  await page.waitForTimeout(2500);
  assert.equal(
    await panel("autoscroll")
      .locator("[data-feature-editor-scroll]")
      .evaluate((element) => element.scrollTop),
    0,
  );
  await page.evaluate(() => {
    window.__activeDemoContext = window.__demoAudioContexts.at(-1);
  });
  await select("navigation");
  assert.equal(
    await page.evaluate(() => window.__activeDemoContext.state),
    "closed",
    "Leaving a demo closes its audio session",
  );
  assert.equal(
    await prefs(),
    before,
    "Editor demos leave drafts and preferences untouched",
  );
  console.log(
    "PASS: real audio, contained autoscroll, toggle, and audio cleanup",
  );

  await section.getByRole("button", { name: "Practice", exact: true }).click();
  await select("colors");
  const coloredPills = () =>
    panel("colors").locator('[style*="background-color: rgb"]').count();
  assert.equal(await coloredPills(), 4);
  await panel("colors")
    .getByRole("switch", { name: "Color-coded chords", exact: true })
    .click();
  assert.equal(await coloredPills(), 0);
  await select("speed");
  await panel("speed").locator('button[aria-haspopup="dialog"]').click();
  const speedSlider = page.getByRole("slider", {
    name: "Slider to control the playback speed",
    exact: true,
  });
  await speedSlider.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await speedSlider.getAttribute("aria-valuenow"), "0.8");
  await page.keyboard.press("Escape");
  console.log("PASS: native chord colors and granular speed control");

  await page.setViewportSize({ width: 390, height: 844 });
  const carousel = section.getByRole("region");
  await carousel.focus();
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(700);
  assert.match(await selectedSlide.getAttribute("aria-label"), /Loop the part/);
  await selectedSlide
    .getByRole("button", { name: "Set loop range", exact: true })
    .click();
  await selectedSlide.locator("[data-loop-range-node]").first().click();
  await selectedSlide.locator("[data-loop-range-node]").nth(2).click();
  await selectedSlide
    .getByRole("button", { name: "Save", exact: true })
    .click();
  assert.equal(
    await selectedSlide.locator("div.opacity-50").count(),
    1,
    "Native range dims the omitted chord",
  );
  await selectedSlide
    .getByRole("button", { name: "Set loop range", exact: true })
    .click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(500);
    await assertFits(selectedSlide.locator("[data-feature-demo]"));
    const neighbors = await carousel
      .locator("article")
      .evaluateAll((slides) => {
        const width = slides[0].parentElement.parentElement.clientWidth;
        return slides.filter((slide) => {
          const rect = slide.getBoundingClientRect();
          return rect.right > 0 && rect.left < width;
        }).length;
      });
    assert.equal(
      neighbors,
      3,
      "Centered pane has visible neighbors on both sides",
    );
  }
  await section.screenshot({ path: `${artifacts}/mobile-loop.png` });
  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  assert.match(
    await selectedSlide.getAttribute("aria-label"),
    /Adjustable zoom/,
  );
  const zoomSlider = selectedSlide.getByRole("slider", {
    name: "Zoom",
    exact: true,
  });
  await zoomSlider.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await zoomSlider.getAttribute("aria-valuenow"), "1.1");
  assert.match(
    await selectedSlide.getAttribute("aria-label"),
    /Adjustable zoom/,
    "Slider keys do not change panes",
  );
  assert.equal(
    await prefs(),
    before,
    "Practice demos leave drafts and preferences untouched",
  );
  for (const feature of ["zoom", "colors", "speed", "loop"]) {
    assert.equal(
      await selectedSlide
        .locator("[data-feature-demo]")
        .getAttribute("data-feature-demo"),
      feature,
    );
    await assertFits(selectedSlide.locator("[data-feature-demo]"));
    await carousel.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
  }
  // A fast, long drag still advances one pane.
  await carousel.scrollIntoViewIfNeeded();
  const bounds = await selectedSlide.boundingBox();
  const dragY = bounds.y + bounds.height - 70;
  await page.mouse.move(bounds.x + bounds.width - 40, dragY);
  await page.mouse.down();
  await page.mouse.move(bounds.x - 220, dragY, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  assert.match(
    await selectedSlide.getAttribute("aria-label"),
    /Color-coded chords/,
  );
  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  await selectedSlide.locator('button[aria-haspopup="dialog"]').click();
  const popupBounds = await page
    .locator("[data-radix-popper-content-wrapper]")
    .boundingBox();
  assert.ok(
    popupBounds.x >= 0 && popupBounds.x + popupBounds.width <= 320,
    "Native speed popover fits narrow mobile screens",
  );
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(
    "PASS: mobile range controls, infinite carousel, neighbor panes, and isolated preferences",
  );
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto(`${baseURL}/create`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#title").inputValue(), "Unpublished riff");
  assert.equal(await page.locator("#input-0-0-0-1").inputValue(), "7");
  await page.locator("#input-0-0-0-1").click();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "input-0-0-1-1",
  );
  await page.locator("#input-0-0-1-1").fill("9");
  assert.equal(await page.locator("#input-0-0-1-1").inputValue(), "9");
  await page.locator("#tuning").click();
  await page
    .getByRole("button", { name: "Add a custom tuning", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  assert.ok(
    await page
      .getByRole("dialog")
      .getByPlaceholder("C# B E F# A# E")
      .isVisible(),
  );
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, [], "Original editor has no browser runtime errors");
  console.log(
    "PASS: original editor draft recovery, note editing, and tuning dialog",
  );
} finally {
  await browser.close();
}
