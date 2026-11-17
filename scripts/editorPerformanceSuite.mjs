// Self-contained browser suite, also usable through preview_evaluate:
//   `(${installEditorPerformanceSuite.toString()})()`
// All fixtures live in a signed-out /create session; nothing is published.
export function installEditorPerformanceSuite() {
  if (window.Clerk?.user) throw new Error("Use a signed-out browser context");
  const getStore = window.__AUTOSTRUM_GET_TAB_STORE__;
  if (!getStore || !getStore().editing) throw new Error("Open /create first");
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const fixtures = {
    small: { sections: 1, blocks: 1, columns: 16 },
    short: { sections: 20, blocks: 2, columns: 32 },
    chords: { sections: 10, blocks: 1, sequences: 8 },
    mixed: { sections: 12, blocks: 2, columns: 32, sequences: 4 },
    long: { sections: 1, blocks: 1, columns: 1280 },
    metadata: { sections: 1, blocks: 1, columns: 16, patterns: 24, chords: 64 },
  };
  const names = ["C", "G", "Am", "F", "Em", "D", "Dm", "E"];
  const buttons = () =>
    [...document.querySelectorAll("h2 button")].filter((el) =>
      ["Section progression", "Chords", "Strumming patterns"].includes(
        el.textContent.trim(),
      ),
    );
  const bodies = () =>
    [...document.querySelectorAll('[id^="sectionIndex"]')].filter((el) =>
      /^sectionIndex\d+$/.test(el.id),
    );
  const snapshot = () => ({
    nodes: document.querySelectorAll("*").length,
    inputs: document.querySelectorAll("input").length,
    virtualizedStaffs: document.querySelectorAll(
      '[data-editing-tab-virtualized="true"]',
    ).length,
    height: document.documentElement.scrollHeight,
  });
  const results = [];
  let fixtureName;
  let cleanup = () => {};

  async function seed(name) {
    cleanup();
    for (const button of buttons()) {
      if (button.getAttribute("aria-expanded") === "true") button.click();
    }
    await wait(400);
    const config = fixtures[name];
    if (!config) throw new Error(`Unknown fixture: ${name}`);
    const patterns = Array.from({ length: config.patterns ?? 4 }, () => ({
      id: crypto.randomUUID(),
      baseNoteLength: "eighth",
      strums: Array.from({ length: 8 }, (_, index) => ({
        palmMute: "",
        strum: index % 2 ? "^" : "v",
        noteLength: "eighth",
      })),
    }));
    const chords = Array.from({ length: config.chords ?? 8 }, (_, index) => ({
      id: crypto.randomUUID(),
      name: names[index % names.length] + (index >= 8 ? index : ""),
      color: "#dc2626",
      frets: ["0", "3", "2", "0", "1", "0"],
    }));
    const sections = Array.from(
      { length: config.sections },
      (_, sectionIndex) => ({
        id: crypto.randomUUID(),
        title: `Benchmark ${sectionIndex + 1}`,
        data: Array.from({ length: config.blocks }, (_, blockIndex) => {
          const isChord =
            config.sequences && (!config.columns || blockIndex % 2 === 1);
          return isChord
            ? {
                id: crypto.randomUUID(),
                type: "chord",
                bpm: 120,
                repetitions: 1,
                data: Array.from({ length: config.sequences }, () => ({
                  id: crypto.randomUUID(),
                  bpm: -1,
                  repetitions: 1,
                  strummingPattern: patterns[0],
                  data: [...names],
                })),
              }
            : {
                id: crypto.randomUUID(),
                type: "tab",
                bpm: 120,
                baseNoteLength: "quarter",
                repetitions: 1,
                data: Array.from({ length: config.columns }, () => ({
                  type: "note",
                  id: crypto.randomUUID(),
                  palmMute: "",
                  firstString: "0",
                  secondString: "1",
                  thirdString: "0",
                  fourthString: "2",
                  fifthString: "3",
                  sixthString: "",
                  chordEffects: "",
                  noteLength: "quarter",
                })),
              };
        }),
      }),
    );
    const started = performance.now();
    const store = getStore();
    store.setChords(chords);
    store.setStrummingPatterns(patterns);
    store.setTabData((draft) => {
      draft.splice(0, draft.length, ...sections);
    });
    getStore().setSectionProgression(
      sections.map((section) => ({
        id: crypto.randomUUID(),
        sectionId: section.id,
        title: section.title,
        repetitions: 1,
        startSeconds: 0,
        endSeconds: 0,
      })),
    );
    window.scrollTo(0, 0);
    await wait(2500); // Wait out editor compilation debounce and entry animations.
    if (getStore().tabData[0]?.id !== sections[0].id) {
      throw new Error(
        "Fixture was replaced during editor initialization; wait for #mainTabComponent before seeding",
      );
    }
    fixtureName = name;
    return {
      fixture: name,
      settleMs: performance.now() - started,
      ...snapshot(),
    };
  }

  async function variant(name) {
    cleanup();
    const restorations = [];
    const style = document.createElement("style");
    const contain = name.includes("contain");
    if (contain) {
      const elements = name.startsWith("block")
        ? bodies().flatMap((body) => [...body.children])
        : bodies();
      for (const el of elements) {
        const previous = el.getAttribute("style");
        const height = el.offsetHeight;
        el.style.contentVisibility = "auto";
        el.style.containIntrinsicSize = `auto ${height}px`;
        restorations.push(() =>
          previous === null
            ? el.removeAttribute("style")
            : el.setAttribute("style", previous),
        );
      }
    }
    for (const button of buttons())
      button.parentElement.parentElement.setAttribute("data-perf-metadata", "");
    if (name.includes("no-animation")) {
      style.textContent =
        '[data-perf-metadata] > [role="region"] {transition-duration:0s!important}';
    }
    if (name === "uncontained") {
      style.textContent =
        "[data-editor-section-body] {content-visibility:visible!important;contain-intrinsic-size:none!important}";
    }
    document.head.append(style);
    cleanup = () => {
      restorations.forEach((restore) => restore());
      style.remove();
    };
    await wait(400);
  }

  async function measure(label, { cycles = 3, viewport = [1280, 800] } = {}) {
    if (document.visibilityState !== "visible")
      throw new Error("Foreground the benchmark tab to avoid frame throttling");
    const checkViewport = () => {
      if (innerWidth !== viewport[0] || innerHeight !== viewport[1]) {
        throw new Error(
          `Fix the viewport at ${viewport.join(" × ")} before benchmarking`,
        );
      }
    };
    checkViewport();
    const samples = [];
    for (const button of buttons()) {
      button.scrollIntoView({ block: "center", behavior: "instant" });
      await wait(400);
      // Warm the panel once. First-open costs are measured separately below.
      const firstOpen = await toggle(button);
      await toggle(button);
      for (let cycle = 0; cycle < cycles; cycle++) {
        for (let toggleIndex = 0; toggleIndex < 2; toggleIndex++) {
          samples.push({
            panel: button.textContent.trim(),
            cycle,
            ...(await toggle(button)),
          });
          checkViewport();
        }
      }
      samples.push({
        panel: button.textContent.trim(),
        cold: true,
        ...firstOpen,
      });
    }
    const result = {
      fixture: fixtureName,
      label,
      viewport: [innerWidth, innerHeight],
      samples,
      ...snapshot(),
    };
    results.push(result);
    return summarize(result);
  }

  async function toggle(button) {
    const opening = button.getAttribute("aria-expanded") !== "true";
    const frames = [];
    const longTasks = [];
    let observer;
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      observer = new PerformanceObserver((list) =>
        longTasks.push(...list.getEntries().map((entry) => entry.duration)),
      );
      observer.observe({ type: "longtask" });
    }
    let raf;
    let previous;
    function frame() {
      const now = performance.now();
      if (previous !== undefined) frames.push(now - previous);
      previous = now;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const start = performance.now();
    button.click();
    await wait(600);
    // A slow baseline can spend most of the window in layout. Give it time
    // to produce a measurable interval, but reject a genuinely paused clock.
    while (frames.length === 0 && performance.now() - start < 3000) {
      await wait(50);
    }
    cancelAnimationFrame(raf);
    observer?.disconnect();
    if (frames.length === 0) {
      throw new Error(
        "Insufficient animation frames: the browser is throttled or not rendering",
      );
    }
    if (button.getAttribute("aria-expanded") !== String(opening))
      throw new Error("Accordion did not toggle");
    return {
      opening,
      frameIntervals: frames.length,
      elapsedMs: performance.now() - start,
      maxFrameGapMs: frames.length ? Math.max(...frames) : null,
      framesOver50Ms: frames.filter((value) => value > 50).length,
      longTasks,
      ...snapshot(),
    };
  }

  function summarize(result) {
    const median = (values) => {
      const sorted = values.toSorted((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
    };
    return {
      fixture: result.fixture,
      label: result.label,
      nodes: result.nodes,
      panels: [...new Set(result.samples.map((sample) => sample.panel))].map(
        (panel) => {
          const samples = result.samples.filter(
            (sample) => !sample.cold && sample.panel === panel,
          );
          return {
            panel,
            toggles: samples.length,
            medianWorstFrameMs: median(
              samples.map((sample) => sample.maxFrameGapMs),
            ),
            worstFrameMs: Math.max(
              ...samples.map((sample) => sample.maxFrameGapMs),
            ),
            longTaskMs: samples
              .flatMap((sample) => sample.longTasks)
              .reduce((a, b) => a + b, 0),
            framesOver50Ms: samples.reduce(
              (sum, sample) => sum + sample.framesOver50Ms,
              0,
            ),
          };
        },
      ),
    };
  }

  window.editorPerformance = {
    seed,
    variant,
    measure,
    results,
    snapshot,
    summarize,
  };
  return { fixtures: Object.keys(fixtures), ready: true };
}
