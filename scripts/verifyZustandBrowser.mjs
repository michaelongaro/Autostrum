// With npm run dev: node scripts/verifyZustandBrowser.mjs [baseURL]
// Isolated guest context; no tabs are published or remote records created.
import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/dev-virtualization-harness?fixture=bpm`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => typeof window.__AUTOSTRUM_GET_TAB_STORE__ === "function",
  );
  await page.evaluate(() => {
    window.__firstContext = window
      .__AUTOSTRUM_GET_TAB_STORE__()
      .initializeAudioSystem();
  });
  await page.waitForFunction(
    () => window.__AUTOSTRUM_GET_TAB_STORE__().countInBuffer !== null,
  );
  await page.evaluate(async () => {
    await window.__firstContext.close();
    window.__secondContext = window
      .__AUTOSTRUM_GET_TAB_STORE__()
      .initializeAudioSystem();
  });
  await page.waitForFunction(() => {
    const state = window.__AUTOSTRUM_GET_TAB_STORE__();
    return (
      state.audioContext === window.__secondContext &&
      state.countInBuffer !== null
    );
  });
  assert.equal(
    await page.evaluate(() => window.__firstContext !== window.__secondContext),
    true,
  );
  await page.evaluate(() =>
    window.__AUTOSTRUM_GET_TAB_STORE__().disposeAudioSystem(),
  );

  await page.goto(`${baseURL}/create`, { waitUntil: "domcontentloaded" });
  await page.locator("#mainTabComponent").waitFor();
  await page.evaluate(() => {
    const state = window.__AUTOSTRUM_GET_TAB_STORE__();
    state.setChords([
      {
        id: "test-chord",
        name: "C",
        color: "#46A758",
        frets: ["0", "1", "0", "2", "3", "x"],
      },
    ]);
    state.setStrummingPatterns([
      {
        id: "test-pattern",
        baseNoteLength: "eighth",
        strums: Array.from({ length: 4 }, () => ({
          palmMute: "",
          strum: "v",
          noteLength: "eighth",
        })),
      },
    ]);
    state.setChordBeingEdited({
      index: 0,
      value: state.chords[0] ?? window.__AUTOSTRUM_GET_TAB_STORE__().chords[0],
    });
  });
  const chordDialog = page.getByRole("dialog", {
    name: "Chord editor dialog",
    exact: true,
  });
  await chordDialog.waitFor();
  const name = chordDialog.getByLabel("Chord name", { exact: true });
  await name.fill("Dm");
  await expect(name).toHaveValue("Dm");
  await name.press("Control+z");
  await expect(name).toHaveValue("C");
  await page.keyboard.press("Escape");
  await chordDialog.waitFor({ state: "detached" });

  await page.evaluate(() => {
    const state = window.__AUTOSTRUM_GET_TAB_STORE__();
    state.setStrummingPatternBeingEdited({
      index: 0,
      value: state.strummingPatterns[0],
    });
  });
  const patternDialog = page.getByRole("dialog", {
    name: "Strumming pattern editor dialog",
    exact: true,
  });
  await patternDialog.waitFor();
  await expect(
    patternDialog.getByText("Preview", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await patternDialog.waitFor({ state: "detached" });

  await page.evaluate(() =>
    window.__AUTOSTRUM_GET_TAB_STORE__().setShowSectionProgressionDialog(true),
  );
  const progressionDialog = page.getByRole("dialog", {
    name: "Section progression dialog",
    exact: true,
  });
  await progressionDialog.waitFor();
  const repeat = progressionDialog.getByPlaceholder("1", { exact: true });
  await expect(repeat).toHaveValue("1");
  await repeat.fill("3");
  await repeat.press("Control+z");
  await expect(repeat).toHaveValue("1");
  await page.keyboard.press("Escape");
  await progressionDialog.waitFor({ state: "detached" });
  await page.evaluate(() =>
    window.__AUTOSTRUM_GET_TAB_STORE__().setShowSectionProgressionDialog(true),
  );
  await progressionDialog.waitFor();
  await expect(repeat).toHaveValue("1");
  await page.keyboard.press("Escape");
  await progressionDialog.waitFor({ state: "detached" });

  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator("#feature-panel-zoom").scrollIntoViewIfNeeded();
  await page
    .locator('#feature-panel-zoom [data-feature-demo="zoom"]')
    .waitFor();
  await page.getByRole("button", { name: "Compose", exact: true }).click();
  const demo = page.locator(
    '#feature-panel-hotkeys [data-feature-demo="hotkeys"]',
  );
  const fret = demo.locator('input[id$="-1"]').first();
  await fret.waitFor();
  const globalDocument = await page.evaluate(() => {
    const state = window.__AUTOSTRUM_GET_TAB_STORE__();
    return JSON.stringify({
      title: state.title,
      tabData: state.tabData,
      chords: state.chords,
    });
  });
  await fret.fill("5");
  await expect(fret).toHaveValue("5");
  assert.equal(
    await page.evaluate(() => {
      const state = window.__AUTOSTRUM_GET_TAB_STORE__();
      return JSON.stringify({
        title: state.title,
        tabData: state.tabData,
        chords: state.chords,
      });
    }),
    globalDocument,
    "Embedded edits use their provider's session",
  );

  assert.deepEqual(
    errors,
    [],
    "No runtime errors during audio recovery or dialog lifecycle",
  );
  console.log(
    "PASS: native audio-context replacement, dialog lifecycle/undo, and embedded session isolation",
  );
} finally {
  await browser.close();
}
