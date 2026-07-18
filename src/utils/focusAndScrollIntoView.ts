function focusAndScrollIntoView(
  currentElement: HTMLElement | null,
  targetElement: HTMLElement | null,
  noScroll?: boolean,
) {
  if (!currentElement || !targetElement) return;

  targetElement.focus();

  if (noScroll) return;

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
