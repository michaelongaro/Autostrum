/**
 * Verifies palm-mute start/end selection + undo (cancel) flows against the
 * same helper logic used by PalmMuteNode / StrummingPatternPalmMuteNode.
 *
 * Run: node scripts/verifyPalmMuteNodeFlows.mjs
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function note(palmMute = "") {
  return { type: "note", palmMute };
}

function measureLine(isInPalmMuteSection = false) {
  return { type: "measureLine", isInPalmMuteSection };
}

function pmValues(columns) {
  return columns.map((col) => {
    if (col.type === "measureLine") {
      return col.isInPalmMuteSection ? "ML*" : "ML";
    }
    return col.palmMute || ".";
  });
}

/** Mirrors addOrRemovePalmMuteDashes from palmMuteHelpers.ts */
function addOrRemovePalmMuteDashes({
  columns,
  startColumnIndex,
  prevValue,
  pairNodeValue,
}) {
  const isAdding = pairNodeValue !== undefined;
  const direction = isAdding
    ? pairNodeValue === "start"
      ? 1
      : -1
    : prevValue === "start"
      ? 1
      : -1;
  const stopAtNodeType = isAdding
    ? pairNodeValue === "" || pairNodeValue === "end"
      ? "start"
      : "end"
    : prevValue === "start"
      ? "end"
      : "start";

  let currentColumnIndex = startColumnIndex;

  while (true) {
    const currentColumn = columns[currentColumnIndex];
    if (currentColumn === undefined) break;

    if (currentColumn.type === "measureLine") {
      currentColumn.isInPalmMuteSection = isAdding;
      currentColumnIndex += direction;
      continue;
    }

    if (isAdding) {
      if (currentColumnIndex === startColumnIndex) {
        currentColumn.palmMute =
          pairNodeValue === "" ? "end" : pairNodeValue;
      } else if (currentColumn.palmMute === stopAtNodeType) {
        break;
      } else {
        currentColumn.palmMute = "-";
      }
    } else {
      if (currentColumn.palmMute === stopAtNodeType) {
        break;
      }
      currentColumn.palmMute = "";
    }

    currentColumnIndex += direction;
  }
}

/** Mirrors fixed Case 3 cancel-removal */
function cancelRemoval(columns, columnIndex, prevValue) {
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: columnIndex,
    prevValue,
    pairNodeValue: prevValue,
  });
}

/** Old broken Case 3 (for regression check) */
function brokenCancelRemoval(columns, columnIndex, prevValue) {
  columns[columnIndex].palmMute = prevValue;
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: columnIndex,
    prevValue,
    // missing pairNodeValue — remove mode
  });
}

function traverseToRemoveHangingPairNode(
  columns,
  startColumnIndex,
  pairNodeToRemove,
) {
  let currentColumnIndex = startColumnIndex;

  while (true) {
    const currentColumn = columns[currentColumnIndex];
    if (currentColumn === undefined) break;

    if (currentColumn.type === "measureLine") {
      currentColumn.isInPalmMuteSection = false;
      pairNodeToRemove === "start"
        ? currentColumnIndex--
        : currentColumnIndex++;
      continue;
    }

    if (currentColumn.type !== "note") break;

    if (currentColumn.palmMute === pairNodeToRemove) {
      currentColumn.palmMute = "";
      break;
    }

    pairNodeToRemove === "start"
      ? currentColumnIndex--
      : currentColumnIndex++;
  }
}

function makeSection(palmMutes) {
  return palmMutes.map((v) =>
    v === "ML" || v === "ML*"
      ? measureLine(v === "ML*")
      : note(v === "." ? "" : v),
  );
}

function samePm(actual, expected) {
  return JSON.stringify(pmValues(actual)) === JSON.stringify(expected);
}

// --- Flow: select start → select end → undo end → select end again ---
{
  const columns = makeSection([".", ".", ".", ".", "."]);

  // Place start at 1
  columns[1].palmMute = "start";
  let lastModified = { columnIndex: 1, prevValue: "", currentValue: "start" };

  // Place end at 3 (complete section)
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: 3,
    prevValue: "",
    pairNodeValue: lastModified.prevValue, // ""
  });
  lastModified = null;
  assert(
    samePm(columns, [".", "start", "-", "end", "."]),
    `after place end: ${pmValues(columns)}`,
  );

  // Begin removal on end
  lastModified = { columnIndex: 3, prevValue: "end", currentValue: "" };
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: 3,
    prevValue: "end",
  });
  assert(
    samePm(columns, [".", "start", ".", ".", "."]),
    `after begin end removal: ${pmValues(columns)}`,
  );

  // Broken cancel would leave removal mid-state and keep lastModified set
  {
    const broken = makeSection([".", "start", ".", ".", "."]);
    brokenCancelRemoval(broken, 3, "end");
    assert(
      samePm(broken, [".", "start", ".", ".", "."]),
      "broken cancel incorrectly leaves mid-removal state",
    );
  }

  // Fixed cancel restores section and clears lastModified
  cancelRemoval(columns, 3, "end");
  lastModified = null;
  assert(
    samePm(columns, [".", "start", "-", "end", "."]),
    `after cancel end removal: ${pmValues(columns)}`,
  );

  // Select that same end again (begin removal) — must work once idle
  assert(lastModified === null, "lastModified must be cleared after cancel");
  lastModified = { columnIndex: 3, prevValue: "end", currentValue: "" };
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: 3,
    prevValue: "end",
  });
  assert(
    samePm(columns, [".", "start", ".", ".", "."]),
    `re-select end after cancel: ${pmValues(columns)}`,
  );
}

// --- Same flow but undo start instead of end ---
{
  const columns = makeSection([".", "start", "-", "end", "."]);

  // Begin removal on start
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: 1,
    prevValue: "start",
  });
  assert(
    samePm(columns, [".", ".", ".", "end", "."]),
    `after begin start removal: ${pmValues(columns)}`,
  );

  cancelRemoval(columns, 1, "start");
  assert(
    samePm(columns, [".", "start", "-", "end", "."]),
    `after cancel start removal: ${pmValues(columns)}`,
  );
}

// --- Complete removal via pair click ---
{
  const columns = makeSection([".", "start", "-", "end", "."]);
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: 3,
    prevValue: "end",
  });
  // clear range 1..3
  for (let i = 1; i <= 3; i++) columns[i].palmMute = "";
  assert(
    samePm(columns, [".", ".", ".", ".", "."]),
    `after complete removal: ${pmValues(columns)}`,
  );
}

// --- Hanging pair removal across a measure line ---
{
  const columns = makeSection(["start", "-", "ML*", "end"]);
  // Mid-removal of end: dashes/end cleared, measure still marked
  columns[1].palmMute = "";
  columns[2].isInPalmMuteSection = false;
  columns[3].palmMute = "";
  // Exit edit: remove hanging start past the measure line
  traverseToRemoveHangingPairNode(columns, 3, "start");
  assert(
    samePm(columns, [".", ".", "ML", "."]),
    `hanging start removed across measure line: ${pmValues(columns)}`,
  );
}

// --- Cancel removal across a measure line ---
{
  const columns = makeSection(["start", "-", "ML*", "end"]);
  addOrRemovePalmMuteDashes({
    columns,
    startColumnIndex: 3,
    prevValue: "end",
  });
  assert(
    samePm(columns, ["start", ".", "ML", "."]),
    `begin end removal across ML: ${pmValues(columns)}`,
  );

  cancelRemoval(columns, 3, "end");
  assert(
    samePm(columns, ["start", "-", "ML*", "end"]),
    `cancel end removal across ML: ${pmValues(columns)}`,
  );
}

// --- Strumming: cancel end removal then re-select end ---
{
  const strums = [".", "start", "-", "end", "."].map((palmMute) => ({
    palmMute: palmMute === "." ? "" : palmMute,
  }));

  function applyStrumming({ startColumnIndex, prevValue, pairNodeValue }) {
    const isAdding = pairNodeValue !== undefined;
    const direction = isAdding
      ? pairNodeValue === "start"
        ? 1
        : -1
      : prevValue === "start"
        ? 1
        : -1;
    const stopAtNodeType = isAdding
      ? pairNodeValue === "" || pairNodeValue === "end"
        ? "start"
        : "end"
      : prevValue === "start"
        ? "end"
        : "start";

    let i = startColumnIndex;
    while (i >= 0 && i < strums.length) {
      if (isAdding) {
        if (i === startColumnIndex) {
          strums[i].palmMute =
            pairNodeValue === "" ? "end" : pairNodeValue;
        } else if (strums[i].palmMute === stopAtNodeType) {
          break;
        } else {
          strums[i].palmMute = "-";
        }
      } else {
        if (strums[i].palmMute === stopAtNodeType) break;
        strums[i].palmMute = "";
      }
      i += direction;
    }
  }

  applyStrumming({ startColumnIndex: 3, prevValue: "end" });
  assert(
    strums.map((s) => s.palmMute || ".").join(",") === ".,start,.,.,.",
    "strumming begin end removal",
  );

  applyStrumming({
    startColumnIndex: 3,
    prevValue: "end",
    pairNodeValue: "end",
  });
  assert(
    strums.map((s) => s.palmMute || ".").join(",") === ".,start,-,end,.",
    "strumming cancel end removal",
  );

  applyStrumming({ startColumnIndex: 3, prevValue: "end" });
  assert(
    strums.map((s) => s.palmMute || ".").join(",") === ".,start,.,.,.",
    "strumming re-select end after cancel",
  );
}

console.log("All palm mute node flow checks passed.");
