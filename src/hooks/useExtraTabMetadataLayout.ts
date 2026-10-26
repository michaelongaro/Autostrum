import { useLayoutEffect, useRef, useState } from "react";

export type MetadataPane =
  "Section progression" | "Chords" | "Strumming patterns";

type PaneSize = { height: number; collapsedHeight: number };

const SECTION_PROGRESSION_HEIGHT = 96;
const NEXT_ROW_PREVIEW_HEIGHT = 24;

export default function useExtraTabMetadataLayout(
  activePane: MetadataPane,
  expanded: boolean,
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
        const rect = pane.getBoundingClientRect();
        const items = pane.querySelector("[data-metadata-items]")?.children;
        const firstTop = items?.[0]?.getBoundingClientRect().top;
        let collapsedHeight = SECTION_PROGRESSION_HEIGHT;
        if (items && firstTop !== undefined) {
          // A single row keeps its natural height, including pane padding.
          collapsedHeight = rect.height;
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
        next[pane.dataset.metadataPane as MetadataPane] = {
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

  const collapsedHeight =
    sizes[activePane]?.collapsedHeight ?? SECTION_PROGRESSION_HEIGHT;
  const naturalHeight = sizes[activePane]?.height ?? collapsedHeight;
  const hasOverflow = naturalHeight > collapsedHeight + 1;

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
    height: expanded
      ? Math.max(collapsedHeight, naturalHeight)
      : collapsedHeight,
  };
}
