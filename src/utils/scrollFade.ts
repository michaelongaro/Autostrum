import type { EventListeners, OverlayScrollbars } from "overlayscrollbars";

function updateVerticalScrollFade(viewport: HTMLElement) {
  const { clientHeight, scrollHeight, scrollTop } = viewport;
  const overflow = scrollHeight - clientHeight;
  const canScroll = clientHeight > 0 && overflow > 0;
  const top = String(canScroll && scrollTop > 0.5);
  const bottom = String(canScroll && overflow - scrollTop > 0.5);

  if (viewport.dataset.scrollFadeTop !== top)
    viewport.dataset.scrollFadeTop = top;
  if (viewport.dataset.scrollFadeBottom !== bottom) {
    viewport.dataset.scrollFadeBottom = bottom;
  }
}

// Use on a native scroller with a stable inner content element.
export function observeVerticalScrollFade(viewport: HTMLElement | null) {
  if (!viewport) return;

  const update = () => updateVerticalScrollFade(viewport);
  const observer = new ResizeObserver(update);
  observer.observe(viewport);
  if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
  viewport.addEventListener("scroll", update, { passive: true });
  update();

  return () => {
    observer.disconnect();
    viewport.removeEventListener("scroll", update);
  };
}

function updateOverlayScrollFade(instance: OverlayScrollbars) {
  updateVerticalScrollFade(instance.elements().viewport);
}

export const overlayScrollFadeEvents = {
  initialized: updateOverlayScrollFade,
  updated: updateOverlayScrollFade,
  scroll: updateOverlayScrollFade,
} satisfies EventListeners;
