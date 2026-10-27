import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTabStoreApi } from "~/stores/TabStore";
import type { PrintTabData } from "~/utils/printTab";

const PrintTabDialog = dynamic(() => import("./PrintTabDialog"), {
  ssr: false,
});

export default function PrintTabButton({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const store = useTabStoreApi();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [data, setData] = useState<PrintTabData | null>(null);

  return (
    <>
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
        }}
      >
        <Printer className="size-4" />
        {showLabel && "Print"}
      </Button>
      {data && (
        <PrintTabDialog
          data={data}
          onClose={() => {
            setData(null);
            buttonRef.current?.focus();
          }}
        />
      )}
    </>
  );
}
