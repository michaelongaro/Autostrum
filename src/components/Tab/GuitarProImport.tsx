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
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
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
import { useTabStoreApi, type TabDocument } from "~/stores/TabStore";
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
import { Separator } from "~/components/ui/separator";

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export default function GuitarProImport({
  importTab,
}: {
  importTab: (document: TabDocument) => void;
}) {
  const store = useTabStoreApi();
  const utils = api.useUtils();
  const isDesktop = useViewportWidthBreakpoint(768);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<ImportTrack[]>([]);
  const [trackId, setTrackId] = useState("");
  const [selectionPreview, setSelectionPreview] = useState<{
    trackId: string;
    preview: ImportPreview;
  } | null>(null);
  const preview = selectionPreview?.preview;
  const canImport = selectionPreview?.trackId === trackId && !busy && !applying;
  const [imported, setImported] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const requestedTrackId = useRef<string | undefined>(undefined);

  function clearTimeoutTimer() {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  }

  function disposeWorker() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    requestedTrackId.current = undefined;
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
      setError(
        "This file took too long to read. Try a smaller file or export the track as GP5 without embedded audio.",
      );
    }, 20000);
  }

  function convertTrack(id: string) {
    if (!worker.current || requestedTrackId.current === id) return;
    requestedTrackId.current = id;
    setTrackId(id);
    setError(null);
    setBusy(true);
    startTimeout();
    worker.current.postMessage({
      type: "convert",
      trackId: id,
    } satisfies ImportRequest);
  }

  async function readFile(files: FileList | File[]) {
    if (busy || applying) return;
    disposeWorker();
    setError(null);
    setSelectionPreview(null);
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
        const response = event.data;
        if (
          response.type !== "tracks" &&
          response.trackId &&
          response.trackId !== requestedTrackId.current
        )
          return;
        clearTimeoutTimer();
        if (response.type === "tracks") {
          setTracks(response.tracks);
          convertTrack(
            (response.tracks.find((track) => track.strings === 6) ??
              response.tracks[0])!.id,
          );
        } else {
          setBusy(false);
          if (response.type === "error") setError(response.message);
          else setSelectionPreview(response);
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
      setSelectionPreview(null);
      setTracks([]);
      setTrackId("");
      setError(null);
      setDragging(false);
    }
    setOpen(next);
  }

  const replacesDraft =
    open && !isDefaultTabDocument(getTabDocument(store.getState()));
  const isPublishedTab = store.getState().id !== -1;

  async function importTrack() {
    if (!preview || !canImport) return;
    const currentGeneration = generation.current;
    setApplying(true);
    setError(null);
    try {
      const name = preview.document.artistName;
      const artist = name
        ? await utils.artist.getByNameAndOrId.fetch({ name })
        : null;
      // Cached artist lookups can resolve before the spinner has painted.
      await waitForPaint();
      if (generation.current !== currentGeneration) return;
      importTab({
        ...preview.document,
        artistId: artist?.id ?? null,
        artistName: artist?.name ?? name,
        artistIsVerified: artist?.isVerified ?? false,
      });
      await waitForPaint();
      if (generation.current !== currentGeneration) return;
      setImported(true);
      changeOpen(false);
    } catch {
      if (generation.current === currentGeneration)
        setError("The track could not be imported. Please try again.");
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
      <Surface
        open={open}
        onOpenChange={(next, details) => {
          if (!next && applying) {
            details.cancel();
            return;
          }
          changeOpen(next);
        }}
      >
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
              <div className="baseFlex flex-nowrap gap-2 text-sm text-foreground/75">
                .gp3, .gp4, .gp5, .gpx, .gp
                <Separator className="h-4 w-[1px] bg-foreground/50" />
                20 MB limit
              </div>
            </button>
            <p className="text-sm text-foreground/75">
              For older .gtp files, export to .gp5 first.
            </p>
            {tracks.length > 1 && (
              <FieldGroup>
                <Field>
                  <FieldLabel
                    id="guitar-pro-track-label"
                    htmlFor="guitar-pro-track"
                  >
                    Track to import
                  </FieldLabel>
                  <Select
                    value={trackId}
                    disabled={applying}
                    onValueChange={(value) => {
                      if (value) convertTrack(value);
                    }}
                  >
                    <SelectTrigger
                      id="guitar-pro-track"
                      aria-labelledby="guitar-pro-track-label"
                    >
                      <SelectValue className="min-w-0 truncate text-left" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {tracks.map((track) => (
                          <SelectItem key={track.id} value={track.id}>
                            {track.name} · {track.strings} strings
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            )}
            {busy && !preview && (
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
              <div
                className="flex flex-col gap-3 rounded-lg border bg-secondary p-3 text-sm"
                role="status"
                aria-busy={busy}
              >
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold">
                    {preview.document.title}
                  </p>
                  {preview.document.artistName && (
                    <p className="break-words text-secondary-foreground">
                      {preview.document.artistName}
                    </p>
                  )}
                </div>
                <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-2 gap-y-2 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.5fr)] md:gap-x-4">
                  {[
                    ["Tempo", `${preview.document.bpm} BPM`],
                    ["Measures", preview.measures],
                    [
                      "Capo",
                      preview.document.capo === 0
                        ? "None"
                        : `${getOrdinalSuffix(preview.document.capo)} fret`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-secondary-foreground">
                        {label}
                      </dt>
                      <dd className="whitespace-nowrap font-medium">{value}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-xs text-secondary-foreground">
                      Tuning
                    </dt>
                    <dd>
                      <PrettyTuning
                        tuning={preview.document.tuning}
                        displayWithFlex
                        width="!justify-start"
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            <SurfaceFooter className="flex-row justify-end gap-2 p-0 sm:space-x-0">
              <Button
                variant="secondary"
                disabled={applying}
                onClick={() => changeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="gap-2 whitespace-nowrap"
                disabled={!canImport}
                aria-busy={applying}
                onClick={() => void importTrack()}
              >
                {applying && (
                  <span aria-hidden="true" data-icon="inline-start">
                    <Spinner className="size-4" />
                  </span>
                )}
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
        {imported &&
          `Guitar Pro track imported. Review your tab and choose a genre before ${isPublishedTab ? "saving" : "publishing"}.`}
      </span>
    </>
  );
}
