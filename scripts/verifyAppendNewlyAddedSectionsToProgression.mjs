import assert from "node:assert/strict";
import { appendNewlyAddedSectionsToProgression } from "../src/utils/appendNewlyAddedSectionsToProgression.ts";

function section(id, title = id) {
  return { id, title, data: [] };
}

function prog(sectionId, title = sectionId) {
  return {
    id: `prog-${sectionId}`,
    sectionId,
    title,
    repetitions: 1,
    startSeconds: 0,
    endSeconds: 0,
  };
}

// First observation: seed known IDs, return same progression reference
{
  const known = new Set(["s1"]);
  const progression = [prog("s1")];
  const tabData = [section("s1"), section("s2", "Section 2")];
  const next = appendNewlyAddedSectionsToProgression({
    tabData,
    sectionProgression: progression,
    knownSectionIds: known,
  });
  assert.notEqual(next, progression, "appends create a new array");
  assert.equal(next.length, 2);
  assert.equal(next[1]?.sectionId, "s2");
  assert.equal(next[1]?.title, "Section 2");
  assert.ok(known.has("s2"));
}

// User intentionally removed s2 from progression: s2 stays known, not re-added
{
  const known = new Set(["s1", "s2"]);
  const progression = [prog("s1")];
  const tabData = [section("s1"), section("s2")];
  const next = appendNewlyAddedSectionsToProgression({
    tabData,
    sectionProgression: progression,
    knownSectionIds: known,
  });
  assert.equal(next, progression, "same reference when nothing to append");
  assert.equal(next.length, 1);
}

// Empty progression: refresh known IDs, do not invent entries
{
  const known = new Set(["old"]);
  const progression = [];
  const tabData = [section("s1"), section("s2")];
  const next = appendNewlyAddedSectionsToProgression({
    tabData,
    sectionProgression: progression,
    knownSectionIds: known,
  });
  assert.equal(next, progression);
  assert.deepEqual([...known].sort(), ["s1", "s2"]);
}

// Deleted section drops from known so a later new section can be appended
{
  const known = new Set(["s1", "s2"]);
  const progression = [prog("s1")];
  const tabData = [section("s1")];
  appendNewlyAddedSectionsToProgression({
    tabData,
    sectionProgression: progression,
    knownSectionIds: known,
  });
  assert.deepEqual([...known], ["s1"]);

  const withNew = appendNewlyAddedSectionsToProgression({
    tabData: [section("s1"), section("s3")],
    sectionProgression: progression,
    knownSectionIds: known,
  });
  assert.equal(withNew.length, 2);
  assert.equal(withNew[1]?.sectionId, "s3");
}

// Already present in progression (e.g. addNewSection pre-appended): no duplicate
{
  const known = new Set(["s1"]);
  const progression = [prog("s1"), prog("s2")];
  const tabData = [section("s1"), section("s2")];
  const next = appendNewlyAddedSectionsToProgression({
    tabData,
    sectionProgression: progression,
    knownSectionIds: known,
  });
  assert.equal(next, progression);
  assert.equal(next.length, 2);
  assert.ok(known.has("s2"));
}

console.log("ALL appendNewlyAddedSectionsToProgression CHECKS PASSED");
