/**
 * Note-length beam grouping, plus flag width in the dev harness.
 *
 *   node --experimental-strip-types scripts/verifyNoteLengthBeaming.mjs
 *   node --experimental-strip-types scripts/verifyNoteLengthBeaming.mjs --logic-only
 *   node --experimental-strip-types scripts/verifyNoteLengthBeaming.mjs http://127.0.0.1:3000
 *
 * The browser half needs `npm run dev` and checks the real renderer at
 * /dev-beam-harness: connecting beams meet, partial beams stay short
 * enough that a broken group does not look connected, and flags/beamlets
 * stay flush with the stem.
 */

import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  beamBreaksForNoteSpans,
  resolveBeamBreaks,
} from "../src/utils/noteLengthBeamingCore.ts";

const args = process.argv.slice(2);
const logicOnly = args.includes("--logic-only");
const baseURL =
  args.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:3000";

const LENGTHS = {
  e: "eighth",
  s: "sixteenth",
  q: "quarter",
  de: "eighth dotted",
  h: "half",
  dq: "quarter dotted",
};

function events(pattern) {
  return pattern.map((token) => ({
    noteLength: token === "r" ? "eighth" : LENGTHS[token],
    isRest: token === "r",
  }));
}

/** "e-e|e" means the first two connect and the third does not. */
function signature(pattern) {
  const breaks = resolveBeamBreaks(events(pattern));
  return pattern
    .map((token, index) => {
      const join = breaks[index]?.breakWithNext ? "|" : "-";
      return `${token}${index === pattern.length - 1 ? "" : join}`;
    })
    .join("");
}

let passed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (error) {
    console.error(`  FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log("note-length beam grouping");

check("eight eighths beam as pairs", () => {
  assert.equal(
    signature(["e", "e", "e", "e", "e", "e", "e", "e"]),
    "e-e|e-e|e-e|e-e",
  );
});

check("eight sixteenths beam as two groups of four", () => {
  assert.equal(
    signature(["s", "s", "s", "s", "s", "s", "s", "s"]),
    "s-s-s-s|s-s-s-s",
  );
});

check("dotted eighth + sixteenth stays paired", () => {
  assert.equal(signature(["de", "s", "de", "s"]), "de-s|de-s");
});

check("eighth + two sixteenths fills one beat", () => {
  assert.equal(signature(["e", "s", "s", "e", "s", "s"]), "e-s-s|e-s-s");
});

check("a single compound cell stays in simple meter", () => {
  assert.equal(signature(["de", "s", "e"]), "de-s|e");
});

check("a repeated compound cell beams in threes", () => {
  assert.equal(signature(["de", "s", "e", "de", "s", "e"]), "de-s-e|de-s-e");
});

check("quarters separate eighth pairs", () => {
  assert.equal(signature(["e", "e", "q", "e", "e"]), "e-e|q|e-e");
});

check("an eighth rest keeps the following eighths on their own beats", () => {
  assert.equal(signature(["e", "e", "r", "e", "e"]), "e-e|r|e|e");
});

check("three eighths read as a pair plus a flag", () => {
  assert.equal(signature(["e", "e", "e"]), "e-e|e");
});

check("six eighths stay in simple pairs", () => {
  assert.equal(signature(["e", "e", "e", "e", "e", "e"]), "e-e|e-e|e-e");
});

check("a half note occupies two beats before the next pair", () => {
  assert.equal(signature(["h", "e", "e"]), "h|e-e");
});

check("dotted quarter does not beam the two eighths after it", () => {
  assert.equal(signature(["dq", "e", "e"]), "dq|e|e");
});

check("one syncopated group does not rebeam a simple measure", () => {
  assert.equal(
    signature(["e", "e", "e", "e", "s", "s", "s", "e", "s", "e", "e"]),
    "e-e|e-e|s-s-s-e|s-e|e",
  );
});

check("measure lines reset the beat grid", () => {
  const row = [
    { type: "note", noteLength: "sixteenth", chordEffects: "" },
    { type: "note", noteLength: "sixteenth", chordEffects: "" },
    { type: "measureLine" },
    { type: "note", noteLength: "sixteenth", chordEffects: "" },
    { type: "note", noteLength: "sixteenth", chordEffects: "" },
  ];
  const breaks = beamBreaksForNoteSpans(row);
  assert.equal(breaks[0].breakWithNext, false);
  assert.equal(breaks[1].breakWithPrevious, false);
  assert.equal(breaks[1].breakWithNext, true);
  assert.equal(breaks[3].breakWithPrevious, true);
  assert.equal(breaks[3].breakWithNext, false);
  assert.equal(breaks[4].breakWithPrevious, false);
});

if (process.exitCode) {
  console.error("\nBeam grouping checks failed.");
  process.exit(process.exitCode);
}

console.log(`\n${passed} grouping checks passed.`);

if (logicOnly) {
  process.exit(0);
}

function nearly(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, got ${actual}`,
  );
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 800 } });

try {
  console.log("\nnote-length beam geometry");
  await page.goto(`${baseURL}/dev-beam-harness`, { waitUntil: "networkidle" });
  await page.waitForSelector("#devBeamHarness");

  async function columnBox(row, index) {
    const box = await page
      .locator(`[data-beam-row="${row}"] [data-beam-column="${index}"]`)
      .boundingBox();
    assert.ok(box, `missing column ${row}[${index}]`);
    return box;
  }

  async function stemBox(row, index) {
    const box = await page
      .locator(
        `[data-beam-row="${row}"] [data-beam-column="${index}"] [data-note-stem]`,
      )
      .boundingBox();
    assert.ok(box, `missing stem ${row}[${index}]`);
    return box;
  }

  function assertFlushWithStem(beam, stem, message) {
    const stemCenter = stem.x + stem.width / 2;
    const inner = beam.side === "left" ? beam.box.x + beam.box.width : beam.box.x;
    nearly(inner, stemCenter, 0.75, message);
  }

  async function beams(row, index) {
    const handles = await page
      .locator(
        `[data-beam-row="${row}"] [data-beam-column="${index}"] [data-note-beam]`,
      )
      .all();
    const result = [];
    for (const handle of handles) {
      const box = await handle.boundingBox();
      result.push({
        side: await handle.getAttribute("data-beam-side"),
        connected: await handle.getAttribute("data-beam-connected"),
        offset: await handle.getAttribute("data-beam-offset"),
        box,
      });
    }
    return result;
  }

  async function geometry(name, fn) {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
      passed++;
    } catch (error) {
      console.error(`  FAIL  ${name}`);
      console.error(error);
      process.exitCode = 1;
    }
  }

  await geometry(
    "paired eighths meet and the next pair leaves a gap",
    async () => {
      const right = (await beams("eight-eighths", 0)).find(
        (beam) => beam.side === "right" && beam.offset === "0",
      );
      const left = (await beams("eight-eighths", 1)).find(
        (beam) => beam.side === "left" && beam.offset === "0",
      );
      assert.equal(right?.connected, "true");
      assert.equal(left?.connected, "true");
      const col = await columnBox("eight-eighths", 0);
      nearly(right.box.width, col.width / 2, 1, "connected beam width");
      nearly(
        right.box.x + right.box.width,
        left.box.x,
        1.5,
        "connected beams meet",
      );

      const endOfPair = await beams("eight-eighths", 1);
      const startOfNext = await beams("eight-eighths", 2);
      assert.equal(
        endOfPair.some((beam) => beam.side === "right"),
        false,
      );
      assert.equal(
        startOfNext.some((beam) => beam.side === "left"),
        false,
      );
    },
  );

  await geometry(
    "a lone eighth flag is shorter than a connecting beam",
    async () => {
      const flag = (await beams("orphan-flag", 1)).find(
        (beam) => beam.connected === "false",
      );
      const connected = (await beams("eight-eighths", 0)).find(
        (beam) => beam.connected === "true" && beam.offset === "0",
      );
      assert.ok(flag?.box && connected?.box);
      assert.ok(
        flag.box.width < connected.box.width - 3,
        `flag ${flag.box.width}px should be shorter than connected ${connected.box.width}px`,
      );
      const col = await columnBox("orphan-flag", 1);
      // 6px inset from the outer edge; inner edge stays at the stem (50%).
      nearly(flag.box.width, col.width / 2 - 6, 1.5, "partial beam width");
    },
  );

  await geometry("broken eighths do not visually join", async () => {
    const rightFlag = (await beams("rest-separated", 3)).find(
      (beam) => beam.side === "right" && beam.connected === "false",
    );
    const leftFlag = (await beams("rest-separated", 4)).find(
      (beam) => beam.side === "left" && beam.connected === "false",
    );
    assert.ok(rightFlag?.box && leftFlag?.box);
    const gap = leftFlag.box.x - (rightFlag.box.x + rightFlag.box.width);
    assert.ok(gap >= 8, `expected a visible gap, got ${gap}px`);
  });

  await geometry(
    "sixteenth groups connect both beams, then break",
    async () => {
      const primary = (await beams("eight-sixteenths", 1)).filter(
        (beam) => beam.offset === "0",
      );
      const secondary = (await beams("eight-sixteenths", 1)).filter(
        (beam) => beam.offset === "5",
      );
      assert.ok(primary.every((beam) => beam.connected === "true"));
      assert.ok(secondary.every((beam) => beam.connected === "true"));
      const atBreak = await beams("eight-sixteenths", 3);
      const afterBreak = await beams("eight-sixteenths", 4);
      assert.equal(
        atBreak.some((beam) => beam.side === "right"),
        false,
      );
      assert.equal(
        afterBreak.some((beam) => beam.side === "left"),
        false,
      );
    },
  );

  await geometry("repeated compound cells beam as threes", async () => {
    const join = await beams("compound-cells", 1);
    assert.ok(
      join.some((beam) => beam.side === "right" && beam.connected === "true"),
    );
    const boundary = await beams("compound-cells", 2);
    const next = await beams("compound-cells", 3);
    assert.equal(
      boundary.some((beam) => beam.side === "right"),
      false,
    );
    assert.equal(
      next.some((beam) => beam.side === "left"),
      false,
    );
  });

  await geometry(
    "editor-width columns still meet only when connected",
    async () => {
      const right = (await beams("editor-width-eighths", 0)).find(
        (beam) => beam.side === "right",
      );
      const left = (await beams("editor-width-eighths", 1)).find(
        (beam) => beam.side === "left",
      );
      assert.ok(right?.box && left?.box);
      nearly(right.box.x + right.box.width, left.box.x, 1.5, "40px beams meet");
      const col = await columnBox("editor-width-eighths", 0);
      nearly(col.width, 40, 1, "editor column width");
    },
  );

  await geometry("a right flag is flush with its stem", async () => {
    const flag = (await beams("orphan-flag", 1)).find(
      (beam) => beam.connected === "false" && beam.side === "right",
    );
    assert.ok(flag?.box);
    assertFlushWithStem(flag, await stemBox("orphan-flag", 1), "right flag");
  });

  await geometry("a left flag is flush with its stem", async () => {
    const flag = (await beams("rest-separated", 4)).find(
      (beam) => beam.connected === "false" && beam.side === "left",
    );
    assert.ok(flag?.box);
    assertFlushWithStem(
      flag,
      await stemBox("rest-separated", 4),
      "left flag",
    );
  });

  await geometry(
    "a sixteenth beamlet shares the stem edge with its primary beam",
    async () => {
      const columnBeams = await beams("shuffle", 1);
      const primary = columnBeams.find(
        (beam) => beam.side === "left" && beam.offset === "0",
      );
      const beamlet = columnBeams.find(
        (beam) => beam.side === "left" && beam.offset === "5",
      );
      assert.ok(primary?.box && beamlet?.box);
      nearly(
        primary.box.x + primary.box.width,
        beamlet.box.x + beamlet.box.width,
        0.5,
        "beamlet inner edge matches primary",
      );
      const stem = await stemBox("shuffle", 1);
      assertFlushWithStem(primary, stem, "shuffle primary");
      assertFlushWithStem(beamlet, stem, "shuffle beamlet");
    },
  );

  await geometry("odd-width flags stay flush with the stem", async () => {
    const rightFlag = (await beams("odd-width-orphan-right", 1)).find(
      (beam) => beam.connected === "false" && beam.side === "right",
    );
    const leftFlag = (await beams("odd-width-orphan-left", 2)).find(
      (beam) => beam.connected === "false" && beam.side === "left",
    );
    assert.ok(rightFlag?.box && leftFlag?.box);
    assertFlushWithStem(
      rightFlag,
      await stemBox("odd-width-orphan-right", 1),
      "odd-width right flag",
    );
    assertFlushWithStem(
      leftFlag,
      await stemBox("odd-width-orphan-left", 2),
      "odd-width left flag",
    );

    const beamlet = (await beams("odd-width-shuffle", 1)).find(
      (beam) => beam.side === "left" && beam.offset === "5",
    );
    assert.ok(beamlet?.box);
    assertFlushWithStem(
      beamlet,
      await stemBox("odd-width-shuffle", 1),
      "odd-width beamlet",
    );
  });
} finally {
  await browser.close();
}

if (process.exitCode) {
  console.error("\nBeam checks failed.");
  process.exit(process.exitCode);
}
