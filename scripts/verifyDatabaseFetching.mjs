// Node 22.15+; runs real routers against a disposable schema in the dev database.
// Run: node scripts/verifyDatabaseFetching.mjs --dev-database
// Does not use Clerk, S3, screenshots, or the public schema for fixtures.
import "dotenv/config";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import ts from "typescript";
import { PrismaPg } from "@prisma/adapter-pg";

if (
  !process.argv.includes("--dev-database") ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.NEXT_PUBLIC_DOMAIN_URL).hostname,
  ) ||
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")
)
  throw new Error(
    "Use --dev-database with the local domain and Clerk test environment.",
  );

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = `autostrum_audit_${crypto.randomUUID().replaceAll("-", "")}`;
const connection = new URL(process.env.DATABASE_URL);
connection.searchParams.set("options", `-c search_path=${schema},public`);
const control = new pg.Client({ connectionString: process.env.DATABASE_URL });
let db;
const sideEffects = [];
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      "~/server/db": "export const prisma = globalThis.__auditDatabase;",
      "~/env": "export const env = {NODE_ENV:'development'};",
      "@clerk/nextjs/server":
        "export const getAuth = () => ({userId:null}); export const clerkClient = async () => ({users:{deleteUser:async () => {}}});",
      "@vercel/functions": "export const waitUntil = () => {};",
      "@aws-sdk/client-s3":
        "export class S3Client { async send() {} } export class DeleteObjectCommand {} export class DeleteObjectsCommand {}",
    };
    if (stubs[specifier])
      return {
        url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`,
        shortCircuit: true,
      };
    if (specifier.startsWith("~/"))
      specifier = pathToFileURL(resolve(root, "src", specifier.slice(2))).href;
    if (
      (specifier.startsWith(".") || specifier.startsWith("file:")) &&
      context.parentURL
    ) {
      const url = new URL(specifier, context.parentURL);
      if (
        url.protocol === "file:" &&
        !existsSync(fileURLToPath(url)) &&
        existsSync(`${fileURLToPath(url)}.ts`)
      ) {
        return { url: `${url.href}.ts`, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (
      url.startsWith("file:") &&
      url.endsWith(".ts") &&
      !url.includes("/node_modules/")
    ) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

function context(userId, ip = "192.0.2.1") {
  return {
    auth: { userId },
    prisma: db,
    req: { headers: { "x-forwarded-for": ip }, socket: {} },
    res: { revalidate: async () => {}, setHeader() {} },
    waitUntil(promise) {
      sideEffects.push(promise);
    },
  };
}
function document(title, artistId = null) {
  return {
    title,
    artistId,
    description: null,
    genre: "Rock",
    tuning: "e2 a2 d3 g3 b3 e4",
    bpm: 75,
    capo: 0,
    key: null,
    difficulty: 1,
    chords: [],
    strummingPatterns: [],
    sectionProgression: [],
    tabData: [{ id: crypto.randomUUID(), title: "Verse", data: [] }],
  };
}
const rejectsWith = (promise, code) =>
  assert.rejects(promise, (error) => error.code === code);

await control.connect();
try {
  await control.query(`CREATE SCHEMA "${schema}"`);
  await control.query(`SET search_path TO "${schema}", public`);
  const ddl = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      "prisma/schema.prisma",
      "--script",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  await control.query(ddl.replace('CREATE SCHEMA IF NOT EXISTS "public";', ""));
  await control.query(`
    CREATE TRIGGER tab_search_vector_update BEFORE INSERT OR UPDATE OF title, description, "artistId" ON "Tab" FOR EACH ROW EXECUTE FUNCTION public.update_tab_search_vector();
    CREATE TRIGGER artist_name_update_trigger AFTER UPDATE OF name ON "Artist" FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name) EXECUTE FUNCTION public.update_artist_tabs_search_vector();
    ALTER TABLE "TabRating" ADD CHECK (value BETWEEN 1 AND 5);
    ALTER TABLE "Tab" ADD CHECK (difficulty BETWEEN 1 AND 5);
  `);
  const { PrismaClient } = await import(
    pathToFileURL(resolve(root, "src/generated/client.ts"))
  );
  db = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: connection.href, max: 5 },
      { schema },
    ),
  });
  globalThis.__auditDatabase = db;
  const { tabRouter } = await import("../src/server/api/routers/tab.ts");
  const { searchRouter } = await import("../src/server/api/routers/search.ts");
  const { bookmarkRouter } =
    await import("../src/server/api/routers/bookmark.ts");
  const { tabRatingRouter } =
    await import("../src/server/api/routers/tabRating.ts");
  const { userRouter } = await import("../src/server/api/routers/user.ts");
  const { deleteUserData } = await import("../src/server/api/userDeletion.ts");
  const { refreshWeeklyDiscovery } =
    await import("../src/server/api/weeklyDiscovery.ts");
  const ids = ["owner-a", "owner-b", "viewer-a", "viewer-b"];
  await db.user.createMany({
    data: ids.map((userId) => ({
      userId,
      username: userId,
      profileImageUrl: "",
    })),
  });
  const artist = await db.artist.create({ data: { name: "Audit Artist" } });
  const otherArtist = await db.artist.create({
    data: { name: "Other Artist" },
  });
  const owner = tabRouter.createCaller(context(ids[0]));
  const tabs = [];
  for (let i = 0; i < 5; i++)
    tabs.push(await owner.create(document(`Audit Song ${i}`, artist.id)));
  assert.equal(
    (await db.user.findUnique({ where: { userId: ids[0] } })).totalTabs,
    5,
  );
  assert.equal(
    (await db.artist.findUnique({ where: { id: artist.id } })).totalTabs,
    5,
  );
  await assert.rejects(owner.create(document("Invalid artist", 2147483647)));
  assert.equal(await db.tab.count(), 5, "failed publication must roll back");
  await owner.update({
    ...document(tabs[4].title, artist.id),
    id: tabs[4].id,
    difficulty: 5,
    capo: 1,
  });
  const statistics = await userRouter
    .createCaller(context(ids[0]))
    .getStatistics();
  assert.equal(statistics.miscStats[2].get("Beginner"), 4);
  assert.equal(statistics.miscStats[2].get("Expert"), 1);
  assert.equal(statistics.miscStats[3].get("1st fret"), 1);
  console.log(
    "PASS: publication counters, rollback, difficulty/capo statistics",
  );

  const tabId = tabs[0].id;
  const version = tabs[0].updatedAt.getTime();
  const views = (ip) =>
    tabRouter.createCaller(context(null, ip)).processPageView({
      tabId,
      tabCreatorUserId: ids[1],
      artistId: otherArtist.id,
    });
  await Promise.all([
    views("192.0.2.10, 10.0.0.1"),
    views("192.0.2.10, 10.0.0.2"),
  ]);
  assert.equal(
    (await db.tab.findUnique({ where: { id: tabId } })).pageViews,
    1,
  );
  await Promise.all([views("192.0.2.11"), views("192.0.2.12")]);
  assert.equal(
    (await db.tab.findUnique({ where: { id: tabId } })).pageViews,
    3,
  );
  assert.equal(
    (await db.user.findUnique({ where: { userId: ids[1] } })).totalTabViews,
    0,
  );
  assert.equal(
    (await db.artist.findUnique({ where: { id: otherArtist.id } })).totalViews,
    0,
  );
  const rate = (userId, rating) =>
    tabRatingRouter
      .createCaller(context(userId))
      .rate({ tabId, rating, tabCreatorUserId: ids[1] });
  await Promise.all([rate(ids[2], 4), rate(ids[3], 2)]);
  let rated = await db.tab.findUnique({ where: { id: tabId } });
  assert.equal(rated.ratingsCount, 2);
  assert.equal(rated.averageRating, 3);
  await rate(ids[2], 5);
  rated = await db.tab.findUnique({ where: { id: tabId } });
  assert.equal(rated.averageRating, 3.5);
  assert.equal(rated.updatedAt.getTime(), version);
  await rejectsWith(rate(ids[2], 2.5), "BAD_REQUEST");
  await Promise.all([rate(ids[2], 1), rate(ids[2], 3)]);
  const actualRatings = await db.tabRating.aggregate({
    where: { tabId },
    _count: true,
    _avg: { value: true },
  });
  rated = await db.tab.findUnique({ where: { id: tabId } });
  assert.equal(rated.ratingsCount, actualRatings._count);
  assert.equal(rated.averageRating, actualRatings._avg.value);
  console.log(
    "PASS: concurrent views/ratings, authoritative recipients, stable document version",
  );

  const bookmarker = bookmarkRouter.createCaller(context(ids[2]));
  const bookmark = { tabId, tabCreatorUserId: ids[1] };
  await Promise.all([
    bookmarker.addBookmark(bookmark),
    bookmarker.addBookmark(bookmark),
  ]);
  assert.equal(await db.bookmark.count(), 1);
  assert.equal(
    (await db.user.findUnique({ where: { userId: ids[0] } }))
      .totalBookmarksReceived,
    1,
  );
  await Promise.all([
    bookmarker.removeBookmark(bookmark),
    bookmarker.removeBookmark(bookmark),
  ]);
  assert.equal(
    (await db.user.findUnique({ where: { userId: ids[0] } }))
      .totalBookmarksReceived,
    0,
  );
  for (let i = 0; i < tabs.length; i++) {
    await bookmarker.addBookmark({ tabId: tabs[i].id });
    await db.bookmark.update({
      where: {
        bookmarkedByUserId_tabId: {
          bookmarkedByUserId: ids[2],
          tabId: tabs[i].id,
        },
      },
      data: { createdAt: new Date(2020, 0, i + 1) },
    });
  }
  const search = searchRouter.createCaller(context(ids[2]));
  const params = { sortBy: "newest", bookmarkedByUserId: ids[2], limit: 2 };
  const first = await search.getInfiniteTabsBySearchQuery(params);
  const second = await search.getInfiniteTabsBySearchQuery({
    ...params,
    cursor: first.data.nextCursor,
  });
  assert.deepEqual(
    [...first.data.tabs, ...second.data.tabs].map(({ id }) => id),
    tabs
      .toReversed()
      .slice(0, 4)
      .map(({ id }) => id),
  );
  const oldest = await search.getInfiniteTabsBySearchQuery({
    ...params,
    sortBy: "oldest",
  });
  assert.deepEqual(
    oldest.data.tabs.map(({ id }) => id),
    tabs.slice(0, 2).map(({ id }) => id),
  );
  const guest = searchRouter.createCaller(context(null));
  await rejectsWith(guest.getInfiniteTabsBySearchQuery(params), "UNAUTHORIZED");
  await rejectsWith(
    searchRouter.createCaller(context(ids[3])).getInfiniteTabsBySearchQuery({
      ...params,
      sortBy: "relevance",
      searchQuery: "Audit",
    }),
    "FORBIDDEN",
  );
  for (const cursor of [-1, 0.5])
    await rejectsWith(
      guest.getInfiniteTabsBySearchQuery({ sortBy: "newest", cursor }),
      "BAD_REQUEST",
    );
  const publicResults = await guest.getInfiniteTabsBySearchQuery({
    sortBy: "newest",
  });
  assert.ok(publicResults.data.tabs.every((tab) => !("bookmarks" in tab)));
  const fts = await guest.getInfiniteTabsBySearchQuery({
    sortBy: "relevance",
    searchQuery: "Audit",
  });
  assert.equal(fts.count, 5);
  assert.equal(
    (await userRouter.createCaller(context(null)).getById(ids[2]))
      .bookmarkedTabIds.length,
    0,
  );
  assert.equal(
    (await userRouter.createCaller(context(ids[2])).getById(ids[2]))
      .bookmarkedTabIds.length,
    5,
  );
  console.log(
    "PASS: bookmark idempotency, global pagination order, search validation and privacy",
  );

  await owner.update({ ...document(tabs[0].title, otherArtist.id), id: tabId });
  assert.equal(
    (await db.artist.findUnique({ where: { id: artist.id } })).totalTabs,
    4,
  );
  assert.equal(
    (await db.artist.findUnique({ where: { id: otherArtist.id } })).totalViews,
    3,
  );
  const comment = await db.comment.create({
    data: { tabId, text: "parent", authorId: ids[0] },
  });
  await db.comment.create({
    data: { tabId, text: "reply", authorId: ids[2], replyToId: comment.id },
  });
  await db.user.update({
    where: { userId: ids[0] },
    data: { pinnedTabId: tabId },
  });
  await tabRouter.createCaller(context(ids[1])).delete(tabId);
  assert.ok(await db.tab.findUnique({ where: { id: tabId } }));
  await owner.delete(tabId);
  assert.equal(await db.comment.count(), 0);
  assert.equal(await db.dailyTabView.count(), 0);
  assert.equal(
    (await db.user.findUnique({ where: { userId: ids[0] } })).pinnedTabId,
    null,
  );
  assert.equal(
    (await db.artist.findUnique({ where: { id: otherArtist.id } })).totalTabs,
    0,
  );
  console.log(
    "PASS: artist reassignment, tab deletion authorization, cascades, pinned tab and counter repair",
  );

  const otherTab = await tabRouter
    .createCaller(context(ids[1]))
    .create(document("Other user's song", artist.id));
  await tabRatingRouter
    .createCaller(context(ids[0]))
    .rate({ tabId: otherTab.id, rating: 1 });
  await tabRatingRouter
    .createCaller(context(ids[2]))
    .rate({ tabId: otherTab.id, rating: 5 });
  await bookmarkRouter
    .createCaller(context(ids[0]))
    .addBookmark({ tabId: otherTab.id });
  await deleteUserData(db, ids[0], true);
  assert.equal(
    (await db.tab.findUnique({ where: { id: otherTab.id } })).averageRating,
    5,
  );
  assert.equal(
    (await db.user.findUnique({ where: { userId: ids[1] } }))
      .totalBookmarksReceived,
    0,
  );
  assert.ok(
    (
      await db.tab.findMany({
        where: { id: { in: tabs.slice(1).map(({ id }) => id) } },
      })
    ).every((tab) => tab.createdByUserId === null),
  );
  assert.equal(
    (await db.artist.findUnique({ where: { id: artist.id } })).totalTabs,
    5,
  );
  await deleteUserData(db, ids[1], false);
  assert.equal(await db.tab.findUnique({ where: { id: otherTab.id } }), null);
  assert.equal(
    (await db.artist.findUnique({ where: { id: artist.id } })).totalTabs,
    4,
  );
  console.log(
    "PASS: account deletion preserves/removes tabs and repairs recipients after cascades",
  );

  await db.mostPopularTabs.create({ data: { id: 42, tabId: tabs[1].id } });
  await refreshWeeklyDiscovery(db);
  assert.equal(await db.mostPopularTabs.count(), 4);
  assert.equal(await db.weeklyFeaturedUser.count(), 2);
  await refreshWeeklyDiscovery(db);
  assert.equal(await db.mostPopularTabs.count(), 4);
  await assert.rejects(
    db.dailyTabView.create({
      data: { userIpAddress: "192.0.2.99", tabId: 2147483647 },
    }),
  );
  await assert.rejects(
    db.weeklyUserTotalTabView.create({ data: { userId: "missing" } }),
  );
  await assert.rejects(
    db.tab.update({ where: { id: tabs[1].id }, data: { difficulty: 0 } }),
  );
  await assert.rejects(
    db.tabRating.create({
      data: { userId: ids[3], tabId: tabs[1].id, value: 6 },
    }),
  );
  console.log(
    "PASS: weekly snapshot replacement with gaps and fewer than five rows; orphan prevention",
  );
  await Promise.all(sideEffects);
  console.log("All database/fetching integration checks passed.");
} finally {
  if (db) await db.$disconnect();
  // schema is generated above and can never point to public or user-supplied SQL.
  await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await control.end();
  hooks.deregister();
  delete globalThis.__auditDatabase;
}
