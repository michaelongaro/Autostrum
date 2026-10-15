// Run: node scripts/verifyPrivateDrafts.mjs
// Exercises the real storage, save coordinator, auth middleware, and routers.
// All database operations use an isolated in-memory transaction adapter.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = mkdtempSync(resolve(tmpdir(), "autostrum-drafts-checks-"));
const modules = new Map();
const sessions = [];
const storage = new Map();
const rows = new Map();
const tabs = new Map();
let clock = Date.now();
let nextTab = 1;
let publishedCount = 0;
let transactionTail = Promise.resolve();

const matches = (row, where) =>
  Object.entries(where).every(([key, value]) =>
    value instanceof Date
      ? row[key]?.getTime() === value.getTime()
      : row[key] === value,
  );
const clone = (value) => structuredClone(value);
function update(row, data) {
  for (const [key, value] of Object.entries(data))
    row[key] = value?.increment ? row[key] + value.increment : clone(value);
  row.updatedAt = new Date(++clock);
}
const db = {
  tabDraft: {
    async findFirst({ where }) {
      return clone(
        [...rows.values()].find((row) => matches(row, where)) ?? null,
      );
    },
    async findFirstOrThrow(args) {
      const row = await this.findFirst(args);
      assert.ok(row);
      return row;
    },
    async findMany({ where, select }) {
      return [...rows.values()]
        .filter((row) => matches(row, where))
        .map((row) =>
          Object.fromEntries(
            Object.keys(select).map((key) => [key, clone(row[key])]),
          ),
        );
    },
    async createMany({ data }) {
      if (rows.has(data.id)) return { count: 0 };
      rows.set(data.id, {
        ...clone(data),
        createdAt: new Date(++clock),
        updatedAt: new Date(++clock),
        revision: 1,
        deletedAt: null,
        publishedTabId: null,
      });
      return { count: 1 };
    },
    async updateMany({ where, data }) {
      let count = 0;
      for (const row of rows.values())
        if (matches(row, where)) {
          update(row, data);
          count++;
        }
      return { count };
    },
    async update({ where, data }) {
      const row = rows.get(where.id);
      assert.ok(row);
      update(row, data);
      return clone(row);
    },
  },
  tab: {
    async findFirst({ where }) {
      return clone(
        [...tabs.values()].find((row) => matches(row, where)) ?? null,
      );
    },
    async findUnique(args) {
      return this.findFirst(args);
    },
    async create({ data }) {
      const tab = {
        ...clone(data),
        id: nextTab++,
        createdByUserId: data.createdBy.connect.userId,
        artistId: null,
        createdAt: new Date(++clock),
        updatedAt: new Date(++clock),
      };
      tabs.set(tab.id, tab);
      return clone(tab);
    },
    async update({ where, data }) {
      const tab = [...tabs.values()].find((row) => matches(row, where));
      if (!tab) throw new Error("Concurrent tab update");
      update(tab, data);
      return clone(tab);
    },
  },
  user: {
    async update() {
      publishedCount++;
    },
  },
  async $transaction(callback) {
    const run = transactionTail.then(async () => {
      const beforeRows = clone(rows);
      const beforeTabs = clone(tabs);
      try {
        return await callback(db);
      } catch (error) {
        rows.clear();
        for (const [id, row] of beforeRows) rows.set(id, row);
        tabs.clear();
        for (const [id, tab] of beforeTabs) tabs.set(id, tab);
        throw error;
      }
    });
    transactionTail = run.catch(() => {});
    return run;
  },
};
globalThis.__AUTOSTRUM_DRAFT_CHECK_DB__ = db;
const browserEnvironment = {
  localStorage: {
    get length() {
      return storage.size;
    },
    key: (index) => [...storage.keys()][index] ?? null,
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  dispatchEvent() {},
};

// Compile only modules under test, retaining real production middleware. Stub
// external services before import so this command never accesses shared data.
function compile(file) {
  if (modules.has(file)) return modules.get(file);
  const output = resolve(temporary, `${modules.size}.mjs`);
  modules.set(file, output);
  let code;
  if (file === "~/server/db")
    code = "export const prisma = globalThis.__AUTOSTRUM_DRAFT_CHECK_DB__;";
  else if (file === "~/env") code = "export const env = {};";
  else if (file === "@clerk/nextjs/server")
    code = "export const getAuth = () => ({userId:null});";
  else if (file === "@vercel/functions")
    code = "export const waitUntil = () => {};";
  else {
    code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText;
    code = code.replace(
      /(from\s+|import\s*)["']([^"']+)["']/g,
      (match, prefix, specifier) => {
        let dependency;
        if (
          [
            "~/server/db",
            "~/env",
            "@clerk/nextjs/server",
            "@vercel/functions",
          ].includes(specifier)
        )
          dependency = pathToFileURL(compile(specifier)).href;
        else if (specifier.startsWith("~/"))
          dependency = pathToFileURL(
            compile(resolve(root, "src", `${specifier.slice(2)}.ts`)),
          ).href;
        else if (specifier.startsWith("."))
          dependency = pathToFileURL(
            compile(resolve(dirname(file), `${specifier}.ts`)),
          ).href;
        else dependency = import.meta.resolve(specifier);
        return `${prefix}${JSON.stringify(dependency)}`;
      },
    );
  }
  writeFileSync(output, code);
  return output;
}

function document(title = "") {
  return {
    title,
    artistId: null,
    description: null,
    genre: "",
    tuning: "e2 a2 d3 g3 b3 e4",
    bpm: -1,
    capo: 0,
    key: null,
    difficulty: 1,
    chords: [],
    strummingPatterns: [],
    sectionProgression: [],
    tabData: [{ id: crypto.randomUUID(), title: "Section 1", data: [] }],
  };
}
function context(userId) {
  return {
    auth: { userId },
    prisma: db,
    req: {},
    res: { revalidate: async () => {}, setHeader: () => {} },
    waitUntil: () => {},
  };
}
const rejectsWith = (promise, code) =>
  assert.rejects(promise, (error) => error.code === code);

try {
  const drafts = (
    await import(
      pathToFileURL(compile(resolve(root, "src/server/api/routers/draft.ts")))
        .href
    )
  ).draftRouter;
  const publicTabs = (
    await import(
      pathToFileURL(compile(resolve(root, "src/server/api/routers/tab.ts")))
        .href
    )
  ).tabRouter;
  globalThis.window = browserEnvironment;
  const persistence = await import(
    pathToFileURL(compile(resolve(root, "src/utils/drafts/draftStorage.ts")))
      .href
  );
  const { DraftSession } = await import(
    pathToFileURL(compile(resolve(root, "src/utils/drafts/DraftSession.ts")))
      .href
  );
  const owner = drafts.createCaller(context("owner-a"));
  const stranger = drafts.createCaller(context("owner-b"));
  const guest = drafts.createCaller(context(null));
  const first = {
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    expectedRevision: 0,
    sourceTabId: null,
    baseUpdatedAt: null,
    document: document(),
  };

  await rejectsWith(guest.list({ ownerId: "owner-a" }), "UNAUTHORIZED");
  const saved = await owner.save(first);
  assert.equal(saved.revision, 1);
  assert.equal(tabs.size, 0, "autosave must not publish");
  assert.equal(publishedCount, 0, "autosave must not change public counts");
  assert.equal((await owner.list({ ownerId: "owner-a" })).length, 1);
  assert.equal(
    (await stranger.list({ ownerId: "owner-a" })).length,
    0,
    "supplied cache scope cannot change authorization",
  );
  assert.equal(await stranger.get({ id: first.id, ownerId: "owner-a" }), null);
  await rejectsWith(
    stranger.save({
      ...first,
      expectedRevision: 1,
      mutationId: crypto.randomUUID(),
    }),
    "CONFLICT",
  );
  await rejectsWith(
    stranger.discard({ id: first.id, expectedRevision: 1 }),
    "CONFLICT",
  );
  assert.equal(
    (await owner.save(first)).revision,
    1,
    "lost-response replay must be idempotent",
  );
  const changed = {
    ...first,
    expectedRevision: 1,
    mutationId: crypto.randomUUID(),
    document: document("Newer draft"),
  };
  assert.equal((await owner.save(changed)).revision, 2);
  await rejectsWith(
    owner.save({ ...first, mutationId: crypto.randomUUID() }),
    "CONFLICT",
  );
  assert.equal(
    (await owner.get({ id: first.id, ownerId: "owner-a" })).document.title,
    "Newer draft",
  );
  await rejectsWith(
    owner.save({
      ...first,
      id: crypto.randomUUID(),
      document: { ...document(), tabData: [{}] },
    }),
    "BAD_REQUEST",
  );
  console.log(
    "PASS: private ownership, unfinished content, validation, revisions, idempotent retries",
  );

  const reference = { id: first.id, revision: 2 };
  const publicationInput = {
    ...changed.document,
    bpm: 75,
    genre: "Rock",
    draft: reference,
  };
  const publisher = publicTabs.createCaller(context("owner-a"));
  const published = await publisher.create(publicationInput);
  assert.equal(tabs.size, 1);
  assert.equal(publishedCount, 1);
  assert.equal(await owner.get({ id: first.id, ownerId: "owner-a" }), null);
  const replay = await publisher.create(publicationInput);
  assert.equal(replay.id, published.id);
  assert.equal(tabs.size, 1);
  assert.equal(
    publishedCount,
    1,
    "publication retries cannot duplicate public bookkeeping",
  );
  await rejectsWith(
    owner.save({
      ...changed,
      expectedRevision: 2,
      mutationId: crypto.randomUUID(),
    }),
    "CONFLICT",
  );
  const discardable = {
    ...first,
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
  };
  await owner.save(discardable);
  await owner.discard({ id: discardable.id, expectedRevision: 1 });
  await rejectsWith(owner.save(discardable), "CONFLICT");
  console.log(
    "PASS: atomic publication, safe replay, tombstones prevent draft resurrection",
  );

  const edit = {
    ...first,
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    sourceTabId: published.id,
    baseUpdatedAt: published.updatedAt,
    document: document("Private edit"),
  };
  await rejectsWith(stranger.save(edit), "NOT_FOUND");
  await owner.save(edit);
  assert.equal(tabs.get(published.id).title, "Newer draft");
  tabs.get(published.id).updatedAt = new Date(++clock);
  await rejectsWith(
    publisher.update({
      ...publicationInput,
      id: published.id,
      draft: { id: edit.id, revision: 1 },
    }),
    "CONFLICT",
  );
  assert.equal(
    (await owner.get({ id: edit.id, ownerId: "owner-a" })).document.title,
    "Private edit",
    "failed publication must roll back draft consumption",
  );
  const freshEdit = {
    ...edit,
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    baseUpdatedAt: tabs.get(published.id).updatedAt,
  };
  await owner.save(freshEdit);
  const updatedTab = await publisher.update({
    ...publicationInput,
    id: published.id,
    title: "Explicitly published edit",
    draft: { id: freshEdit.id, revision: 1 },
  });
  assert.equal(updatedTab.title, "Explicitly published edit");
  assert.equal(await owner.get({ id: freshEdit.id, ownerId: "owner-a" }), null);
  assert.ok(
    await owner.get({ id: edit.id, ownerId: "owner-a" }),
    "the conflicting version must remain recoverable",
  );
  console.log(
    "PASS: private edit isolation, publication conflicts, rollback, explicit updates preserve other drafts",
  );

  const one = persistence.newRecoveryRecord("owner-a", document("Local only"));
  const otherWriter = {
    ...one,
    writerId: crypto.randomUUID(),
    document: document("Other session"),
  };
  persistence.writeRecoveryRecord(one);
  persistence.writeRecoveryRecord(otherWriter);
  storage.set("autostrum:drafts:v1:owner-a:broken", "{bad json");
  assert.equal(persistence.readRecoveryRecords("owner-a").records.length, 2);
  assert.equal(persistence.readRecoveryRecords("owner-a").unreadable, 1);
  assert.equal(persistence.readRecoveryRecords("owner-b").records.length, 0);
  assert.equal(persistence.readRecoveryRecords(null).records.length, 0);
  persistence.removeUnchangedRecoveryRecord({
    ...one,
    mutationId: crypto.randomUUID(),
  });
  assert.equal(
    persistence.readRecoveryRecords("owner-a").records.length,
    2,
    "do not remove a changed writer's recovery copy",
  );
  storage.set("autostrum-tabData", JSON.stringify(document("Legacy")));
  persistence.migrateLegacyDraft();
  assert.equal(storage.has("autostrum-tabData"), false);
  assert.equal(
    persistence.readRecoveryRecords(null).records[0].document.title,
    "Legacy",
  );
  storage.set("autostrum-tabData", "{broken");
  persistence.migrateLegacyDraft();
  assert.equal(storage.get("autostrum-tabData"), "{broken");
  console.log(
    "PASS: separate writers, account-scoped recovery, corrupted records preserved, legacy migration",
  );

  function session(options = {}) {
    const states = [];
    const instance = new DraftSession({
      record: persistence.newRecoveryRecord("owner-a", document()),
      needsSave: false,
      hasRecovery: false,
      save: async () => ({ revision: 1, updatedAt: new Date() }),
      onState: (state) => states.push(state),
      debounceMs: 60_000,
      retryMs: 60_000,
      ...options,
    });
    sessions.push(instance);
    instance.start();
    return { instance, states };
  }
  let finishFirst;
  const calls = [];
  const coordinated = session({
    save: async (input) => {
      calls.push(input);
      if (calls.length === 1)
        await new Promise((resolveSave) => {
          finishFirst = resolveSave;
        });
      return { revision: calls.length, updatedAt: new Date() };
    },
  });
  coordinated.instance.update(document("First"));
  const flushing = coordinated.instance.flush();
  coordinated.instance.update(document("Typed during save"));
  finishFirst();
  await flushing;
  assert.equal(calls.length, 2);
  assert.equal(calls[0].expectedRevision, 0);
  assert.equal(calls[1].expectedRevision, 1);
  assert.equal(calls[1].document.title, "Typed during save");
  assert.equal(coordinated.instance.record.synced, true);
  assert.equal(coordinated.instance.record.revision, 2);
  const publication = await coordinated.instance.preparePublication();
  assert.equal(publication.revision, 2);
  coordinated.instance.completePublication({ id: 50, updatedAt: new Date() });
  assert.equal(
    persistence
      .readRecoveryRecords("owner-a")
      .records.some((record) => record.id === publication.id),
    false,
  );
  console.log(
    "PASS: edits during in-flight save, serialized requests, correct acknowledgements, publication cleanup",
  );

  const editing = session({
    record: persistence.newRecoveryRecord(
      "owner-a",
      document("Published base"),
      50,
      new Date().toISOString(),
    ),
  });
  editing.instance.update(document("An edit"));
  await editing.instance.flush();
  const consumedId = editing.instance.record.id;
  const publishedAt = new Date();
  editing.instance.completePublication({ id: 50, updatedAt: publishedAt });
  editing.instance.update(document("Another private edit"));
  assert.notEqual(editing.instance.record.id, consumedId);
  assert.equal(editing.instance.record.sourceTabId, 50);
  assert.equal(
    editing.instance.record.baseUpdatedAt,
    publishedAt.toISOString(),
  );
  assert.equal(editing.instance.record.revision, 0);
  console.log(
    "PASS: further edits after publication start a new private draft against the new base",
  );

  let tries = 0;
  const retried = session({
    save: async () => {
      if (++tries === 1) throw new Error("Offline");
      return { revision: 1, updatedAt: new Date() };
    },
  });
  retried.instance.update(document("Offline edit"));
  const mutation = retried.instance.record.mutationId;
  await retried.instance.flush();
  assert.equal(retried.states.at(-1).status, "error");
  assert.equal(
    retried.instance.needsUnloadWarning(),
    false,
    "durable local work survives offline navigation",
  );
  await retried.instance.flush();
  assert.equal(retried.instance.record.mutationId, mutation);
  assert.equal(retried.instance.record.synced, true);
  const conflicted = session({
    save: async () => {
      throw { data: { code: "CONFLICT" } };
    },
  });
  conflicted.instance.update(document("Keep both versions"));
  await conflicted.instance.flush();
  assert.equal(conflicted.states.at(-1).status, "conflict");
  await assert.rejects(conflicted.instance.preparePublication());
  const previousId = conflicted.instance.record.id;
  assert.notEqual(conflicted.instance.fork().id, previousId);
  assert.equal(conflicted.instance.record.document.title, "Keep both versions");
  const unavailable = session({ save: null, write: () => false });
  unavailable.instance.update(document("Storage full"));
  assert.equal(unavailable.instance.needsUnloadWarning(), true);
  assert.match(unavailable.states.at(-1).message, /unavailable/);
  console.log(
    "PASS: offline retry, local recovery, conflict forks, storage failure unload protection",
  );
  console.log("All private-draft verification checks passed.");
} finally {
  for (const session of sessions) session.dispose();
  delete globalThis.__AUTOSTRUM_DRAFT_CHECK_DB__;
  delete globalThis.window;
  assert.equal(dirname(temporary), resolve(tmpdir()));
  assert.ok(
    temporary.startsWith(resolve(tmpdir(), "autostrum-drafts-checks-")),
  );
  rmSync(temporary, { recursive: true, force: true });
}
