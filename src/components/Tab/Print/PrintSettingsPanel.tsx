import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export default function PrintSettingsPanel({
  children,
}: {
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const updateEdges = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const top = viewport.scrollTop > 1;
    const bottom =
      viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1;
    setEdges((previous) =>
      previous.top === top && previous.bottom === bottom
        ? previous
        : { top, bottom },
    );
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener("scroll", updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateEdges);
    };
  }, [updateEdges]);

  const mask =
    edges.top || edges.bottom
      ? `linear-gradient(to bottom, ${edges.top ? "transparent, black 28px" : "black"}, ${edges.bottom ? "black calc(100% - 28px), transparent" : "black"})`
      : undefined;

  return (
    <div className="min-h-0 border-b md:border-b-0 md:border-r">
      <aside
        ref={viewportRef}
        aria-label="Print settings"
        data-scroll-fade-top={edges.top}
        data-scroll-fade-bottom={edges.bottom}
        className="h-full overflow-y-auto overscroll-contain"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <div ref={contentRef} className="p-5 pb-24 md:pb-5">
          {children}
        </div>
      </aside>
    </div>
  );
}
