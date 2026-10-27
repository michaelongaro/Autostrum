import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  getPrintPageSize,
  type PrintOptions,
  type PrintTabData,
} from "~/utils/printTab";
import { getPrintStyles } from "./printStyles";
import { paginatePrintDocument } from "./paginatePrintDocument";

const FRAME_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>';

export default function PrintTabPreview({
  data,
  options,
  blocks,
  frameRef,
  onReady,
  onError,
}: {
  data: PrintTabData;
  options: PrintOptions;
  blocks: ReactNode[];
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onReady: (pageCount: number) => void;
  onError: (message: string) => void;
}) {
  const [doc, setDoc] = useState<Document | null>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    const frameWindow = doc.defaultView;
    if (!frameWindow) return;

    function fitPages() {
      if (!doc || !pagesRef.current) return;
      const width = getPrintPageSize(options).width;
      pagesRef.current.style.zoom = String(
        Math.min(
          1,
          Math.max(0.1, (doc.documentElement.clientWidth - 24) / width),
        ),
      );
    }

    async function paginate() {
      try {
        await doc!.fonts.ready;
        if (cancelled || !sourceRef.current || !pagesRef.current) return;
        const count = paginatePrintDocument(
          sourceRef.current,
          pagesRef.current,
          data,
          options,
        );
        fitPages();
        onReady(count);
      } catch {
        if (!cancelled)
          onError(
            "The print preview could not be prepared. Close it and try again.",
          );
      }
    }
    void paginate();
    frameWindow.addEventListener("resize", fitPages);
    return () => {
      cancelled = true;
      frameWindow.removeEventListener("resize", fitPages);
    };
  }, [doc, data, options, blocks, onReady, onError]);

  async function initialize(frame: HTMLIFrameElement) {
    const frameDocument = frame.contentDocument;
    if (!frameDocument) {
      onError("Your browser could not open the print preview.");
      return;
    }
    frameDocument.title = `${data.title || "Untitled tab"} — Autostrum`;
    try {
      // Reuse the notation renderer's styles without inheriting the app's theme,
      // navigation, scroll containers, animations or virtualization.
      await Promise.all(
        Array.from(
          document.querySelectorAll('style, link[rel="stylesheet"]'),
        ).map((style) => {
          const clone = style.cloneNode(true) as
            HTMLStyleElement | HTMLLinkElement;
          const loaded =
            clone.tagName === "LINK"
              ? new Promise<void>((resolve, reject) => {
                  clone.onload = () => resolve();
                  clone.onerror = () =>
                    reject(new Error("Stylesheet failed to load"));
                })
              : Promise.resolve();
          frameDocument.head.append(clone);
          return loaded;
        }),
      );
      if (frame.isConnected) setDoc(frameDocument);
    } catch {
      if (frame.isConnected) {
        onError(
          "The print styles could not be loaded. Close the preview and try again.",
        );
      }
    }
  }

  return (
    <>
      <iframe
        ref={frameRef}
        title="Tab print preview"
        srcDoc={FRAME_HTML}
        className="h-full min-h-[300px] w-full border-0 bg-neutral-200"
        onLoad={(event) => void initialize(event.currentTarget)}
      />
      {doc &&
        createPortal(
          <>
            <style>{getPrintStyles(options)}</style>
            <div id="print-source" ref={sourceRef} aria-hidden="true">
              {blocks}
            </div>
            <main id="print-pages" ref={pagesRef} />
          </>,
          doc.body,
        )}
    </>
  );
}
