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
    code = "export const auth = async () => ({userId:null});";
  else if (file === "next/cache")
    code = "export const revalidatePath = () => {};";
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
            "next/cache",
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
    req: new Request("http://localhost/api/trpc"),
    resHeaders: new Headers(),
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
  const handoff = await import(
    pathToFileURL(compile(resolve(root, "src/utils/tabSignInHandoff.ts"))).href
  );
  const { DraftSession } = await import(
    pathToFileURL(compile(resolve(root, "src/utils/drafts/DraftSession.ts")))
      .href
  );
  const { emptyTabDocument, isDefaultTabDocument, serializeDraftDocument } =
    await import(
      pathToFileURL(compile(resolve(root, "src/utils/drafts/draftDocument.ts")))
        .href
    );
  const owner = drafts.createCaller(context("owner-a"));
  const stranger = drafts.createCaller(context("owner-b"));
  const guest = drafts.createCaller(context(null));
  const pristine = emptyTabDocument();
  assert.equal(isDefaultTabDocument(pristine), true);
  assert.equal(
    serializeDraftDocument(pristine),
    serializeDraftDocument(emptyTabDocument()),
    "fresh section and progression IDs do not count as edits",
  );
  assert.equal(
    isDefaultTabDocument({
      ...pristine,
      artistName: "",
      artistIsVerified: undefined,
      description: "",
      sectionProgression: [],
    }),
    true,
    "empty input values and an uncompiled progression are still defaults",
  );
  for (const edit of [
    { title: "An idea" },
    { artistId: 1 },
    { artistName: "An artist" },
    { description: "Work in progress" },
    { genre: "Rock" },
    { tuning: "d2 a2 d3 g3 b3 e4" },
    { bpm: 80 },
    { capo: 2 },
    { key: "A minor" },
    { difficulty: 2 },
    { tabData: [{ ...pristine.tabData[0], title: "Intro" }] },
    { tabData: [...pristine.tabData, emptyTabDocument().tabData[0]] },
    {
      chords: [
        { id: crypto.randomUUID(), name: "C", color: "#ffffff", frets: [] },
      ],
    },
    {
      strummingPatterns: [
        { id: crypto.randomUUID(), baseNoteLength: "quarter", strums: [] },
      ],
    },
    {
      sectionProgression: [
        { ...pristine.sectionProgression[0], repetitions: 2 },
      ],
    },
  ])
    assert.equal(isDefaultTabDocument({ ...pristine, ...edit }), false);

  const emptyInput = {
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    expectedRevision: 0,
    sourceTabId: null,
    baseUpdatedAt: null,
    document: pristine,
  };
  assert.equal((await owner.save(emptyInput)).revision, 0);
  assert.equal(
    rows.has(emptyInput.id),
    false,
    "defaults never create an account row",
  );
  handoff.saveTabForSignIn({ ...pristine, title: "Stale sign-in attempt" });
  handoff.saveTabForSignIn(pristine);
  assert.equal(handoff.readTabForSignIn(), null);
  assert.equal(storage.has("autostrum-tabData"), false);
  storage.set("autostrum-tabData", JSON.stringify(pristine));
  assert.equal(
    handoff.readTabForSignIn(),
    null,
    "legacy empty handoffs are ignored",
  );
  assert.equal(storage.has("autostrum-tabData"), false);
  console.log(
    "PASS: default detection, incomplete edits, no empty account rows or sign-in drafts",
  );

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
  assert.equal(
    rows.get(first.id).document.sectionProgression.length,
    1,
    "private autosave stores a default progression before playback compiles",
  );
  assert.equal(
    rows.get(first.id).document.sectionProgression[0].sectionId,
    first.document.tabData[0].id,
  );
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
  assert.equal(
    published.sectionProgression.length,
    1,
    "publishing an empty progression must persist defaults, even for zero-duration sections",
  );
  assert.equal(
    published.sectionProgression[0].sectionId,
    publicationInput.tabData[0].id,
  );
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
  const clearedPublishedEdit = {
    ...edit,
    id: crypto.randomUUID(),
    mutationId: crypto.randomUUID(),
    document: pristine,
  };
  assert.equal((await owner.save(clearedPublishedEdit)).revision, 1);
  assert.ok(
    await owner.get({ id: clearedPublishedEdit.id, ownerId: "owner-a" }),
    "resetting a published tab to create-page defaults is an edit worth saving",
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
  assert.equal(
    updatedTab.sectionProgression.length,
    1,
    "saving an edit with an empty progression must persist defaults",
  );
  assert.equal(await owner.get({ id: freshEdit.id, ownerId: "owner-a" }), null);
  assert.ok(
    await owner.get({ id: edit.id, ownerId: "owner-a" }),
    "the conflicting version must remain recoverable",
  );
  console.log(
    "PASS: private edit isolation, publication conflicts, rollback, explicit updates preserve other drafts",
  );

  const timedSections = ["Intro", "Chorus"].map((title, index) => ({
    id: crypto.randomUUID(),
    title,
    data: [
      {
        id: crypto.randomUUID(),
        type: "tab",
        bpm: index === 0 ? -1 : 60,
        baseNoteLength: "quarter",
        repetitions: 1,
        data: Array.from({ length: 4 }, () => ({
          id: crypto.randomUUID(),
          type: "note",
          palmMute: "",
          firstString: "0",
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
  }));
  const timedInput = {
    ...publicationInput,
    draft: undefined,
    bpm: 120,
    tabData: timedSections,
  };
  const timed = await publisher.create(timedInput);
  assert.deepEqual(
    timed.sectionProgression.map((entry) => [
      entry.sectionId,
      entry.startSeconds,
      entry.endSeconds,
    ]),
    [
      [timedSections[0].id, 0, 2],
      [timedSections[1].id, 2, 6],
    ],
  );
  const custom = [1, 0, 1].map((index, order) => ({
    id: crypto.randomUUID(),
    sectionId: timedSections[index].id,
    title: timedSections[index].title,
    repetitions: [2, 3, 1][order],
    startSeconds: 999,
    endSeconds: 999,
  }));
  const customCreate = await publisher.create({
    ...timedInput,
    sectionProgression: custom,
  });
  const customEdit = await publisher.update({
    ...timedInput,
    id: timed.id,
    sectionProgression: custom,
  });
  for (const result of [customCreate, customEdit]) {
    assert.deepEqual(
      result.sectionProgression.map(
        ({ startSeconds, endSeconds, ...entry }) => entry,
      ),
      custom.map(({ startSeconds, endSeconds, ...entry }) => entry),
      "custom ordering, IDs, and repetitions survive both write paths",
    );
    assert.deepEqual(
      result.sectionProgression.map((entry) => [
        entry.startSeconds,
        entry.endSeconds,
      ]),
      [
        [0, 8],
        [8, 14],
        [14, 18],
      ],
    );
  }
  const defaultEdit = await publisher.update({
    ...timedInput,
    id: timed.id,
    sectionProgression: [],
  });
  assert.deepEqual(
    defaultEdit.sectionProgression.map((entry) => entry.sectionId),
    timedSections.map((section) => section.id),
  );
  await rejectsWith(
    publisher.create({ ...timedInput, tabData: [] }),
    "BAD_REQUEST",
  );
  await rejectsWith(
    publisher.update({ ...timedInput, id: timed.id, tabData: [] }),
    "BAD_REQUEST",
  );
  console.log(
    "PASS: create/update fill empty progressions, preserve custom orders/repeats, recalculate timings, and reject sectionless tabs",
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
  assert.throws(() => persistence.newRecoveryRecord(null, document()));
  assert.equal(
    persistence.writeRecoveryRecord({ ...one, ownerId: null }),
    false,
  );
  assert.equal(
    persistence.recoveryRecordSchema.safeParse({ ...one, ownerId: null })
      .success,
    false,
  );
  persistence.removeUnchangedRecoveryRecord({
    ...one,
    mutationId: crypto.randomUUID(),
  });
  assert.equal(
    persistence.readRecoveryRecords("owner-a").records.length,
    2,
    "do not remove a changed writer's recovery copy",
  );
  handoff.saveTabForSignIn(document("Before signup"));
  const signInTab = handoff.readTabForSignIn();
  assert.equal(signInTab.document.title, "Before signup");
  assert.equal(storage.has("autostrum-tabData"), true);
  assert.equal(
    [...storage.keys()].some((key) =>
      key.startsWith("autostrum:drafts:v1:guest:"),
    ),
    false,
  );
  const restored = persistence.newRecoveryRecord("owner-a", signInTab.document);
  assert.equal(persistence.writeRecoveryRecord(restored), true);
  handoff.clearTabForSignIn(signInTab);
  assert.equal(handoff.readTabForSignIn(), null);
  assert.equal(
    persistence
      .readRecoveryRecords("owner-a")
      .records.find((record) => record.id === restored.id).document.title,
    "Before signup",
  );
  handoff.saveTabForSignIn(document("Another sign-in"));
  handoff.clearTabForSignIn(signInTab);
  assert.equal(handoff.readTabForSignIn().document.title, "Another sign-in");
  storage.set("autostrum-tabData", "{broken");
  assert.equal(handoff.readTabForSignIn(), null);
  assert.equal(storage.get("autostrum-tabData"), "{broken");
  console.log(
    "PASS: separate writers, account-only recovery, corrupted records preserved, one-time signup handoff",
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
  let emptySaves = 0;
  let emptyWrites = 0;
  const untouched = session({
    record: persistence.newRecoveryRecord("owner-a", pristine),
    save: async () => {
      emptySaves++;
      return { revision: 1, updatedAt: new Date() };
    },
    write: () => {
      emptyWrites++;
      return true;
    },
  });
  untouched.instance.update(emptyTabDocument());
  untouched.instance.retry();
  await untouched.instance.flush();
  assert.equal(await untouched.instance.preparePublication(), undefined);
  assert.equal(emptySaves, 0);
  assert.equal(emptyWrites, 0);
  assert.equal(untouched.instance.needsUnloadWarning(), false);

  // Simulate a default-only account draft written by an older app version.
  const legacyInput = {
    ...emptyInput,
    id: crypto.randomUUID(),
    document: { ...pristine, title: "Old draft" },
  };
  await owner.save(legacyInput);
  rows.get(legacyInput.id).document = pristine;
  rows.get(legacyInput.id).title = "";
  const legacyRecord = {
    ...persistence.newRecoveryRecord("owner-a", pristine),
    id: legacyInput.id,
    revision: 1,
    synced: true,
  };
  const legacy = session({
    record: legacyRecord,
    hasRecovery: true,
    save: owner.save,
  });
  await legacy.instance.flush();
  assert.equal(
    await owner.get({ id: legacyInput.id, ownerId: "owner-a" }),
    null,
  );
  assert.equal(storage.has(persistence.recoveryKey(legacyRecord)), false);

  const reverted = session({
    record: persistence.newRecoveryRecord("owner-a", pristine),
    save: owner.save,
  });
  const draftId = reverted.instance.record.id;
  reverted.instance.update({ ...pristine, title: "An idea" });
  assert.equal(
    storage.has(persistence.recoveryKey(reverted.instance.record)),
    true,
  );
  reverted.instance.update({ ...pristine, description: "" });
  await reverted.instance.flush();
  assert.equal(rows.has(draftId), false);
  assert.equal(
    storage.has(persistence.recoveryKey(reverted.instance.record)),
    false,
  );
  assert.equal(reverted.states.at(-1).status, "idle");

  reverted.instance.update({ ...pristine, title: "Keep this idea" });
  await reverted.instance.flush();
  assert.equal(
    (await owner.get({ id: draftId, ownerId: "owner-a" })).document.title,
    "Keep this idea",
  );
  const revision = reverted.instance.record.revision;
  const snapshot = reverted.instance.record.document;
  reverted.instance.update({
    ...snapshot,
    sectionProgression: snapshot.sectionProgression.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      startSeconds: 12,
      endSeconds: 24,
    })),
  });
  await reverted.instance.flush();
  assert.equal(
    reverted.instance.record.revision,
    revision,
    "derived timing and progression IDs do not autosave",
  );
  const clearInput = {
    ...emptyInput,
    id: draftId,
    expectedRevision: revision,
    mutationId: crypto.randomUUID(),
  };
  await rejectsWith(stranger.save(clearInput), "CONFLICT");
  assert.equal((await owner.save(clearInput)).revision, 0);
  assert.equal(
    (await owner.save(clearInput)).revision,
    0,
    "reset replay is idempotent",
  );
  await rejectsWith(
    owner.save({
      ...clearInput,
      document: snapshot,
      mutationId: crypto.randomUUID(),
    }),
    "CONFLICT",
  );
  assert.equal(await owner.get({ id: draftId, ownerId: "owner-a" }), null);

  let finishReset;
  let resetStarted;
  const resetReady = new Promise((resolveReset) => {
    resetStarted = resolveReset;
  });
  const resetCalls = [];
  const resetting = session({
    record: persistence.newRecoveryRecord("owner-a", pristine),
    save: async (input) => {
      resetCalls.push(input);
      const result = await owner.save(input);
      if (result.revision === 0 && resetCalls.length === 2)
        await new Promise((resolveSave) => {
          finishReset = resolveSave;
          resetStarted();
        });
      return result;
    },
  });
  resetting.instance.update({ ...pristine, title: "First idea" });
  await resetting.instance.flush();
  const resetId = resetting.instance.record.id;
  resetting.instance.update(pristine);
  const clearing = resetting.instance.flush();
  await resetReady;
  resetting.instance.update({ ...pristine, title: "Typed during reset" });
  finishReset();
  await clearing;
  assert.notEqual(resetting.instance.record.id, resetId);
  assert.equal(resetting.instance.record.revision, 1);
  assert.equal(resetCalls.at(-1).expectedRevision, 0);
  assert.equal(await owner.get({ id: resetId, ownerId: "owner-a" }), null);
  assert.equal(
    (await owner.get({ id: resetting.instance.record.id, ownerId: "owner-a" }))
      .document.title,
    "Typed during reset",
  );
  resetting.instance.update(pristine);
  await resetting.instance.flush();
  assert.equal(resetting.states.at(-1).status, "idle");
  assert.equal(resetting.instance.record.revision, 0);
  assert.equal(
    persistence
      .readRecoveryRecords("owner-a")
      .records.some(
        (record) =>
          record.id === resetting.instance.record.id || record.id === resetId,
      ),
    false,
  );
  console.log(
    "PASS: untouched sessions, undo to defaults, derived updates, safe account reset and edits during reset",
  );

  let finishCreate;
  let createStarted;
  const createReady = new Promise((resolveCreate) => {
    createStarted = resolveCreate;
  });
  const revertingDuringCreate = session({
    record: persistence.newRecoveryRecord("owner-a", pristine),
    save: async (input) => {
      const result = await owner.save(input);
      if (input.expectedRevision === 0)
        await new Promise((resolveSave) => {
          finishCreate = resolveSave;
          createStarted();
        });
      return result;
    },
  });
  revertingDuringCreate.instance.update({
    ...pristine,
    title: "Temporary idea",
  });
  const initialId = revertingDuringCreate.instance.record.id;
  const creating = revertingDuringCreate.instance.flush();
  await createReady;
  revertingDuringCreate.instance.update(pristine);
  finishCreate();
  await creating;
  assert.equal(await owner.get({ id: initialId, ownerId: "owner-a" }), null);
  assert.equal(revertingDuringCreate.instance.record.revision, 0);
  assert.equal(revertingDuringCreate.states.at(-1).status, "idle");
  assert.equal(
    persistence
      .readRecoveryRecords("owner-a")
      .records.some((record) => record.id === initialId),
    false,
  );
  console.log(
    "PASS: reset during the first account request leaves no active draft",
  );

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
  conflicted.instance.update(document("Keep my edits"));
  await conflicted.instance.flush();
  assert.equal(conflicted.states.at(-1).status, "conflict");
  await assert.rejects(conflicted.instance.preparePublication());
  const previousId = conflicted.instance.record.id;
  conflicted.instance.update(document("More edits during a conflict"));
  await conflicted.instance.flush();
  assert.equal(conflicted.instance.record.id, previousId);
  assert.equal(conflicted.states.at(-1).status, "conflict");
  assert.equal(
    JSON.parse(storage.get(persistence.recoveryKey(conflicted.instance.record)))
      .document.title,
    "More edits during a conflict",
  );
  await assert.rejects(conflicted.instance.preparePublication());
  const unavailable = session({ write: () => false });
  unavailable.instance.update(document("Storage full"));
  assert.equal(unavailable.instance.needsUnloadWarning(), true);
  assert.match(unavailable.states.at(-1).message, /unavailable/);
  console.log(
    "PASS: offline retry, local recovery, conflicts preserve edits, storage failure unload protection",
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
