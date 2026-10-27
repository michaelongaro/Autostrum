import {
  getPrintPageSize,
  type PrintOptions,
  type PrintTabData,
} from "~/utils/printTab";

/** Paginate clones; React retains ownership of the unpaginated source. */
export function paginatePrintDocument(
  source: HTMLElement,
  pages: HTMLElement,
  data: PrintTabData,
  options: PrintOptions,
) {
  const doc = source.ownerDocument;
  const { contentHeight } = getPrintPageSize(options);
  const blocks = Array.from(source.children) as HTMLElement[];
  const heights = blocks.map((block) => block.getBoundingClientRect().height);
  const fragment = doc.createDocumentFragment();
  const footers: HTMLElement[] = [];
  let content: HTMLDivElement;
  let runningSection: HTMLSpanElement;
  let used = 0;
  let blockCount = 0;

  function newPage(sectionTitle = "") {
    const page = doc.createElement("article");
    page.className = "print-page";
    page.setAttribute("aria-label", `Page ${footers.length + 1}`);
    const header = doc.createElement("header");
    header.className = "print-running-header";
    const title = doc.createElement("span");
    title.textContent = data.title || "Untitled tab";
    runningSection = doc.createElement("span");
    runningSection.textContent = sectionTitle;
    header.append(title, runningSection);
    content = doc.createElement("div");
    content.className = "print-page-content";
    const footer = doc.createElement("footer");
    footer.className = "print-page-footer";
    const attribution = doc.createElement("span");
    attribution.textContent =
      "Autostrum · Find your next favorite song to play.";
    const number = doc.createElement("span");
    number.style.flexShrink = "0";
    footers.push(number);
    footer.append(attribution, number);
    page.append(header, content, footer);
    fragment.append(page);
    used = 0;
    blockCount = 0;
  }

  newPage();
  blocks.forEach((block, index) => {
    let groupHeight = heights[index] ?? 0;
    // Keep section titles, tempo labels and the following music row together.
    for (let next = index; blocks[next]?.dataset.keepNext; next++) {
      groupHeight += heights[next + 1] ?? 0;
    }
    const required = Math.min(groupHeight, contentHeight);
    if (
      blockCount > 0 &&
      (block.dataset.newPage || used + required > contentHeight - 1)
    ) {
      newPage(block.dataset.sectionTitle);
    }
    content.append(block.cloneNode(true));
    used += heights[index] ?? 0;
    blockCount++;
  });
  footers.forEach((footer, index) => {
    footer.textContent = `${index + 1} / ${footers.length}`;
  });
  pages.replaceChildren(fragment);
  return footers.length;
}
