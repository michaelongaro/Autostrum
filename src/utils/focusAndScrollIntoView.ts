function focusAndScrollIntoView(
  currentElement: HTMLElement | null,
  targetElement: HTMLElement | null,
  noScroll?: boolean,
) {
  if (!currentElement || !targetElement) return;

  const scrollContainer = targetElement.closest<HTMLElement>(
    "[data-feature-editor-scroll]",
  );
  targetElement.focus({ preventScroll: Boolean(scrollContainer) });

  if (noScroll) return;

  if (scrollContainer) {
    const rect = targetElement.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    if (
      rect.top < containerRect.top + 16 ||
      rect.bottom > containerRect.bottom - 16
    ) {
      scrollContainer.scrollTo({
        top:
          scrollContainer.scrollTop +
          rect.top -
          containerRect.top -
          (scrollContainer.clientHeight - rect.height) / 2,
        behavior: "instant",
      });
    }
    return;
  }

  let scrollToElement = false;

  const currentElementOffsetTop = getOffsetTop(currentElement);
  const targetElementOffsetTop = getOffsetTop(targetElement);

  // only want to scroll when needing to switch between tab sub section rows
  if (Math.abs(targetElementOffsetTop - currentElementOffsetTop) >= 100) {
    scrollToElement = true;
  }

  if (scrollToElement) {
    targetElement.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center",
    });
  }
}

export default focusAndScrollIntoView;

function getOffsetTop(element: HTMLElement | null) {
  if (!element) return 0;

  let offsetTop = 0;
  while (element) {
    offsetTop += element.offsetTop;
    element = element.offsetParent as HTMLElement;
  }
  return offsetTop;
}
