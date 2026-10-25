// Run with: node scripts/verifyAudioContextRecovery.mjs (Node 22.15+).
// Deterministic Web Audio/lifecycle regression checks; no device, network, or DB needed.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { test, beforeEach, afterEach, mock } from "node:test";
import ts from "typescript";

// Load production TypeScript and its ~ aliases without adding a test framework.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("~/")) {
      const base = resolve("src", specifier.slice(2));
      const path = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`].find(
        existsSync,
      );
      if (!path) throw new Error(`Unresolved test import: ${specifier}`);
      return nextResolve(pathToFileURL(path).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.includes("/src/")) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      const path = [`${base}.ts`, `${base}.tsx`, `${base}.js`].find(existsSync);
      if (path) return nextResolve(pathToFileURL(path).href, context);
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
    if (
      url.startsWith("file:") &&
      /\.[cm]?tsx?$/.test(url) &&
      !url.includes("/node_modules/")
    ) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          fileName: fileURLToPath(url),
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
const {
  createAudioContextController,
  resumeAudioContext,
  loadCountInBuffer,
  withAudioLoadTimeout,
} = await import("../src/utils/audioContextRecovery.ts");
const { createTabStore } = await import("../src/stores/TabStore.ts");

let now = 0;
let controllers = [];
let stores = [];
class FakeTarget {
  listeners = new Map();
  addEventListener(type, listener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type, event = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])])
      listener({ type, ...event });
  }
  count(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}
class FakeContext extends FakeTarget {
  static instances = [];
  static nextResume = null;
  static freezeNext = false;
  state = "suspended";
  resumeCalls = 0;
  closeCalls = 0;
  frozen = FakeContext.freezeNext;
  resumeImpl = FakeContext.nextResume;
  destination = { context: this };
  sources = [];
  constructor() {
    super();
    FakeContext.instances.push(this);
    FakeContext.freezeNext = false;
    FakeContext.nextResume = null;
  }
  get currentTime() {
    return this.frozen ? 0 : now / 1000;
  }
  setState(state) {
    this.state = state;
    this.emit("statechange");
  }
  resume() {
    this.resumeCalls++;
    if (this.resumeImpl) return this.resumeImpl(this);
    this.setState("running");
    return Promise.resolve();
  }
  close() {
    this.closeCalls++;
    this.setState("closed");
    return Promise.resolve();
  }
  createGain() {
    return {
      context: this,
      gain: {
        value: 1,
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
      connect() {},
      disconnect() {},
    };
  }
  createBufferSource() {
    const node = {
      context: this,
      detune: { value: 0 },
      connect() {},
      disconnect() {},
      start() {
        node.started = true;
      },
      stop() {
        if (!node.started) throw new Error("source stopped before start");
        node.stopped = true;
      },
    };
    this.sources.push(node);
    return node;
  }
  createBuffer(channels, length, sampleRate) {
    return { numberOfChannels: channels, length, sampleRate };
  }
  sampleRate = 48000;
  createOscillator() {
    const node = this.createBufferSource();
    node.frequency = { value: 0 };
    return node;
  }
  decodeAudioData() {
    return Promise.resolve({ decoded: true });
  }
}
let doc;
let win;
let activation;
const originals = new Map();
function setGlobal(name, value) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
async function advance(ms) {
  for (let left = ms; left > 0;) {
    const step = Math.min(left, 50);
    now += step;
    mock.timers.tick(step);
    await flush();
    left -= step;
  }
}
function controller() {
  const changes = [];
  const events = [];
  const owner = createAudioContextController({
    onContextChange: (context) => changes.push(context),
    onUnavailable: (reason) => events.push(reason),
  });
  controllers.push(owner);
  return { owner, changes, events };
}
function store() {
  const value = createTabStore({}, () => {});
  stores.push(value);
  return value;
}
async function ready(owner) {
  const result = owner.ensureRunning();
  await flush();
  await advance(100);
  return result;
}
beforeEach(() => {
  now = 0;
  controllers = [];
  stores = [];
  FakeContext.instances = [];
  FakeContext.nextResume = null;
  FakeContext.freezeNext = false;
  doc = new FakeTarget();
  doc.visibilityState = "visible";
  win = new FakeTarget();
  win.AudioContext = FakeContext;
  activation = { isActive: false };
  setGlobal("loadTestSoundfont", async (context, name) => ({
    context,
    name,
    stop() {},
  }));
  setGlobal("window", win);
  setGlobal("document", doc);
  setGlobal("navigator", { userActivation: activation, userAgent: "Test" });
  mock.timers.enable({ apis: ["setTimeout"] });
  mock.method(performance, "now", () => now);
});
afterEach(async () => {
  for (const value of stores) value.getState().disposeAudioSystem();
  for (const owner of controllers) owner.dispose();
  await flush();
  mock.timers.reset();
  mock.restoreAll();
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  originals.clear();
});

test("resume is synchronous, bounded, and shared; a new tap retries a hanging resume", async () => {
  const ctx = new FakeContext();
  ctx.resumeImpl = () => new Promise(() => {});
  const first = resumeAudioContext(ctx);
  assert.equal(ctx.resumeCalls, 1);
  await advance(1000);
  activation.isActive = true;
  const second = resumeAudioContext(ctx);
  activation.isActive = false;
  assert.equal(first, second);
  await advance(300);
  let settled = false;
  void first.then(() => {
    settled = true;
  });
  await flush();
  assert.equal(settled, false, "fresh tap gets a fresh deadline");
  ctx.setState("running");
  assert.equal(await first, true);
  assert.equal(ctx.count("statechange"), 0);
});

test("a stale rejected resume cannot defeat a newer successful gesture", async () => {
  const ctx = new FakeContext();
  let rejectOld;
  ctx.resumeImpl = () =>
    new Promise((_resolve, reject) => {
      rejectOld = reject;
    });
  const first = resumeAudioContext(ctx);
  ctx.resumeImpl = () => new Promise(() => {});
  resumeAudioContext(ctx);
  rejectOld(new Error("old resume rejected"));
  await flush();
  ctx.setState("running");
  assert.equal(await first, true);
});

test("failed resume never recreates after await; the next trusted gesture creates and unlocks exactly once", async () => {
  FakeContext.nextResume = () => new Promise(() => {});
  const { owner, changes, events } = controller();
  const first = owner.ensureRunning();
  const old = changes[0];
  await advance(1250);
  assert.equal(await first, null);
  assert.deepEqual(events, ["resume-failed"]);
  assert.equal(changes.length, 1);
  win.emit("focus");
  doc.emit("click", { isTrusted: false });
  assert.equal(changes.length, 1);
  doc.emit("touchend", { isTrusted: true });
  assert.equal(changes.length, 2);
  assert.equal(
    changes[1].resumeCalls,
    1,
    "unlock happens inside the gesture callback",
  );
  assert.equal(old.closeCalls, 1);
  const second = owner.ensureRunning();
  await advance(100);
  assert.equal(await second, changes[1]);
});

test("running with a frozen clock fails readiness and is replaced on a gesture", async () => {
  FakeContext.freezeNext = true;
  const { owner, changes, events } = controller();
  const first = owner.ensureRunning();
  await flush();
  await advance(650);
  assert.equal(await first, null);
  assert.deepEqual(events, ["resume-failed"]);
  doc.emit("click", { isTrusted: true });
  const result = owner.ensureRunning();
  await advance(100);
  assert.equal(await result, changes[1]);
});

test("a trusted tap retries a running context while its clock check is pending", async () => {
  const { owner, changes } = controller();
  const ctx = owner.initialize();
  ctx.state = "running";
  ctx.frozen = true;
  ctx.resumeImpl = () => {
    ctx.frozen = false;
    return Promise.resolve();
  };
  const pending = owner.ensureRunning();
  await advance(100);
  assert.equal(ctx.resumeCalls, 0, "background checks do not re-unlock audio");
  // Deliberately leave navigator.userActivation false: the capture listener
  // must preserve the gesture even on Safari versions without that API.
  doc.emit("touchend", { isTrusted: true });
  assert.equal(
    ctx.resumeCalls,
    1,
    "running is not proof that Safari unlocked audio",
  );
  await advance(100);
  assert.equal(await pending, ctx);
  assert.equal(
    changes.length,
    1,
    "the current tap recovers the existing graph",
  );
});

test("cold modal playback unlocks a source in the tap before waiting for the clock", async () => {
  const value = store();
  const ctx = value.getState().initializeAudioSystem();
  ctx.frozen = true;
  const createSource = ctx.createBufferSource.bind(ctx);
  let unlock;
  ctx.createBufferSource = () => {
    const source = createSource();
    const start = source.start;
    source.start = () => {
      assert.equal(
        activation.isActive,
        true,
        "unlock must precede the first await",
      );
      assert.equal(
        source.buffer.length,
        1,
        "unlock is a silent one-frame buffer",
      );
      ctx.frozen = false;
      unlock = source;
      start();
    };
    return source;
  };
  let plays = 0;
  value.setState({
    playTab: async () => {
      plays++;
    },
  });
  activation.isActive = true;
  const start = value.getState().playTabWithCountIn({ countIn: false });
  activation.isActive = false;
  await advance(1300);
  await start;
  assert.equal(
    plays,
    1,
    "the first tap reaches playback instead of reverting to Play",
  );
  assert.equal(value.getState().audioPreparationPending, false);
  assert.ok(unlock?.started);
  mock.method(unlock, "disconnect");
  unlock.onended();
  assert.equal(unlock.disconnect.mock.callCount(), 1);
  assert.equal(unlock.onended, null);
});

test("a rendering clock that freezes during playback is detected without a statechange", async () => {
  const { owner, changes, events } = controller();
  await ready(owner);
  changes[0].frozen = true;
  await advance(1100);
  assert.ok(events.includes("resume-failed"));
});

test("background invalidates pending readiness even if Safari resolves resume later", async () => {
  const { owner, changes, events } = controller();
  FakeContext.nextResume = () => new Promise(() => {});
  const first = owner.ensureRunning();
  doc.visibilityState = "hidden";
  doc.emit("visibilitychange");
  changes[0].setState("running");
  await advance(100);
  assert.equal(await first, null);
  assert.ok(events.includes("background"));
  assert.equal(await owner.ensureRunning(), null);
});

test("suspension/interruption stops consumers immediately and recovers the existing context", async () => {
  const { owner, changes, events } = controller();
  await ready(owner);
  changes[0].setState("interrupted");
  assert.ok(events.includes("interrupted"));
  await flush();
  await advance(100);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].state, "running");
});

test("all sessions share DOM listeners; disposing removes listeners and cannot resurrect the session", async () => {
  const a = controller();
  const b = controller();
  a.owner.initialize();
  b.owner.initialize();
  assert.equal(doc.count("click"), 1);
  assert.equal(win.count("pagehide"), 1);
  a.owner.dispose();
  assert.equal(doc.count("click"), 1);
  b.owner.dispose();
  assert.equal(doc.count("click"), 0);
  assert.equal(win.count("pagehide"), 0);
  doc.emit("click", { isTrusted: true });
  assert.equal(FakeContext.instances.length, 2);
});

test("closed contexts and prefixed Safari constructors use the same lifecycle", async () => {
  win.webkitAudioContext = FakeContext;
  delete win.AudioContext;
  const { owner, changes, events } = controller();
  await ready(owner);
  changes[0].setState("closed");
  assert.ok(events.includes("closed"));
  await ready(owner);
  assert.equal(changes.length, 2);
});

test("asset download/decode timeouts evict cache entries and allow a retry", async () => {
  let fetches = 0;
  mock.method(globalThis, "fetch", () => {
    fetches++;
    return new Promise(() => {});
  });
  const ctx = new FakeContext();
  const load = loadCountInBuffer(ctx);
  assert.equal(load, loadCountInBuffer(ctx));
  const rejected = assert.rejects(load, /timed out/);
  await advance(15050);
  await rejected;
  globalThis.fetch.mock.mockImplementation(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(0),
  }));
  assert.deepEqual(await loadCountInBuffer(ctx), { decoded: true });
  assert.equal(fetches, 1);
  const stalled = assert.rejects(
    withAudioLoadTimeout(new Promise(() => {}), "Instrument"),
    /timed out/,
  );
  await advance(15050);
  await stalled;
});

test("resource-free store readiness never downloads samples and clears context-bound resources on recreation", async () => {
  const value = store();
  mock.method(globalThis, "fetch", () => {
    throw new Error("should not fetch");
  });
  const result = value.getState().ensureAudioContextReady();
  await flush();
  await advance(100);
  assert.ok(await result);
  value.setState({
    currentInstrument: { stop() {} },
    instruments: { old: {} },
    countInBuffer: {},
  });
  value.getState().audioContext.setState("closed");
  const second = value.getState().ensureAudioContextReady();
  assert.equal(value.getState().currentInstrument, null);
  assert.equal(value.getState().countInBuffer, null);
  assert.deepEqual(value.getState().instruments, {});
  await advance(100);
  assert.ok(await second);
});

test("count-in sources and delayed playback are canceled by pause, interruption, and disposal", async () => {
  for (const reason of ["pause", "interruption", "dispose"]) {
    const value = store();
    const graphReady = value.getState().ensureAudioContextReady();
    await flush();
    await advance(100);
    const graph = await graphReady;
    let plays = 0;
    value.setState({
      ensureAudioSystemReady: async () => ({
        ...graph,
        currentInstrument: null,
        countInBuffer: {},
      }),
      playTab: async () => {
        plays++;
      },
    });
    await value.getState().playTabWithCountIn();
    assert.equal(value.getState().countInTimer.showing, true);
    assert.equal(graph.audioContext.sources.length, 3);
    if (reason === "pause") value.getState().pauseAudio();
    else if (reason === "interruption")
      graph.audioContext.setState("interrupted");
    else value.getState().disposeAudioSystem();
    assert.equal(value.getState().countInTimer.showing, false);
    assert.ok(graph.audioContext.sources.every((source) => source.stopped));
    await advance(3200);
    assert.equal(plays, 0, reason);
  }
});

test("count-in can complete once, but an older start cannot win over a newer start", async () => {
  const value = store();
  const graphReady = value.getState().ensureAudioContextReady();
  await flush();
  await advance(100);
  const graph = await graphReady;
  let plays = 0;
  let resolveOld;
  value.setState({
    ensureAudioSystemReady: () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    playTab: async () => {
      plays++;
    },
  });
  const old = value.getState().playTabWithCountIn();
  value.setState({
    ensureAudioSystemReady: async () => ({
      ...graph,
      currentInstrument: null,
      countInBuffer: {},
    }),
  });
  await value.getState().playTabWithCountIn();
  resolveOld({ ...graph, currentInstrument: null, countInBuffer: {} });
  await old;
  assert.equal(graph.audioContext.sources.length, 3);
  await advance(3100);
  assert.equal(plays, 1);
  assert.equal(value.getState().countInTimer.showing, false);
});

test("cold preparation resumes synchronously and concurrent starts share sample preparation", async () => {
  const value = store();
  const first = value.getState().ensureAudioSystemReady();
  assert.equal(value.getState().audioContext.resumeCalls, 1);
  const second = value.getState().ensureAudioSystemReady();
  assert.equal(first, second);
  await flush();
  await advance(250);
  const graph = await first;
  assert.equal(graph.currentInstrument.context, graph.audioContext);
  assert.equal(value.getState().audioPreparationPending, false);
  graph.masterVolumeGainNode.gain.value = 0.4;
  graph.audioContext.setState("closed");
  const replacement = value.getState().ensureAudioSystemReady();
  assert.notEqual(value.getState().audioContext, graph.audioContext);
  await advance(250);
  assert.equal((await replacement).masterVolumeGainNode.gain.value, 0.4);
});

test("pause during a sample load cancels pending playback and clears the loading state", async () => {
  const value = store();
  let release;
  globalThis.loadTestSoundfont = (context) =>
    new Promise((resolve) => {
      release = () => resolve({ context, stop() {} });
    });
  const playing = value.getState().playTab({});
  await flush();
  await advance(100);
  assert.equal(value.getState().audioPreparationPending, true);
  value.getState().pauseAudio();
  assert.equal(value.getState().audioPreparationPending, false);
  release();
  await advance(100);
  await playing;
  assert.equal(value.getState().audioMetadata.playing, false);
});

test("a stale sample load cannot overwrite or block the replacement graph", async () => {
  const value = store();
  let release;
  const stale = value.getState().ensureAudioSystemReady();
  const old = value.getState().audioContext;
  globalThis.loadTestSoundfont = (context) =>
    context === old
      ? new Promise((resolve) => {
          release = () => resolve({ context, stop() {} });
        })
      : Promise.resolve({ context, stop() {} });
  await flush();
  await advance(100);
  old.setState("closed");
  const replacement = value.getState().ensureAudioSystemReady();
  await advance(250);
  const ready = await replacement;
  assert.notEqual(ready.audioContext, old);
  release();
  await advance(100);
  assert.equal(await stale, null);
  assert.equal(value.getState().currentInstrument.context, ready.audioContext);
});

test("changing instruments during a load starts a new preparation instead of joining the old one", async () => {
  const value = store();
  let release;
  globalThis.loadTestSoundfont = (context, name) =>
    name === "acoustic_guitar_steel"
      ? new Promise((resolve) => {
          release = () => resolve({ context, name, stop() {} });
        })
      : Promise.resolve({ context, name, stop() {} });
  const old = value.getState().ensureAudioSystemReady();
  await flush();
  await advance(100);
  value.getState().setCurrentInstrumentName("electric_guitar_clean");
  const next = value.getState().ensureAudioSystemReady();
  await advance(250);
  assert.equal((await next).currentInstrument.name, "electric_guitar_clean");
  release();
  await advance(100);
  assert.equal(await old, null);
});

test("an interruption during sample loading cannot authorize a delayed preview", async () => {
  const value = store();
  let release;
  globalThis.loadTestSoundfont = (context) =>
    new Promise((resolve) => {
      release = () => resolve({ context, stop() {} });
    });
  const pending = value.getState().ensureAudioSystemReady();
  await flush();
  await advance(100);
  const context = value.getState().audioContext;
  context.resumeImpl = () => Promise.reject(new Error("interrupted"));
  context.setState("interrupted");
  release();
  await advance(100);
  assert.equal(await pending, null);
  assert.equal(value.getState().previewMetadata.playing, false);
});

test("audio device allocation failure can be retried without opening manual sound help", async () => {
  const { useIPhoneSoundDrawerStore: drawer } =
    await import("../src/stores/IPhoneSoundDrawerStore.ts");
  const value = store();
  win.AudioContext = class {
    constructor() {
      throw new Error("device unavailable");
    }
  };
  mock.method(console, "error", () => {});
  assert.equal(await value.getState().ensureAudioSystemReady(), null);
  assert.equal(drawer.getState().open, false);
  win.AudioContext = FakeContext;
  const next = value.getState().ensureAudioSystemReady();
  await flush();
  await advance(250);
  assert.ok(await next);
  drawer.getState().openDrawer(null);
  const again = value.getState().ensureAudioSystemReady();
  await advance(250);
  assert.ok(await again);
  assert.equal(
    drawer.getState().open,
    true,
    "manual help does not gate recovery or get auto-dismissed",
  );
  drawer.getState().closeDrawer();
});

test("replacement releases the failed graph before allocating within a mobile context limit", async () => {
  win.AudioContext = class extends FakeContext {
    constructor() {
      if (FakeContext.instances.some((context) => context.state !== "closed"))
        throw new Error("live context limit");
      super();
    }
  };
  FakeContext.freezeNext = true;
  const { owner, changes } = controller();
  const initial = owner.ensureRunning();
  await flush();
  await advance(650);
  assert.equal(await initial, null);
  doc.emit("click", { isTrusted: true });
  const next = owner.ensureRunning();
  await advance(100);
  assert.equal(await next, changes[1]);
  assert.equal(changes[0].closeCalls, 1);
});

test("a mic/output interruption during the first clock check gets one bounded retry of the same graph", async () => {
  const { owner, changes, events } = controller();
  const pending = owner.ensureRunning();
  await flush();
  changes[0].setState("suspended");
  await advance(200);
  assert.equal(await pending, changes[0]);
  assert.equal(changes.length, 1);
  assert.equal(events.includes("resume-failed"), false);
});

test("count-in uses synthesized clicks without waiting for its optional audio download", async () => {
  const value = store();
  const graphReady = value.getState().ensureAudioContextReady();
  await flush();
  await advance(100);
  const graph = await graphReady;
  mock.method(globalThis, "fetch", () => {
    throw new Error("count-in should not wait for fetch");
  });
  let plays = 0;
  value.setState({
    ensureAudioSystemReady: async () => ({
      ...graph,
      currentInstrument: null,
      countInBuffer: null,
    }),
    playTab: async () => {
      plays++;
    },
  });
  await value.getState().playTabWithCountIn();
  assert.equal(graph.audioContext.sources.length, 3);
  await advance(3100);
  assert.equal(plays, 1);
});
