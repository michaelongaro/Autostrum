import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Dialog } from "~/components/ui/dialog";
import { useTabStoreApi } from "~/stores/TabStore";
import type { PrintTabData } from "~/utils/printTab";
import PrintTabDialog from "./PrintTabDialog";

export default function PrintTabButton({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const store = useTabStoreApi();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PrintTabData | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setData(null);
          buttonRef.current?.focus();
        }
      }}
    >
      <Button
        ref={buttonRef}
        type="button"
        variant="secondary"
        size={showLabel ? undefined : "icon"}
        aria-label="Print tab"
        title="Print tab"
        className="shrink-0 gap-2"
        onClick={() => {
          const state = store.getState();
          state.pauseAudio();
          const {
            id,
            title,
            artistName,
            description,
            tuning,
            bpm,
            capo,
            key,
            chords,
            tabData,
            sectionProgression,
          } = state;
          setData(
            structuredClone({
              id,
              title,
              artistName,
              description,
              tuning,
              bpm,
              capo,
              key,
              chords,
              tabData,
              sectionProgression,
            }),
          );
          setOpen(true);
        }}
      >
        <Printer className="size-4" strokeWidth={1.75} />
        {showLabel && "Print"}
      </Button>
      {data && <PrintTabDialog data={data} />}
    </Dialog>
  );
}
