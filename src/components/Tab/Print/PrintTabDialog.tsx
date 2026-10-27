import { useCallback, useMemo, useRef, useState } from "react";
import { Printer, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import type { PrintOptions, PrintTabData } from "~/utils/printTab";
import { buildPrintBlocks } from "./PrintTabDocument";
import PrintTabPreview from "./PrintTabPreview";
import PrintSettingsPanel from "./PrintSettingsPanel";
import ScaleSlider from "~/components/ui/ScaleSlider";

function PrintToggle({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label htmlFor={id} className={disabled ? "opacity-50" : ""}>
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export default function PrintTabDialog({
  data,
  onClose,
}: {
  data: PrintTabData;
  onClose: () => void;
}) {
  const preferences = useGetLocalStorageValues();
  const [open, setOpen] = useState(true);
  const [defaults] = useState<PrintOptions>(() => ({
    layout: "compact",
    paper: "letter",
    orientation: "portrait",
    scale: 0.85,
    colorChords: preferences.colorCodedChords,
    chordDiagrams: true,
    leftHanded: preferences.leftHandChordDiagrams,
    description: true,
    progression: true,
    newPagePerSection: false,
    expandRepeats: true,
    sectionIds: data.tabData.map((section) => section.id),
  }));
  const [options, setOptions] = useState(defaults);
  const [readyOptions, setReadyOptions] = useState<PrintOptions | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previewError, setPreviewError] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { blocks, error } = useMemo(() => {
    try {
      return { blocks: buildPrintBlocks(data, options), error: "" };
    } catch (error) {
      return {
        blocks: [],
        error:
          error instanceof Error
            ? error.message
            : "The print document could not be prepared.",
      };
    }
  }, [data, options]);

  function update<K extends keyof PrintOptions>(
    key: K,
    value: PrintOptions[K],
  ) {
    setPreviewError("");
    setReadyOptions(null);
    setOptions((previous) => ({ ...previous, [key]: value }));
  }
  const onReady = useCallback(
    (count: number) => {
      setPageCount(count);
      setReadyOptions(options);
    },
    [options],
  );
  const onError = useCallback((message: string) => {
    setReadyOptions(null);
    setPreviewError(message);
  }, []);
  const ready =
    readyOptions === options && blocks.length > 0 && !error && !previewError;
  const message = error || previewError;

  function print() {
    if (!ready || !frameRef.current?.contentWindow) return;
    try {
      frameRef.current.contentWindow.focus();
      frameRef.current.contentWindow.print();
    } catch {
      onError(
        "Printing is unavailable in this browser. Try opening this tab in a browser that supports printing.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="flex h-[100dvh] max-h-none !w-screen !max-w-none flex-col gap-0 overflow-hidden !rounded-none border-0 p-0 md:h-[94dvh] md:max-h-[1000px] md:!w-[min(1400px,96vw)] md:!rounded-lg md:border"
        onCloseAutoFocus={(event) => {
          // Radix calls this after the shared dialog's exit animation ends.
          // Only then release the snapshot and restore focus to Print tab.
          event.preventDefault();
          onClose();
        }}
        onKeyDown={(event) => {
          // The editor has a window-level spacebar playback shortcut.
          if (event.code === "Space") event.stopPropagation();
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "p"
          ) {
            event.preventDefault();
            event.stopPropagation();
            print();
          }
        }}
      >
        <DialogTitle className="flex shrink-0 items-center gap-2 px-5 py-4 pr-12">
          <Printer className="size-5" /> Print tab
        </DialogTitle>
        <DialogDescription className="sr-only">
          Configure and preview this tab before printing or saving it as PDF.
        </DialogDescription>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,40%)_minmax(0,1fr)] md:grid-cols-[290px_minmax(0,1fr)] md:grid-rows-1">
          <PrintSettingsPanel>
            <div className="space-y-5">
              <fieldset className="space-y-3">
                <legend className="sr-only">Layout options</legend>
                <div>
                  <Label htmlFor="print-layout">Layout</Label>
                  <Select
                    value={options.layout}
                    onValueChange={(value) =>
                      update("layout", value as PrintOptions["layout"])
                    }
                  >
                    <SelectTrigger
                      id="print-layout"
                      className="mt-1 h-9 bg-background px-2"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">
                        Compacted sections
                      </SelectItem>
                      <SelectItem value="expanded">
                        Expanded sections
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {options.layout === "expanded" && (
                  <PrintToggle
                    id="print-expand"
                    label="Expand all repeats"
                    checked={options.expandRepeats}
                    onChange={(value) => update("expandRepeats", value)}
                  />
                )}
                <PrintToggle
                  id="print-progression"
                  label="Section progression map"
                  checked={options.progression}
                  onChange={(value) => update("progression", value)}
                />
                <PrintToggle
                  id="print-new-page"
                  label="New page per section"
                  checked={options.newPagePerSection}
                  onChange={(value) => update("newPagePerSection", value)}
                />
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="sr-only">Paper settings</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="print-paper">Paper</Label>
                    <Select
                      value={options.paper}
                      onValueChange={(value) =>
                        update("paper", value as PrintOptions["paper"])
                      }
                    >
                      <SelectTrigger
                        id="print-paper"
                        className="mt-1 h-9 bg-background px-2"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">US Letter</SelectItem>
                        <SelectItem value="a4">A4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="print-orientation">Orientation</Label>
                    <Select
                      value={options.orientation}
                      onValueChange={(value) =>
                        update(
                          "orientation",
                          value as PrintOptions["orientation"],
                        )
                      }
                    >
                      <SelectTrigger
                        id="print-orientation"
                        className="mt-1 h-9 bg-background px-2"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ScaleSlider
                  id="print-scale"
                  label="Tab scale"
                  value={Math.round(options.scale * 100)}
                  min={60}
                  max={140}
                  step={5}
                  formatValue={(value) => `${value}%`}
                  onChange={(value) => update("scale", value / 100)}
                />
              </fieldset>
              <fieldset className="space-y-2 border-t pt-4">
                <legend className="pr-1 text-sm font-semibold">
                  On the page
                </legend>
                <PrintToggle
                  id="print-colors"
                  label="Color-coded chords"
                  checked={options.colorChords}
                  onChange={(value) => update("colorChords", value)}
                />
                <PrintToggle
                  id="print-diagrams"
                  label="Chord diagrams"
                  checked={options.chordDiagrams}
                  onChange={(value) => update("chordDiagrams", value)}
                />
                <PrintToggle
                  id="print-left-handed"
                  label="Left-handed diagrams"
                  disabled={!options.chordDiagrams}
                  checked={options.leftHanded}
                  onChange={(value) => update("leftHanded", value)}
                />
                <PrintToggle
                  id="print-description"
                  label="Tab description"
                  checked={options.description}
                  onChange={(value) => update("description", value)}
                />
              </fieldset>
              <fieldset className="space-y-2 border-t pt-4">
                <legend className="pr-1 text-sm font-semibold">
                  Sections to print
                </legend>
                <div className="flex gap-4 text-xs">
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() =>
                      update(
                        "sectionIds",
                        data.tabData.map((section) => section.id),
                      )
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => update("sectionIds", [])}
                  >
                    Clear
                  </button>
                </div>
                {data.tabData.map((section, index) => (
                  <label
                    key={section.id}
                    className="flex cursor-pointer items-start gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                      checked={options.sectionIds.includes(section.id)}
                      onChange={(event) =>
                        update(
                          "sectionIds",
                          event.target.checked
                            ? [...options.sectionIds, section.id]
                            : options.sectionIds.filter(
                                (id) => id !== section.id,
                              ),
                        )
                      }
                    />
                    <span className="break-words">
                      {index + 1}. {section.title}
                    </span>
                  </label>
                ))}
              </fieldset>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setPreviewError("");
                  setReadyOptions(null);
                  setOptions(defaults);
                }}
              >
                <RotateCcw className="size-3.5" /> Reset settings
              </Button>
            </div>
          </PrintSettingsPanel>
          <section
            aria-label="Print preview"
            className="relative min-h-0 min-w-0 bg-neutral-200"
          >
            {message ? (
              <div
                role="alert"
                className="flex h-full items-center justify-center p-8 text-center text-sm text-neutral-800"
              >
                {message}
              </div>
            ) : blocks.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-neutral-800">
                {data.tabData.length === 0
                  ? "This tab has no sections to print yet."
                  : options.sectionIds.length === 0
                    ? "Select at least one section to preview and print."
                    : "No selected sections appear in the saved progression. Choose another section or use the compact layout."}
              </div>
            ) : (
              <>
                <PrintTabPreview
                  data={data}
                  options={options}
                  blocks={blocks}
                  frameRef={frameRef}
                  onReady={onReady}
                  onError={onError}
                />
                {!ready && (
                  <div
                    role="status"
                    className="absolute inset-0 flex items-center justify-center bg-neutral-200/90 text-sm text-neutral-800"
                  >
                    Preparing preview…
                  </div>
                )}
              </>
            )}
          </section>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {ready
            ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · ${options.paper === "letter" ? "US Letter" : "A4"} · ${options.orientation}`
            : "Preview updates with your settings"}
        </p>
        <div
          className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-10 flex md:right-5"
          data-print-actions=""
        >
          <Button
            type="button"
            disabled={!ready}
            onClick={print}
            className="gap-2 shadow-lg"
          >
            <Printer className="size-4" /> Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
