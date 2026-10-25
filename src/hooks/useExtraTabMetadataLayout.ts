import { useLayoutEffect, useRef, useState } from "react";

export type MetadataPane =
  "Section progression" | "Chords" | "Strumming patterns";

type PaneSize = { height: number; firstRowHeight: number };

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
        let firstRowHeight = 0;
        if (items && firstTop !== undefined) {
          for (const item of items) {
            const itemRect = item.getBoundingClientRect();
            if (Math.abs(itemRect.top - firstTop) > 1) break;
            firstRowHeight = Math.max(
              firstRowHeight,
              itemRect.bottom - rect.top,
            );
          }
        }
        next[pane.dataset.metadataPane as MetadataPane] = {
          height: Math.ceil(rect.height),
          firstRowHeight: Math.ceil(firstRowHeight),
        };
      }
      setSizes((previous) =>
        panes.every((pane) => {
          const name = pane.dataset.metadataPane as MetadataPane;
          return (
            previous[name]?.height === next[name]?.height &&
            previous[name]?.firstRowHeight === next[name]?.firstRowHeight
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

  // Grow a common card height for taller diagrams and palm-mute markings.
  const cardHeight = Math.max(
    176,
    sizes.Chords?.firstRowHeight ?? 0,
    sizes["Strumming patterns"]?.firstRowHeight ?? 0,
  );
  const collapsedHeight =
    activePane === "Section progression" ? 96 : cardHeight;
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
        // Keep a shorter pattern row intact without exposing a chopped-off
        // second row in the space reserved for the common card height.
        pane.style.clipPath =
          expanded || !size.firstRowHeight
            ? "inset(0px)"
            : `inset(0px 0px max(0px, calc(100% - ${size.firstRowHeight}px)) 0px)`;
        const items = pane.querySelector<HTMLElement>("[data-metadata-items]");
        if (!items) return;
        const top = pane.getBoundingClientRect().top;
        for (const item of Array.from(items.children)) {
          if (item instanceof HTMLElement) {
            item.inert =
              !expanded &&
              item.getBoundingClientRect().bottom - top >
                size.firstRowHeight + 1;
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
