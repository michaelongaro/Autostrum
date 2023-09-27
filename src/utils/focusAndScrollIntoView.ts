function focusAndScrollIntoView(element: HTMLElement | null) {
  if (!element) return;

  element.focus();
  element.scrollIntoView({
    behavior: "instant",
    block: "center",
    inline: "center",
  });
}

export default focusAndScrollIntoView;
