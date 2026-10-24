// Start npm run dev, then: node scripts/verifyChordSequenceSelects.mjs [baseURL]
// Local drafts only; no remote records are created.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const artifactDirectory = join(tmpdir(), "autostrum-chord-selects");
mkdirSync(artifactDirectory, { recursive: true });
const pattern = {
  id: crypto.randomUUID(),
  baseNoteLength: "eighth",
  strums: ["v", "v", "^", "r", "v", "s", "^", "v"].map((strum) => ({
    palmMute: "",
    strum,
    noteLength: "eighth",
  })),
};
const draft = {
  title: "Chord select verification",
  artistId: null,
  description: null,
  genre: "rock",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 120,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: ["C", "G"].map((name) => ({
    id: crypto.randomUUID(),
    name,
    color: "#E93D82",
    frets: ["0", "0", "0", "0", "0", "0"],
  })),
  strummingPatterns: [pattern],
  tabData: [
    {
      id: crypto.randomUUID(),
      title: "Section 1",
      data: [
        {
          id: crypto.randomUUID(),
          type: "chord",
          bpm: -1,
          repetitions: 1,
          data: [["", "C", "", "", "G", "", "", ""], Array(8).fill("")].map(
            (data) => ({
              id: crypto.randomUUID(),
              bpm: -1,
              repetitions: 1,
              strummingPattern: pattern,
              data,
            }),
          ),
        },
      ],
    },
  ],
  sectionProgression: [],
};
const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
let page;

async function openDraft(data, width = 1200) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  await context.route("**/api/trpc/**", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 403,
          body: "Verification uses local state only",
        })
      : route.continue(),
  );
  await context.addInitScript(() => {
    window.__selectAudioSources = [];
    const Base = window.AudioContext;
    window.AudioContext = class extends Base {
      constructor(...args) {
        super(...args);
        const createSource = this.createBufferSource.bind(this);
        this.createBufferSource = (...args) => {
          const source = createSource(...args);
          source.addEventListener("ended", () => {
            source.__ended = true;
          });
          window.__selectAudioSources.push(source);
          return source;
        };
      }
    };
  });
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/create`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Tab block", exact: true }).waitFor();
  await page.evaluate((data) => {
    const store = window.__AUTOSTRUM_GET_TAB_STORE__();
    store.setBpm(data.bpm);
    store.setChords(data.chords);
    store.setStrummingPatterns(data.strummingPatterns);
    store.setTabData((draft) => {
      draft.splice(0, draft.length, ...data.tabData);
    });
    store.clearEditorHistory();
  }, data);
  await trigger(0).waitFor();
  return context;
}

const trigger = (index, sequence = 0) =>
  page
    .locator(`#section0-subSection0-chordSequence${sequence}-chord${index}`)
    .getByRole("combobox")
    .last();

async function expectChord(index, name, opacity, sequence = 0) {
  await page.waitForFunction(
    ({ index, name, opacity, sequence }) => {
      const value = document.querySelector(
        `#section0-subSection0-chordSequence${sequence}-chord${index} [role=combobox] > span > span`,
      );
      return (
        value?.textContent === name &&
        Number(getComputedStyle(value).opacity) === opacity
      );
    },
    { index, name, opacity, sequence },
  );
}

try {
  const context = await openDraft(draft);
  await expectChord(0, "", 1);
  await expectChord(1, "C", 1);
  await expectChord(2, "C", 0.5);
  await expectChord(4, "G", 1);
  await expectChord(6, "G", 0.5);
  await expectChord(7, "G", 0.5);
  await expectChord(0, "", 1, 1);
  await trigger(2).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await trigger(2).click();
  assert.equal(
    await page.getByRole("option", { name: "No chord", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("option", { name: "C", exact: true })
      .locator(".lucide-check")
      .evaluate((el) => getComputedStyle(el).opacity),
    "0.5",
  );
  assert.equal(
    await page
      .getByRole("option", { name: "G", exact: true })
      .locator(".lucide-check")
      .count(),
    0,
  );
  await page.screenshot({
    path: join(artifactDirectory, "inherited.png"),
    animations: "disabled",
  });
  // Choosing the inherited item must still create an explicit assignment.
  await page.getByRole("option", { name: "C", exact: true }).click();
  await expectChord(2, "C", 1);
  await trigger(2).click();
  assert.equal(
    await page
      .getByRole("option", { name: "C", exact: true })
      .locator(".lucide-check")
      .evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__AUTOSTRUM_GET_TAB_STORE__().undo());
  await expectChord(2, "C", 0.5);
  await trigger(1).click();
  await page.getByRole("option", { name: "G", exact: true }).click();
  await expectChord(1, "G", 1);
  await expectChord(2, "G", 0.5);
  assert.deepEqual(
    await page.evaluate(
      () =>
        window.__AUTOSTRUM_GET_TAB_STORE__().tabData[0].data[0].data[0].data,
    ),
    ["", "G", "", "", "G", "", "", ""],
  );
  console.log(
    "PASS: inherited/explicit values and checkmarks, undo, and sequence boundaries",
  );

  // Use native Web Audio to reproduce the reported callback failure after an
  // Immer document edit, once at natural completion and once while pausing.
  await page.evaluate(() =>
    window.__AUTOSTRUM_GET_TAB_STORE__().ensureAudioSystemReady(),
  );
  for (const pause of [false, true]) {
    await page.evaluate(() => {
      window.__selectAudioSources = [];
      void window.__AUTOSTRUM_GET_TAB_STORE__().playPreview({
        data: ["0", "0", "0", "0", "0", "0"],
        index: -1,
        type: "chord",
        customBpm: "240",
      });
    });
    await page.waitForFunction(() => window.__selectAudioSources.length === 6);
    await page.evaluate((pause) => {
      const store = window.__AUTOSTRUM_GET_TAB_STORE__();
      store.setTabData((data) => {
        data[0].data[0].data[0].data[1] = pause ? "C" : "G";
      });
      if (pause) store.pauseAudio();
    }, pause);
    await page.waitForFunction(() =>
      window.__selectAudioSources.every((source) => source.__ended),
    );
    assert.deepEqual(
      errors,
      [],
      "Audio callbacks must remain writable after document edits",
    );
  }
  console.log(
    "PASS: all six native audio callbacks finish after editing, including pause",
  );
  await page.evaluate(() => {
    const store = window.__AUTOSTRUM_GET_TAB_STORE__();
    window.__selectAudioSources = [];
    store.setLooping(false);
    void store.playTab({ location: { sectionIndex: 0 } });
  });
  await page.waitForFunction(() => window.__selectAudioSources.length >= 6);
  await page.evaluate(() => {
    const store = window.__AUTOSTRUM_GET_TAB_STORE__();
    store.setTabData((data) => {
      data[0].data[0].data[0].data[1] = "G";
    });
    store.resetStoreToInitValues();
  });
  await page.waitForFunction(() =>
    window.__selectAudioSources.every((source) => source.__ended),
  );
  assert.deepEqual(
    errors,
    [],
    "Reset must cancel playback resources after editor mutations",
  );
  console.log("PASS: full playback cancellation and store reset after editing");
  await context.close();

  for (const keyboard of [false, true]) {
    const empty = structuredClone(draft);
    empty.chords = [];
    empty.tabData[0].data[0].data.forEach((sequence) => {
      sequence.data.fill("");
    });
    const emptyContext = await openDraft(empty, keyboard ? 390 : 1200);
    await trigger(1).click();
    await page.getByText("No chords available", { exact: true }).waitFor();
    assert.equal(await page.getByRole("option").count(), 1);
    if (keyboard) {
      await page.screenshot({
        path: join(artifactDirectory, "empty-mobile.png"),
        animations: "disabled",
      });
    }
    if (keyboard) {
      await page.keyboard.press("Escape");
      assert.ok(
        await trigger(1).evaluate((el) => el === document.activeElement),
      );
      await page.keyboard.press("Enter");
      await page
        .getByRole("option", { name: "Add one", exact: true })
        .waitFor();
      await page.keyboard.press("Enter");
    } else {
      await page.getByRole("option", { name: "Add one", exact: true }).click();
    }
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.ok(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    );
    await dialog.getByLabel("Chord name", { exact: true }).fill("Em");
    await dialog.locator("#input-chordModal-chordModal-0").fill("0");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await trigger(1).click();
    await page.getByRole("option", { name: "Em", exact: true }).click();
    await expectChord(1, "Em", 1);
    await expectChord(2, "Em", 0.5);
    assert.deepEqual(errors, []);
    await emptyContext.close();
  }
  console.log(
    "PASS: desktop/mobile empty menus, mouse/keyboard Add one, dialog focus, and saved chord selection",
  );
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({
      path: join(artifactDirectory, "failure.png"),
      fullPage: true,
    });
    console.error((await page.locator("body").innerText()).slice(-5000));
  }
  throw error;
} finally {
  await browser.close();
}
