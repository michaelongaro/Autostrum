// Browser regressions for the production editor optimizations. Requires the
// fixture suite from editorPerformanceSuite.mjs in a signed-out /create page.
export async function verifyEditorPerformance() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function until(predicate) {
    const deadline = performance.now() + 3000;
    while (!predicate() && performance.now() < deadline) await wait(50);
  }
  const getStore = window.__AUTOSTRUM_GET_TAB_STORE__;
  const passed = [];
  function check(condition, label) {
    if (!condition) throw new Error(label);
    passed.push(label);
  }
  const press = (element, key, modifiers = {}) => {
    element.focus();
    return element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      }),
    );
  };
  const firstNote = () => document.getElementById("input-0-0-0-1");
  await window.editorPerformance.seed("short");
  const input = firstNote();
  input.scrollIntoView({ block: "center" });
  await wait(200);
  input.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
    input,
    "7",
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(100);
  check(
    getStore().tabData[0].data[0].data[0].firstString === "7",
    "Editing commits through the real input handler",
  );
  press(input, "z", { ctrlKey: true });
  await wait(100);
  check(
    getStore().tabData[0].data[0].data[0].firstString === "0",
    "Keyboard undo preserves notes",
  );
  press(input, "z", { ctrlKey: true, shiftKey: true });
  await wait(100);
  check(
    getStore().tabData[0].data[0].data[0].firstString === "7",
    "Keyboard redo preserves notes",
  );

  input.focus();
  window.scrollTo(0, document.documentElement.scrollHeight);
  await wait(350);
  check(
    input.isConnected && document.activeElement === input,
    "Focused virtual row survives scrolling out of view",
  );
  input.scrollIntoView({ block: "center" });
  await wait(250);

  const staff = input.closest("[data-editing-tab-staff]");
  check(
    staff.dataset.editingTabVirtualized === "true",
    "Short multirow blocks use row virtualization",
  );
  press(input, "r", { altKey: true });
  await wait(400);
  check(
    staff.dataset.editingTabVirtualized === "false",
    "Reordering uses the complete staff",
  );
  press(firstNote(), "r", { altKey: true });
  await wait(400);
  check(
    staff.dataset.editingTabVirtualized === "true",
    "Leaving reorder restores virtualization",
  );
  firstNote().focus();
  press(firstNote(), "d", { altKey: true });
  await wait(400);
  check(
    staff.dataset.editingTabVirtualized === "false",
    "Delete mode uses the complete staff",
  );
  press(firstNote(), "d", { altKey: true });
  await wait(400);

  const body = document.getElementById("sectionIndex0");
  const pm = [...body.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === "PM Editor",
  );
  pm.click();
  await wait(400);
  window.scrollTo(0, document.documentElement.scrollHeight);
  await wait(200);
  pm.scrollIntoView({ block: "center" });
  await wait(200);
  check(
    pm.isConnected && pm.disabled,
    "Offscreen containment preserves palm-mute editing state",
  );
  firstNote().focus();
  press(firstNote(), "p", { altKey: true });
  await wait(350);

  const sections = [...document.querySelectorAll("[data-editor-section-body]")];
  const beforeHeight = document.documentElement.scrollHeight;
  const savedStyles = sections.map((element) => element.getAttribute("style"));
  sections.forEach((element) => {
    element.style.contentVisibility = "visible";
    element.style.containIntrinsicSize = "none";
  });
  await wait(250);
  check(
    Math.abs(document.documentElement.scrollHeight - beforeHeight) <= 2,
    "Containment preserves full document height",
  );
  sections.forEach((element, index) =>
    element.setAttribute("style", savedStyles[index] ?? ""),
  );

  const sectionToggle = document.querySelector(
    '[aria-label="Toggle Benchmark 1 section"]',
  );
  sectionToggle.click();
  await until(() => !document.getElementById("sectionIndex0"));
  check(
    !document.getElementById("sectionIndex0"),
    "Closing a section releases its body",
  );
  sectionToggle.click();
  await until(
    () => Math.abs(document.documentElement.scrollHeight - beforeHeight) <= 2,
  );
  check(
    Math.abs(document.documentElement.scrollHeight - beforeHeight) <= 2,
    "Reopening a section restores its measured height",
  );

  // Undo/redo can affect sections other than the one currently on screen.
  const heightBeforeEdit = document.documentElement.scrollHeight;
  const lastIndex = getStore().tabData.length - 1;
  getStore().breakEditorHistoryGroup();
  getStore().setTabData((draft) => {
    const notes = draft[lastIndex].data[0].data;
    const note = { ...notes[0] };
    notes.push(
      ...Array.from({ length: 32 }, () => ({
        ...note,
        id: crypto.randomUUID(),
      })),
    );
  });
  await wait(850);
  check(
    document.documentElement.scrollHeight > heightBeforeEdit + 200,
    "Offscreen edits invalidate remembered section heights",
  );
  getStore().undo();
  await wait(850);
  check(
    Math.abs(document.documentElement.scrollHeight - heightBeforeEdit) <= 2,
    "Undo restores offscreen section geometry",
  );

  // Exercise the existing metadata keyboard drag behavior, including committing
  // the new order to the store, with containment active below the metadata.
  const chordsButton = [...document.querySelectorAll("h2 button")].find(
    (button) => button.textContent.trim() === "Chords",
  );
  chordsButton.click();
  await wait(350);
  const region = document.getElementById(
    chordsButton.getAttribute("aria-controls"),
  );
  const reorder = [...region.querySelectorAll("button")].find(
    (button) => button.textContent === "Reorder",
  );
  const original = getStore().chords.map((chord) => chord.id);
  reorder.click();
  await wait(350);
  const handle = region.querySelector('[aria-label="Reorder C chord"]');
  check(!!handle, "Metadata reorder mounts accessible drag handles");
  handle.focus();
  press(handle, " ", { code: "Space" });
  await wait(100);
  press(handle, "ArrowRight", { code: "ArrowRight" });
  await wait(300);
  press(handle, " ", { code: "Space" });
  await wait(400);
  check(
    getStore().chords[0].id !== original[0],
    "Keyboard metadata drag changes chord order",
  );
  [...region.querySelectorAll("button")]
    .find((button) => button.textContent === "Done")
    .click();
  await wait(200);
  check(
    !region.querySelector('[aria-label^="Reorder "]'),
    "Leaving metadata reorder removes drag handles",
  );
  chordsButton.click();
  await wait(350);

  // Reveal a row that starts unmounted and navigate across its right boundary.
  await window.editorPerformance.seed("long");
  const columnIndex = 900;
  window.dispatchEvent(
    new CustomEvent("editing-tab-reveal-column", {
      detail: {
        sectionIndex: 0,
        subSectionIndex: 0,
        columnIndex,
        noteIndex: 1,
      },
    }),
  );
  await wait(450);
  const revealed = document.getElementById(`input-0-0-${columnIndex}-1`);
  check(
    !!revealed && document.activeElement === revealed,
    "Reveal mounts and focuses an offscreen row",
  );
  press(revealed, "ArrowRight");
  await wait(250);
  check(
    document.activeElement?.id === `input-0-0-${columnIndex + 1}-1`,
    "Arrow navigation crosses virtual rows",
  );
  return { passed };
}
