import { useLayoutEffect, useRef, useState } from "react";

export type MetadataPane =
  "Section progression" | "Chords" | "Strumming patterns";

type PaneSize = { height: number; collapsedHeight: number };

const DEFAULT_PANE_HEIGHT = 96;
const COLLAPSED_SECTION_COUNT = 3;
const NEXT_ROW_PREVIEW_HEIGHT = 24;

export default function useExtraTabMetadataLayout(
  activePane: MetadataPane,
  expanded: boolean,
  progressionCount: number,
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<Partial<Record<MetadataPane, PaneSize>>>(
    {},
  );

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    // Measure natural content, never the animated/clipped viewport. All panes
    // stay mounted so a switch already knows its destination height.
    const panes = Array.from(
      content.querySelectorAll<HTMLDivElement>("[data-metadata-pane]"),
    );
    function measure() {
      const next: Partial<Record<MetadataPane, PaneSize>> = {};
      for (const pane of panes) {
        const name = pane.dataset.metadataPane as MetadataPane;
        const rect = pane.getBoundingClientRect();
        const items = pane.querySelector("[data-metadata-items]")?.children;
        const firstTop = items?.[0]?.getBoundingClientRect().top;
        let collapsedHeight = rect.height;
        if (name === "Section progression") {
          const lastVisibleItem =
            items && items.length > COLLAPSED_SECTION_COUNT
              ? items.item(COLLAPSED_SECTION_COUNT - 1)
              : null;
          if (lastVisibleItem) {
            const paddingBottom = parseFloat(
              getComputedStyle(pane).paddingBottom,
            );
            collapsedHeight =
              lastVisibleItem.getBoundingClientRect().bottom -
              rect.top +
              paddingBottom;
          }
        } else if (items && firstTop !== undefined) {
          for (const item of items) {
            const itemRect = item.getBoundingClientRect();
            if (itemRect.top - firstTop > 1) {
              // Include the row gap and a glimpse of the next row under the fade.
              collapsedHeight = Math.min(
                rect.height,
                itemRect.top - rect.top + NEXT_ROW_PREVIEW_HEIGHT,
              );
              break;
            }
          }
        }
        next[name] = {
          height: Math.ceil(rect.height),
          collapsedHeight: Math.ceil(collapsedHeight),
        };
      }
      setSizes((previous) =>
        panes.every((pane) => {
          const name = pane.dataset.metadataPane as MetadataPane;
          return (
            previous[name]?.height === next[name]?.height &&
            previous[name]?.collapsedHeight === next[name]?.collapsedHeight
          );
        })
          ? previous
          : next,
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    panes.forEach((pane) => observer.observe(pane));
    return () => observer.disconnect();
  }, []);

  // Progression rows are 24px tall with 8px gaps and 16px of pane padding.
  // Match the collapsed viewport before the first DOM measurement.
  const progressionHeight = (count: number) =>
    Math.max(DEFAULT_PANE_HEIGHT, count * 24 + Math.max(0, count - 1) * 8 + 16);
  const isProgression = activePane === "Section progression";
  const collapsedHeight =
    sizes[activePane]?.collapsedHeight ??
    (isProgression
      ? progressionHeight(Math.min(progressionCount, COLLAPSED_SECTION_COUNT))
      : DEFAULT_PANE_HEIGHT);
  const naturalHeight =
    sizes[activePane]?.height ??
    (isProgression ? progressionHeight(progressionCount) : collapsedHeight);
  const hasOverflow = naturalHeight > collapsedHeight + 1;
  const hasAnyOverflow = Object.values(sizes).some(
    (size) => size.height > size.collapsedHeight + 1,
  );

  useLayoutEffect(() => {
    // Clipping alone still allows tabbing to hidden preview buttons, which can
    // scroll an overflow-hidden viewport away from the top of its pane.
    contentRef.current
      ?.querySelectorAll<HTMLElement>("[data-metadata-pane]")
      .forEach((pane) => {
        const size = sizes[pane.dataset.metadataPane as MetadataPane];
        if (!size) return;
        pane.style.clipPath = expanded
          ? "inset(0px)"
          : `inset(0px 0px max(0px, calc(100% - ${size.collapsedHeight}px)) 0px)`;
        const items = pane.querySelector<HTMLElement>("[data-metadata-items]");
        if (!items) return;
        const top = pane.getBoundingClientRect().top;
        for (const item of Array.from(items.children)) {
          if (item instanceof HTMLElement) {
            item.inert =
              !expanded &&
              item.getBoundingClientRect().bottom - top >
                size.collapsedHeight + 1;
          }
        }
      });
  }, [expanded, sizes]);

  return {
    contentRef,
    hasOverflow,
    hasAnyOverflow,
    height: expanded
      ? Math.max(collapsedHeight, naturalHeight)
      : collapsedHeight,
  };
}
