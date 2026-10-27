// Paste into DevTools on /dev-virtualization-harness?fixture=huge after opening
// Practice, or evaluate this file with browser automation. Development only.
// Fixtures change the in-memory store. This script does not save tab data.
// Pointer events are synthetic; callback cadence is not compositor/GPU FPS.
// Kept as a standalone .mjs probe like the other browser verification scripts.
(() => {
  if (
    !location.pathname.startsWith("/dev-virtualization-harness") ||
    !document.querySelector("[data-playback-strip]")
  ) {
    throw new Error(
      "Open Practice on /dev-virtualization-harness?fixture=huge before installing this probe.",
    );
  }
  const store = () => window.__AUTOSTRUM_GET_TAB_STORE__();
  const viewport = () => document.querySelector("[data-playback-strip]");
  const strip = () =>
    [...viewport().firstElementChild.children].find((el) => el.style.width);
  const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(resolve));
  const position = () =>
    -new DOMMatrixReadOnly(getComputedStyle(strip()).transform).m41;
  const pointer = (type, x) => {
    const el = viewport();
    const y = el.getBoundingClientRect().top + 130;
    const before = performance.now();
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 73,
        pointerType: "mouse",
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
      }),
    );
    return performance.now() - before;
  };
  const percentile = (values, fraction) => {
    const sorted = [...values].sort((a, b) => a - b);
    return (
      sorted[
        Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
      ] ?? 0
    );
  };
  const info = () => {
    const s = store();
    return {
      index: s.currentChordIndex,
      position: position(),
      expanded: s.expandedTabData?.length,
      playing: s.audioMetadata.playing,
      playbackSpeed: s.playbackSpeed,
      viewportWidth: s.visiblePlaybackContainerWidth,
      mounted: strip().children.length - 1,
      stripNodes: strip().querySelectorAll("*").length,
      totalWidth: parseFloat(strip().style.width),
    };
  };
  const frame = (time, start) => {
    const s = store();
    const el = strip();
    const pos = position();
    const children = [...el.children].slice(1);
    const intervals = children
      .map((child) => ({
        left: parseFloat(child.style.left) - pos,
        right:
          parseFloat(child.style.left) + parseFloat(child.style.width) - pos,
      }))
      .sort((a, b) => a.left - b.left);
    const placeholder = parseFloat(el.firstElementChild.style.width);
    // The leading half-viewport before the very first chord is intentional.
    // Later loop cycles should cover the entire viewport.
    const from = Math.max(0, placeholder - pos);
    const to = s.visiblePlaybackContainerWidth;
    let cursor = from;
    let gap = 0;
    for (const interval of intervals) {
      if (interval.right < from || interval.left > to) continue;
      gap = Math.max(gap, Math.min(to, interval.left) - cursor);
      cursor = Math.max(cursor, interval.right);
    }
    gap = Math.max(gap, to - cursor, 0);
    return {
      t: time - start,
      index: s.currentChordIndex,
      p: pos,
      mounted: children.length,
      gap,
    };
  };
  const runs = window.__playbackAudit?.runs ?? [];
  async function measure(label, durationMs, gesture) {
    const initial = info();
    const frames = [];
    const longTasks = [];
    const inputCosts = [];
    const observer = new PerformanceObserver((list) =>
      longTasks.push(
        ...list
          .getEntries()
          .map((e) => ({ t: e.startTime, duration: e.duration })),
      ),
    );
    if (PerformanceObserver.supportedEntryTypes.includes("longtask"))
      observer.observe({ entryTypes: ["longtask"] });
    const start = performance.now();
    let down = false;
    let released = false;
    const originX =
      viewport().getBoundingClientRect().left + viewport().clientWidth / 2;
    let lastX = originX;
    const segments = gesture?.segments ?? [];
    const dragDuration = segments.reduce(
      (sum, segment) => sum + segment.durationMs,
      0,
    );
    if (gesture) {
      inputCosts.push(pointer("pointerdown", lastX));
      down = true;
    }
    await new Promise((resolve) => {
      const tick = (time) => {
        const elapsed = time - start;
        if (gesture && !released) {
          let remainder = elapsed;
          let delta = 0;
          for (const segment of segments) {
            delta +=
              segment.deltaPx *
              Math.max(0, Math.min(1, remainder / segment.durationMs));
            remainder -= segment.durationMs;
          }
          const x = originX + delta;
          if (x !== lastX) {
            inputCosts.push(pointer("pointermove", x));
            lastX = x;
          }
          if (elapsed >= dragDuration + (gesture.holdMs ?? 0)) {
            inputCosts.push(pointer("pointerup", lastX));
            released = true;
          }
        }
        frames.push(frame(time, start));
        if (elapsed >= durationMs) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (down && !released) pointer("pointerup", lastX);
    await nextFrame();
    observer.disconnect();
    const intervals = frames.slice(1).map((f, i) => f.t - frames[i].t);
    const activeFrames = gesture
      ? frames.filter((f) => f.t <= dragDuration)
      : frames;
    const activeIntervals = activeFrames
      .slice(1)
      .map((f, i) => f.t - activeFrames[i].t);
    const run = {
      label,
      initial,
      final: info(),
      durationMs: frames.at(-1).t,
      frames,
      longTasks,
      inputCosts,
      gesture,
    };
    runs.push(run);
    return {
      label,
      initial: run.initial,
      final: run.final,
      rafHz: ((frames.length - 1) * 1000) / (frames.at(-1).t - frames[0].t),
      activeRafHz:
        ((activeFrames.length - 1) * 1000) /
        (activeFrames.at(-1).t - activeFrames[0].t),
      activeP95Ms: percentile(activeIntervals, 0.95),
      activeP99Ms: percentile(activeIntervals, 0.99),
      maxFrameMs: Math.max(...intervals),
      framesOver25Ms: intervals.filter((t) => t > 25).length,
      framesOver50Ms: intervals.filter((t) => t > 50).length,
      longTasks: longTasks.length,
      maxLongTaskMs: Math.max(0, ...longTasks.map((t) => t.duration)),
      maxGapPx: Math.max(...frames.map((f) => f.gap)),
      framesWithGap: frames.filter((f) => f.gap > 2).length,
      mountedMin: Math.min(...frames.map((f) => f.mounted)),
      mountedMax: Math.max(...frames.map((f) => f.mounted)),
      maxInputMs: Math.max(0, ...inputCosts),
    };
  }
  async function prepare({
    notes = 800,
    barEvery = 8,
    noteLength = "quarter",
    bpm = 120,
    playbackSpeed = 1,
  } = {}) {
    store().pauseAudio();
    store().setCurrentChordIndex(0);
    store().setPlaybackSpeed(playbackSpeed);
    const source = store().tabData[0].data.find(
      (section) => section.type === "tab",
    );
    const sample = source.data.find((column) => column.type === "note");
    const columns = [];
    for (let index = 0; index < notes; index++) {
      columns.push({ ...sample, id: `audit-note-${index}`, noteLength });
      if (barEvery && (index + 1) % barEvery === 0 && index < notes - 1)
        columns.push({
          id: `audit-measure-${index}`,
          type: "measureLine",
          isInPalmMuteSection: false,
          bpmAfterLine: null,
        });
    }
    store().setTabData((draft) => {
      draft[0].data.splice(0, draft[0].data.length, {
        ...source,
        bpm,
        data: columns,
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return info();
  }
  async function play() {
    store().setCountInTimerEnabled(false);
    void store().playTab({});
    const start = performance.now();
    while (!store().audioMetadata.playing && performance.now() - start < 10000)
      await nextFrame();
    if (!store().audioMetadata.playing)
      throw new Error("Audio did not start within 10 seconds.");
    await new Promise((resolve) => setTimeout(resolve, 500));
    return info();
  }
  window.__playbackAudit = {
    store,
    strip,
    viewport,
    position,
    info,
    frame,
    measure,
    prepare,
    play,
    runs,
    nextFrame,
    pointer,
  };
  return {
    ready: true,
    info: info(),
    environment: {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio,
      viewport: [innerWidth, innerHeight],
      visibility: document.visibilityState,
    },
  };
})();
