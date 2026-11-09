// Run: node scripts/verifyFeedback.mjs
// Exercise the real tRPC router without contacting Clerk or the database.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      "~/server/db": "export const prisma = {};",
      "@clerk/nextjs/server":
        "export const auth = async () => ({ userId: null });",
      "@vercel/functions": "export const waitUntil = () => {};",
    };
    if (stubs[specifier])
      return {
        url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`,
        shortCircuit: true,
      };
    if (specifier.startsWith("~/"))
      return {
        url: pathToFileURL(resolve("src", `${specifier.slice(2)}.ts`)).href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});

try {
  const { feedbackRouter } =
    await import("../src/server/api/routers/feedback.ts");
  const saved = [];
  let fail = false;
  const caller = feedbackRouter.createCaller({
    auth: { userId: null },
    prisma: {
      feedback: {
        async create({ data }) {
          if (fail) throw new Error("Database unavailable");
          saved.push(data);
          return { id: saved.length };
        },
      },
    },
  });

  // All categories work for guests; messages are normalized before storage.
  for (const category of ["FEATURE_REQUEST", "BUG", "OTHER"]) {
    assert.deepEqual(
      await caller.create({ category, message: "  Feedback\nwith details  " }),
      { success: true },
    );
    assert.deepEqual(saved.at(-1), {
      category,
      message: "Feedback\nwith details",
    });
  }
  await caller.create({ category: "OTHER", message: "a".repeat(5000) });

  const before = saved.length;
  for (const input of [
    { category: "INVALID", message: "An idea" },
    { category: "BUG", message: " \n\t " },
    { category: "BUG", message: "a".repeat(5001) },
    { category: "BUG" },
    { message: "Missing category" },
  ]) {
    await assert.rejects(caller.create(input), { code: "BAD_REQUEST" });
  }
  assert.equal(saved.length, before, "invalid feedback must never be saved");

  fail = true;
  await assert.rejects(
    caller.create({ category: "BUG", message: "A valid report" }),
    { code: "INTERNAL_SERVER_ERROR" },
  );
  assert.equal(saved.length, before, "failed writes must not report success");
  console.log(
    "Feedback router: categories, guest access, trimming, limits, and failed writes passed.",
  );
} finally {
  hooks.deregister();
}
