// Run: node scripts/verifyAudioContextRecovery.mjs (Node 22.15+).
// Exercise the production recovery helper and stores with browser state faults.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    let url;
    if (specifier.startsWith("~/"))
      url = new URL(specifier.slice(2), sourceRoot);
    else if (specifier.startsWith("."))
      url = new URL(specifier, context.parentURL);
    if (url?.href.startsWith(sourceRoot.href)) {
      for (const suffix of ["", ".ts", ".tsx", ".js"]) {
        const candidate = new URL(url.href + suffix);
        if (existsSync(candidate)) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith("/utils/soundfontRuntime.ts")) {
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export const ensureSoundfontPlayer = (...args) => globalThis.loadTestSoundfont(...args);",
      };
    }
    if (url.startsWith(sourceRoot.href) && /\.tsx?$/.test(url)) {
      const { outputText } = ts.transpileModule(
        readFileSync(new URL(url), "utf8"),
        {
          fileName: new URL(url).pathname,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
          },
        },
      );
      return { format: "module", source: outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { createTabStore } = await import("../src/stores/TabStore.ts");
const { resumeAudioContext, watchAudioContext, loadCountInBuffer } =
  await import("../src/utils/audioContextRecovery.ts");
const { useIPhoneAudioReminderStore: reminder } =
  await import("../src/stores/IPhoneAudioReminderStore.ts");

const documentTarget = new EventTarget();
documentTarget.visibilityState = "visible";
globalThis.document = documentTarget;
globalThis.window = new EventTarget();
Object.defineProperty(navigator, "userAgent", {
  configurable: true,
  value:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15",
});
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
globalThis.fetch = async () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(1),
});
const contexts = [];
let nextMode = "run";
class FakeAudioContext extends EventTarget {
  state = "suspended";
  currentTime = 0;
  resumeCalls = 0;
  closeCalls = 0;
  destination = {};
  mode = nextMode;
  constructor() {
    super();
    contexts.push(this);
  }
  changeState(state) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
  resume() {
    this.resumeCalls++;
    if (this.state === "closed") throw new Error("Closed context");
    if (this.mode === "reject")
      return Promise.reject(new Error("Activation denied"));
    if (this.mode === "hang") return new Promise(() => {});
    if (this.mode === "run") this.changeState("running");
    return Promise.resolve();
  }
  close() {
    this.closeCalls++;
    this.changeState("closed");
    return Promise.resolve();
  }
  createGain() {
    return { context: this, gain: { value: 1 }, connect() {} };
  }
  decodeAudioData() {
    return Promise.resolve({ decodedBy: this });
  }
}
globalThis.AudioContext = FakeAudioContext;
globalThis.loadTestSoundfont = async (context, name) => ({
  context,
  name,
  stop() {},
});
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function setup(mode = "run") {
  nextMode = "run";
  const context = new FakeAudioContext();
  context.mode = mode;
  const gain = context.createGain();
  gain.gain.value = 0.4;
  const store = createTabStore(
    { audioContext: context, masterVolumeGainNode: gain },
    () => {},
  );
  return { store, context, gain };
}
function resetReminder() {
  reminder.setState({ open: false, hasPrompted: false });
  storage.clear();
}

for (const state of ["suspended", "interrupted"]) {
  const context = new FakeAudioContext();
  context.state = state;
  const resumed = resumeAudioContext(context);
  assert.equal(context.resumeCalls, 1, "Resume must be issued synchronously");
  assert.equal(await resumed, true, `${state} can resume`);
}
{
  const context = new FakeAudioContext();
  context.mode = "hang";
  const first = resumeAudioContext(context);
  context.mode = "run";
  const second = resumeAudioContext(context);
  assert.equal(
    context.resumeCalls,
    2,
    "Fresh gesture retries a pending resume",
  );
  assert.equal(await first, true);
  assert.equal(await second, true);
  context.state = "closed";
  assert.equal(await resumeAudioContext(context), false);
  assert.equal(context.resumeCalls, 2, "Closed contexts cannot resume");
}
{
  const context = new FakeAudioContext();
  context.mode = "hang";
  const startedAt = Date.now();
  assert.equal(await resumeAudioContext(context), false);
  assert.ok(
    Date.now() - startedAt < 2500,
    "A pending Safari promise must time out",
  );
  context.mode = "run";
  assert.equal(
    await resumeAudioContext(context),
    true,
    "A timeout allows the next gesture to retry",
  );
}
console.log(
  "PASS: suspended/interrupted/closed, pending gesture retry, resume timeout",
);

{
  resetReminder();
  const { store, context } = setup();
  context.state = "interrupted";
  const ready = await store.getState().ensureAudioSystemReady();
  assert.equal(
    ready.audioContext,
    context,
    "Recoverable interruption preserves graph",
  );
  assert.equal(ready.currentInstrument.context, context);
  assert.equal(context.closeCalls, 0);
  assert.equal(
    reminder.getState().open,
    false,
    "Healthy iPhone playback has no drawer",
  );
}
{
  const { store, context } = setup("reject");
  const before = contexts.length;
  const first = store.getState().ensureAudioSystemReady();
  const second = store.getState().ensureAudioSystemReady();
  const [one, two] = await Promise.all([first, second]);
  assert.equal(
    one.audioContext,
    two.audioContext,
    "Concurrent starts share recovery",
  );
  assert.notEqual(one.audioContext, context);
  assert.equal(context.closeCalls, 1);
  assert.equal(contexts.length, before + 1);
  assert.equal(one.masterVolumeGainNode.gain.value, 0.4);
  assert.equal(one.currentInstrument.context, one.audioContext);
}
{
  const { store, context } = setup();
  context.state = "closed";
  const readyPromise = store.getState().ensureAudioSystemReady();
  assert.notEqual(
    store.getState().audioContext,
    context,
    "Closed context replaced before awaiting",
  );
  assert.equal(store.getState().audioContext.resumeCalls, 1);
  assert.ok(await readyPromise);
}
{
  const store = createTabStore({}, () => {});
  const readyPromise = store.getState().ensureAudioSystemReady();
  assert.equal(
    store.getState().audioContext.resumeCalls,
    1,
    "Cold start unlocks in gesture",
  );
  assert.ok(await readyPromise);
}
{
  resetReminder();
  const { store } = setup("reject");
  nextMode = "reject";
  assert.equal(await store.getState().ensureAudioSystemReady(), null);
  assert.equal(
    reminder.getState().open,
    true,
    "Drawer follows a real recovery failure",
  );
  reminder.getState().dismissReminder();
  store.getState().audioContext.mode = "run";
  assert.ok(
    await store.getState().ensureAudioSystemReady(),
    "Dismissed drawer never gates retry",
  );
  assert.equal(reminder.getState().open, false);
  nextMode = "run";
}
{
  const { store } = setup("hang");
  const ready = await store.getState().ensureAudioSystemReady();
  assert.ok(ready, "Hung resume falls back to a fresh working context");
}
console.log(
  "PASS: cold/closed creation, resume before replacement, concurrency, failed recovery drawer, retry",
);

{
  const { store, context } = setup();
  let release;
  globalThis.loadTestSoundfont = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const ready = store.getState().ensureAudioSystemReady();
  await tick();
  const replacement = new FakeAudioContext();
  store.setState({
    audioContext: replacement,
    masterVolumeGainNode: replacement.createGain(),
  });
  release({ context, stop() {} });
  assert.equal(await ready, null);
  assert.equal(
    store.getState().currentInstrument,
    null,
    "Stale load cannot overwrite replacement",
  );
}
{
  const { store, context } = setup();
  let release;
  globalThis.loadTestSoundfont = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const playing = store.getState().playTab({});
  await tick();
  store.getState().pauseAudio();
  release({ context, stop() {} });
  await playing;
  assert.equal(
    store.getState().audioMetadata.playing,
    false,
    "Pause cancels a pending play start",
  );
}
{
  const { store, context } = setup();
  let release;
  globalThis.loadTestSoundfont = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const ready = store.getState().ensureAudioSystemReady();
  await tick();
  context.mode = "reject";
  context.state = "interrupted";
  release({ context, stop() {} });
  assert.equal(
    await ready,
    null,
    "An interruption during sample loading cannot start previews",
  );
}
globalThis.loadTestSoundfont = async (context, name) => ({
  context,
  name,
  stop() {},
});
console.log(
  "PASS: stale sample loads, pause while preparing, interruption during loading",
);

{
  const { store, context } = setup();
  let release;
  globalThis.loadTestSoundfont = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const pending = store.getState().ensureAudioSystemReady();
  await tick();
  store.getState().pauseAudio();
  // Returning to a visible page before loading finishes must not revive intent.
  document.visibilityState = "visible";
  release({ context, stop() {} });
  assert.equal(
    await pending,
    null,
    "Background/pause cancels preflight readiness as well as playTab",
  );
}

{
  const { store, context } = setup();
  let release;
  globalThis.loadTestSoundfont = async (loadingContext) => {
    if (loadingContext === context)
      return new Promise((resolve) => {
        release = resolve;
      });
    return { context: loadingContext, stop() {} };
  };
  const stale = store.getState().ensureAudioSystemReady();
  await tick();
  const replacement = store.getState().initializeAudioSystem(true);
  const ready = await store.getState().ensureAudioSystemReady();
  assert.equal(
    ready.audioContext,
    replacement,
    "Abandoned loading must not block a new context",
  );
  release({ context, stop() {} });
  assert.equal(await stale, null);
  assert.equal(store.getState().currentInstrument.context, replacement);
}
{
  resetReminder();
  const store = createTabStore({}, () => {});
  globalThis.AudioContext = class {
    constructor() {
      throw new Error("Audio device unavailable");
    }
  };
  const originalError = console.error;
  try {
    console.error = () => {};
    assert.equal(await store.getState().ensureAudioSystemReady(), null);
    assert.equal(reminder.getState().open, true);
  } finally {
    console.error = originalError;
    globalThis.AudioContext = FakeAudioContext;
  }
  globalThis.loadTestSoundfont = async (context) => ({ context, stop() {} });
  assert.ok(
    await store.getState().ensureAudioSystemReady(),
    "Audio device allocation can be retried",
  );
}
console.log(
  "PASS: abandoned context loads cannot block recovery; device allocation failure is retryable",
);

{
  const context = new FakeAudioContext();
  let unavailable = 0;
  const cleanup = watchAudioContext(context, () => unavailable++);
  window.dispatchEvent(new Event("focus"));
  assert.equal(
    context.resumeCalls,
    0,
    "Focus before first gesture does not autoplay",
  );
  document.dispatchEvent(new Event("touchend"));
  await tick();
  assert.equal(context.state, "running");
  context.changeState("interrupted");
  await tick();
  assert.equal(context.state, "running", "Foreground interruption is retried");
  document.visibilityState = "hidden";
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(unavailable, 1, "Backgrounding cancels playback intent");
  const calls = context.resumeCalls;
  context.changeState("interrupted");
  assert.equal(
    context.resumeCalls,
    calls,
    "Hidden page does not fight OS interruption",
  );
  document.visibilityState = "visible";
  document.dispatchEvent(new Event("visibilitychange"));
  await tick();
  assert.equal(context.state, "running");
  cleanup();
  context.state = "suspended";
  const callsBeforeCleanup = context.resumeCalls;
  window.dispatchEvent(new Event("pageshow"));
  document.dispatchEvent(new Event("click"));
  assert.equal(
    context.resumeCalls,
    callsBeforeCleanup,
    "Cleanup removes every recovery listener",
  );
}
{
  const context = new FakeAudioContext();
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return { ok: requests > 1, arrayBuffer: async () => new ArrayBuffer(1) };
  };
  await assert.rejects(loadCountInBuffer(context));
  const [one, two] = await Promise.all([
    loadCountInBuffer(context),
    loadCountInBuffer(context),
  ]);
  assert.equal(one, two);
  assert.equal(
    requests,
    2,
    "Count-in load retries failures and shares successful work",
  );
}
console.log(
  "PASS: gesture/foreground/statechange recovery, background cancellation, cleanup, count-in load retry",
);
