// Keep the document scrollable for mobile browser chrome. Only cancel gestures
// that would scroll the background; never change body/html styles or scrollY.
export function registerModalTouchGuard(popup: HTMLElement) {
  const doc = popup.ownerDocument;
  let guard = guards.get(doc);
  if (!guard) {
    guard = createGuard(doc);
    guards.set(doc, guard);
  }
  const entry = {
    popup,
    portal: popup.closest<HTMLElement>("[data-base-ui-portal]") ?? popup,
  };
  guard.entries.add(entry);

  return () => {
    guard.entries.delete(entry);
    if (guard.entries.size === 0) {
      guard.dispose();
      guards.delete(doc);
    }
  };
}

type Entry = { popup: HTMLElement; portal: HTMLElement };
const guards = new WeakMap<Document, ReturnType<typeof createGuard>>();

function scrollBoundary(entry: Entry, element: Element) {
  if (entry.popup.contains(element)) return entry.portal;
  if (
    entry.portal !== entry.popup &&
    entry.portal.contains(element) &&
    element.closest("[data-base-ui-portal]") !== entry.portal
  ) {
    return entry.portal;
  }

  // Custom modals (PlaybackModal) don't own a Base UI portal. Their selects
  // and popovers are siblings under body, linked to their triggers by ARIA.
  const controlledIds = new Set(
    Array.from(entry.popup.querySelectorAll("[aria-controls]")).flatMap(
      (trigger) => trigger.getAttribute("aria-controls")!.split(/\s+/),
    ),
  );
  for (const id of controlledIds) {
    const controlled = entry.popup.ownerDocument.getElementById(id);
    if (!controlled) continue;
    const portal = controlled.closest("[data-base-ui-portal]");
    // The owned portal also contains popups opened by controls within it.
    if (portal?.contains(element)) return portal;
    if (controlled.contains(element)) return controlled;
  }
  return null;
}

function createGuard(doc: Document) {
  const entries = new Set<Entry>();
  let previousTouch: { x: number; y: number; id: number } | undefined;

  function topEntry() {
    let top: Entry | undefined;
    for (const entry of entries) {
      if (!entry.popup.isConnected || entry.popup.hidden) continue;
      // Nested popups win regardless of React's ref/effect attachment order,
      // including portals opened by a custom modal's ARIA-linked triggers.
      if (!top || !scrollBoundary(entry, top.popup)) top = entry;
    }
    return top;
  }

  function canScroll(
    target: EventTarget | null,
    deltaX: number,
    deltaY: number,
  ) {
    const entry = topEntry();
    if (!entry) return true;
    const element = target instanceof Element ? target : null;
    if (!element) return false;

    const boundary = scrollBoundary(entry, element);
    if (!boundary) return false;

    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const delta = horizontal ? deltaX : deltaY;
    if (delta === 0) return true;
    if (horizontal && element.closest('input[type="range"]')) return true;

    // Walk *all* inner scrollers so an exhausted nested scroller can hand off
    // to its parent, but cannot chain into the underlying document.
    for (
      let node: Element | null = element;
      node && node !== doc.body && node !== doc.documentElement;
      node = node.parentElement
    ) {
      const style = doc.defaultView!.getComputedStyle(node);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      if (/^(auto|scroll|overlay)$/.test(overflow)) {
        const max = horizontal
          ? node.scrollWidth - node.clientWidth
          : node.scrollHeight - node.clientHeight;
        const position = horizontal ? node.scrollLeft : node.scrollTop;
        const rtl = horizontal && style.direction === "rtl";
        const min = rtl ? -max : 0;
        const end = rtl ? 0 : max;
        if (max > 0 && (delta < 0 ? position > min + 1 : position < end - 1)) {
          return true;
        }
        const overscroll = horizontal
          ? style.overscrollBehaviorX
          : style.overscrollBehaviorY;
        if (overscroll === "contain" || overscroll === "none") return false;
      }
      if (node === boundary) break;
    }
    return false;
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    previousTouch = touch
      ? { x: touch.clientX, y: touch.clientY, id: touch.identifier }
      : undefined;
  }

  function onTouchMove(event: TouchEvent) {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    // Preserve pinch zoom. Reset so the remaining finger starts a new gesture.
    if (!touch) {
      previousTouch = undefined;
      return;
    }
    const previous = previousTouch;
    previousTouch = {
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier,
    };
    if (!topEntry() || !event.cancelable) return;
    if (
      previous?.id !== touch.identifier ||
      !canScroll(
        event.target,
        previous.x - touch.clientX,
        previous.y - touch.clientY,
      )
    ) {
      event.preventDefault();
    }
    // Do not stop propagation: drawer swipe handlers and sliders still need it.
  }

  function onWheel(event: WheelEvent) {
    if (
      event.cancelable &&
      !event.ctrlKey &&
      !canScroll(event.target, event.deltaX, event.deltaY)
    ) {
      event.preventDefault();
    }
  }

  doc.addEventListener("touchstart", onTouchStart, {
    passive: true,
    capture: true,
  });
  doc.addEventListener("touchmove", onTouchMove, {
    passive: false,
    capture: true,
  });
  doc.addEventListener("touchend", onTouchStart, {
    passive: true,
    capture: true,
  });
  doc.addEventListener("touchcancel", onTouchStart, {
    passive: true,
    capture: true,
  });
  doc.addEventListener("wheel", onWheel, { passive: false, capture: true });

  return {
    entries,
    dispose() {
      doc.removeEventListener("touchstart", onTouchStart, true);
      doc.removeEventListener("touchmove", onTouchMove, true);
      doc.removeEventListener("touchend", onTouchStart, true);
      doc.removeEventListener("touchcancel", onTouchStart, true);
      doc.removeEventListener("wheel", onWheel, true);
    },
  };
}
