// Preview: node scripts/backfillSectionProgressions.mjs
// Apply:   node scripts/backfillSectionProgressions.mjs --write
// Uses the same default ordering and timing calculation as publishing. Existing
// custom progressions and document timestamps/revisions are preserved.
import "dotenv/config";
import "./lib/registerTypeScript.mjs";
import pg from "pg";

const { ensureSectionProgression } =
  await import("../src/utils/sectionProgression.ts");
const { sectionSchema } = await import("../src/utils/tabDocument.ts");
const { updateElapsedSecondsInSectionProgression } =
  await import("../src/utils/updateElapsedSecondsInSectionProgression.ts");

const write = process.argv.includes("--write");
if (process.argv.slice(2).some((arg) => arg !== "--write")) {
  throw new Error(
    "Usage: node scripts/backfillSectionProgressions.mjs [--write]",
  );
}
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is not configured");

function backfill(document) {
  if (!Array.isArray(document.tabData))
    throw new Error("tabData must be an array");
  const tabData = document.tabData.length
    ? document.tabData
    : [{ id: crypto.randomUUID(), title: "Section 1", data: [] }];
  for (const section of tabData) sectionSchema.parse(section);
  const sectionProgression = updateElapsedSecondsInSectionProgression({
    tabData,
    baselineBpm: document.bpm,
    sectionProgression: ensureSectionProgression(tabData, []),
  });
  if (
    !sectionProgression.every(
      (entry) =>
        Number.isFinite(entry.startSeconds) &&
        Number.isFinite(entry.endSeconds),
    )
  ) {
    throw new Error("Cannot backfill non-finite section timings");
  }
  return { ...document, tabData, sectionProgression };
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  const tabs = (
    await client.query(`
    SELECT id, "tabData", bpm FROM "Tab"
    WHERE "sectionProgression" IS NULL OR "sectionProgression" IN ('[]'::jsonb, 'null'::jsonb)
    ORDER BY id FOR UPDATE
  `)
  ).rows;
  const drafts = (
    await client.query(`
    SELECT id, document FROM "TabDraft" WHERE "deletedAt" IS NULL AND (
      NOT document ? 'sectionProgression' OR document->'sectionProgression' IN ('[]'::jsonb, 'null'::jsonb)
    ) ORDER BY id FOR UPDATE
  `)
  ).rows;

  for (const tab of tabs) {
    const fixed = backfill(tab);
    console.log(
      `Tab ${tab.id}: ${fixed.sectionProgression.length} progression entries${tab.tabData.length === 0 ? " (restored empty Section 1)" : ""}`,
    );
    if (write) {
      await client.query(
        `UPDATE "Tab" SET "sectionProgression" = $1::jsonb, "tabData" = $2::jsonb WHERE id = $3`,
        [
          JSON.stringify(fixed.sectionProgression),
          JSON.stringify(fixed.tabData),
          tab.id,
        ],
      );
    }
  }
  for (const draft of drafts) {
    const fixed = backfill(draft.document);
    console.log(
      `Draft ${draft.id}: ${fixed.sectionProgression.length} progression entries`,
    );
    if (write) {
      await client.query(
        `UPDATE "TabDraft" SET document = $1::jsonb WHERE id = $2`,
        [JSON.stringify(fixed), draft.id],
      );
    }
  }
  await client.query(write ? "COMMIT" : "ROLLBACK");
  console.log(
    `${write ? "Backfilled" : "Would backfill"} ${tabs.length} tabs and ${drafts.length} active drafts.`,
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
