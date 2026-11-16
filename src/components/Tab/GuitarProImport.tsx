"use client";

import { useEffect, useRef, useState } from "react";
import { FileMusic } from "lucide-react";
import { MdUploadFile } from "react-icons/md";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import Spinner from "~/components/ui/Spinner";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import { getTabDocument } from "~/utils/drafts/tabDraftState";
import { isDefaultTabDocument } from "~/utils/drafts/draftDocument";
import { useTabStoreApi } from "~/stores/TabStore";
import { cn } from "~/utils/cn";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import {
  GUITAR_PRO_ACCEPT,
  validateGuitarProFile,
  type ImportPreview,
  type ImportRequest,
  type ImportResponse,
  type ImportTrack,
} from "~/utils/guitarPro/types";

export default function GuitarProImport() {
  const store = useTabStoreApi();
  const utils = api.useContext();
  const isDesktop = useViewportWidthBreakpoint(768);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<ImportTrack[]>([]);
  const [trackId, setTrackId] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [imported, setImported] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  function clearTimeoutTimer() {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  }

  function disposeWorker() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    clearTimeoutTimer();
  }

  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  function startTimeout() {
    clearTimeoutTimer();
    timeout.current = setTimeout(() => {
      disposeWorker();
      setBusy(false);
      setPreview(null);
      setError(
        "This file took too long to read. Try a smaller file or export the track as GP5 without embedded audio.",
      );
    }, 20000);
  }

  function convertTrack(id: string) {
    setTrackId(id);
    setPreview(null);
    setError(null);
    setBusy(true);
    startTimeout();
    worker.current?.postMessage({
      type: "convert",
      trackId: id,
    } satisfies ImportRequest);
  }

  async function readFile(files: FileList | File[]) {
    if (busy || applying) return;
    disposeWorker();
    setError(null);
    setPreview(null);
    setTracks([]);
    setTrackId("");
    setImported(false);
    try {
      if (files.length !== 1)
        throw new Error("Choose one Guitar Pro file at a time.");
      const file = files[0]!;
      validateGuitarProFile(file);
      setBusy(true);
      startTimeout();
      const currentGeneration = generation.current;
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (generation.current !== currentGeneration) return;
      const parser = new Worker(
        new URL("../../utils/guitarPro/import.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = parser;
      parser.onmessage = (event: MessageEvent<ImportResponse>) => {
        if (worker.current !== parser) return;
        clearTimeoutTimer();
        if (event.data.type === "tracks") {
          setTracks(event.data.tracks);
          convertTrack(
            (event.data.tracks.find((track) => track.strings === 6) ??
              event.data.tracks[0])!.id,
          );
        } else {
          setBusy(false);
          if (event.data.type === "error") setError(event.data.message);
          else setPreview(event.data.preview);
        }
      };
      parser.onerror = () => {
        disposeWorker();
        setBusy(false);
        setError(
          "The file reader could not start. Please try again or reload the page.",
        );
      };
      parser.postMessage(
        { type: "load", bytes, fileName: file.name } satisfies ImportRequest,
        [bytes.buffer],
      );
    } catch (cause) {
      disposeWorker();
      setBusy(false);
      setApplying(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "This file could not be read. Please try another file.",
      );
    }
  }

  function changeOpen(next: boolean) {
    if (!next) {
      disposeWorker();
      setBusy(false);
      setApplying(false);
      setPreview(null);
      setTracks([]);
      setTrackId("");
      setError(null);
      setDragging(false);
    }
    setOpen(next);
  }

  const replacesDraft =
    open && !isDefaultTabDocument(getTabDocument(store.getState()));

  async function importTrack() {
    if (!preview || applying) return;
    const currentGeneration = generation.current;
    setApplying(true);
    setError(null);
    try {
      const name = preview.document.artistName;
      const artist = name
        ? await utils.artist.getByNameAndOrId.fetch({ name })
        : null;
      if (generation.current !== currentGeneration) return;
      // A null ID plus a name is the combobox's existing "new artist" entry;
      // publication creates it, so canceling an import never creates artists.
      store.getState().importDocument({
        ...preview.document,
        artistId: artist?.id ?? null,
        artistName: artist?.name ?? name,
        artistIsVerified: artist?.isVerified ?? false,
      });
      setImported(true);
      changeOpen(false);
    } catch {
      if (generation.current === currentGeneration)
        setError(
          "The artist could not be checked. Please try importing again.",
        );
    } finally {
      if (generation.current === currentGeneration) setApplying(false);
    }
  }

  const Surface = isDesktop ? Dialog : Drawer;
  const SurfaceTrigger = isDesktop ? DialogTrigger : DrawerTrigger;
  const SurfaceContent = isDesktop ? DialogContent : DrawerContent;
  const SurfaceTitle = isDesktop ? DialogTitle : DrawerTitle;
  const SurfaceFooter = isDesktop ? DialogFooter : DrawerFooter;

  return (
    <>
      <Surface open={open} onOpenChange={changeOpen}>
        <SurfaceTrigger
          render={
            <Button
              variant="secondary"
              className="shrink-0 gap-2 [&_svg]:size-4"
            />
          }
        >
          <MdUploadFile data-icon="inline-start" />
          Import
        </SurfaceTrigger>
        <SurfaceContent
          className={cn(
            "max-h-[90dvh] overflow-y-auto",
            isDesktop && "sm:max-w-xl",
            !isDesktop && "pb-3",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy && !applying) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void readFile(event.dataTransfer.files);
          }}
        >
          <div
            className={cn("flex min-h-0 flex-col gap-4", !isDesktop && "p-4")}
          >
            <SurfaceTitle>Import a Guitar Pro tab</SurfaceTitle>
            <input
              ref={input}
              type="file"
              accept={GUITAR_PRO_ACCEPT}
              className="hidden"
              aria-label="Choose a Guitar Pro file"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (files.length) void readFile(files);
              }}
            />
            <button
              type="button"
              disabled={busy || applying}
              onClick={() => input.current?.click()}
              className={cn(
                "flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-6 text-center transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
                dragging && "border-primary bg-secondary",
              )}
            >
              <FileMusic className="size-7" aria-hidden="true" />
              <span className="font-medium">
                Drop your file here or click to browse
              </span>
              <span className="text-sm text-foreground/75">
                .gp3, .gp4, .gp5, .gpx, .gp · Up to 20 MB
              </span>
            </button>
            <p className="text-sm text-foreground/75">
              Files are read on your device. For older .gtp files, export to GP5
              first.
            </p>
            {tracks.length > 0 && (
              <div className="flex flex-col gap-2">
                <span
                  id="guitar-pro-track-label"
                  className="text-sm font-medium"
                >
                  Track to import
                </span>
                <Select
                  value={trackId}
                  disabled={busy || applying}
                  onValueChange={(value) => {
                    if (value) convertTrack(value);
                  }}
                >
                  <SelectTrigger aria-labelledby="guitar-pro-track-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {tracks.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.name} · {track.strings} strings
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
            {busy && (
              <div role="status" className="flex items-center gap-2 text-sm">
                <Spinner className="size-4" />
                Reading your tab…
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {preview && (
              <div className="flex flex-col gap-3 text-sm" role="status">
                <p>
                  <strong>{preview.document.title}</strong> · {preview.measures}{" "}
                  measures · {preview.document.bpm} BPM ·{" "}
                  {preview.document.capo === 0
                    ? "No capo"
                    : `Capo: ${getOrdinalSuffix(preview.document.capo)} fret`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span>Tuning (low to high):</span>
                  <PrettyTuning
                    tuning={preview.document.tuning}
                    displayWithFlex
                  />
                </div>
              </div>
            )}
            <SurfaceFooter className="gap-2 p-0">
              {isDesktop && (
                <Button variant="secondary" onClick={() => changeOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button
                className={cn(!isDesktop && "w-full")}
                disabled={!preview || busy || applying}
                onClick={() => void importTrack()}
              >
                {applying
                  ? "Importing…"
                  : replacesDraft
                    ? "Replace draft & import"
                    : "Import track"}
              </Button>
            </SurfaceFooter>
          </div>
        </SurfaceContent>
      </Surface>
      <span className="sr-only" role="status">
        {imported
          ? "Guitar Pro track imported. Review your tab and choose a genre before publishing."
          : ""}
      </span>
    </>
  );
}
