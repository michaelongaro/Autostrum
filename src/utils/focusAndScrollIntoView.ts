function focusAndScrollIntoView(
  currentElement: HTMLElement | null,
  targetElement: HTMLElement | null
) {
  if (!currentElement || !targetElement) return;

  targetElement.focus();

  let scrollToElement = false;

  const currentElementOffsetTop = getOffsetTop(currentElement);
  const targetElementOffsetTop = getOffsetTop(targetElement);

  // only relevant for arrow key navigation within tab sections, which
  // have a height while editing of 400px
  if (Math.abs(targetElementOffsetTop - currentElementOffsetTop) >= 400) {
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
