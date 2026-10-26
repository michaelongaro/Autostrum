// Read-only integrity audit: node scripts/auditDatabase.mjs
import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});
await client.connect();
try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const counts = await client.query(`SELECT
    (SELECT count(*) FROM "Tab") tabs,
    (SELECT count(*) FROM "User") users,
    (SELECT count(*) FROM "Artist") artists,
    (SELECT count(*) FROM "Bookmark") bookmarks,
    (SELECT count(*) FROM "TabRating") ratings,
    (SELECT count(*) FROM "TabDraft") drafts`);
  console.log("Row counts:", counts.rows[0]);
  const checks = {
    orphan_daily_views: `SELECT count(*) n FROM "DailyTabView" d WHERE NOT EXISTS (SELECT 1 FROM "Tab" t WHERE t.id = d."tabId")`,
    orphan_weekly_users: `SELECT count(*) n FROM "WeeklyUserTotalTabView" w WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."userId" = w."userId")`,
    orphan_featured_users: `SELECT count(*) n FROM "WeeklyFeaturedUser" w WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."userId" = w."userId")`,
    wrong_bookmark_recipient: `SELECT count(*) n FROM "Bookmark" b JOIN "Tab" t ON t.id = b."tabId" WHERE b."tabCreatorUserId" IS DISTINCT FROM t."createdByUserId"`,
    invalid_ratings: `SELECT count(*) n FROM "TabRating" WHERE value NOT BETWEEN 1 AND 5`,
    invalid_difficulty: `SELECT count(*) n FROM "Tab" WHERE difficulty NOT BETWEEN 1 AND 5`,
    tab_rating_drift: `SELECT count(*) n FROM "Tab" t WHERE
      t."ratingsCount" <> (SELECT count(*) FROM "TabRating" r WHERE r."tabId" = t.id) OR
      abs(t."averageRating" - (SELECT coalesce(avg(r.value), 0) FROM "TabRating" r WHERE r."tabId" = t.id)) > 0.00001`,
    user_counter_drift: `SELECT count(*) n FROM "User" u WHERE
      u."totalTabs" <> (SELECT count(*) FROM "Tab" t WHERE t."createdByUserId" = u."userId") OR
      u."totalTabViews" <> (SELECT coalesce(sum(t."pageViews"), 0) FROM "Tab" t WHERE t."createdByUserId" = u."userId") OR
      u."totalTabRatings" <> (SELECT count(*) FROM "TabRating" r JOIN "Tab" t ON t.id = r."tabId" WHERE t."createdByUserId" = u."userId") OR
      abs(u."averageTabRating" - (SELECT coalesce(avg(r.value), 0) FROM "TabRating" r JOIN "Tab" t ON t.id = r."tabId" WHERE t."createdByUserId" = u."userId")) > 0.00001 OR
      u."totalBookmarksReceived" <> (SELECT count(*) FROM "Bookmark" b JOIN "Tab" t ON t.id = b."tabId" WHERE t."createdByUserId" = u."userId")`,
    artist_counter_drift: `SELECT count(*) n FROM "Artist" a WHERE
      a."totalTabs" <> (SELECT count(*) FROM "Tab" t WHERE t."artistId" = a.id) OR
      a."totalViews" <> (SELECT coalesce(sum(t."pageViews"), 0) FROM "Tab" t WHERE t."artistId" = a.id)`,
    stale_search_vectors: `SELECT count(*) n FROM "Tab" t LEFT JOIN "Artist" a ON a.id = t."artistId" WHERE t."searchVector" IS DISTINCT FROM
      (setweight(to_tsvector('english', coalesce(t.title, '')), 'A') ||
       setweight(to_tsvector('english', coalesce(a.name, '')), 'B') ||
       setweight(to_tsvector('english', coalesce(t.description, '')), 'C'))`,
  };
  for (const [name, sql] of Object.entries(checks)) {
    const n = Number((await client.query(sql)).rows[0].n);
    console.log(`${n === 0 ? "PASS" : "FAIL"} ${name}: ${n}`);
    if (n !== 0) process.exitCode = 1;
  }
  const indexes = await client.query(
    `SELECT count(*) n FROM pg_indexes WHERE schemaname = current_schema()`,
  );
  console.log("Indexes:", indexes.rows[0].n);
  await client.query("ROLLBACK");
} finally {
  await client.end();
}
