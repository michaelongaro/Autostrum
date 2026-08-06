import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PrettyNote } from "~/components/ui/PrettyTuning";
import { formatNoteLabel, frequencyFromMidi } from "~/utils/tunerMath";

const VISIBLE_SLOTS = 3;
const RENDER_RADIUS = 2;

type ChromaticPitchScrollerProps = {
  detectedNote: string | null;
  detectedCents: number | null;
  signalDetected: boolean;
};

function noteNameFromMidi(midi: number) {
  return midiToNoteName(midi, { sharps: true });
}

function ChromaticPitchScroller({
  detectedNote,
  detectedCents,
  signalDetected,
}: ChromaticPitchScrollerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateWidth = () => {
      setViewportWidth(el.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const detectedMidi = detectedNote
    ? get(formatNoteLabel(detectedNote)).midi
    : null;
  const hasLivePitch =
    signalDetected && detectedMidi !== null && detectedCents !== null;

  const continuousMidi = hasLivePitch
    ? detectedMidi + detectedCents / 100
    : null;

  const centerMidi =
    continuousMidi !== null ? Math.round(continuousMidi) : null;
  const slotWidth = viewportWidth / VISIBLE_SLOTS;
  const showTrack = continuousMidi !== null && slotWidth > 0;

  const renderMidis =
    centerMidi === null
      ? []
      : Array.from(
          { length: RENDER_RADIUS * 2 + 1 },
          (_, index) => centerMidi - RENDER_RADIUS + index,
        );

  // Absolute MIDI coordinate space: each note sits at midi * slotWidth.
  // Translate so continuousMidi is centered in the viewport.
  const trackX = showTrack
    ? viewportWidth / 2 - continuousMidi * slotWidth - slotWidth / 2
    : 0;

  return (
    <div
      ref={viewportRef}
      className="relative h-[76px] w-full overflow-hidden lg:h-[84px]"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Center playhead — detected pitch lands on this axis */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1/2 z-10 w-px -translate-x-1/2 bg-primary/45"
      />

      {!showTrack ? (
        <div className="baseVertFlex relative z-[1] h-full w-full gap-1">
          <div className="text-lg font-semibold text-foreground/70">--</div>
          <div className="text-sm tabular-nums text-foreground/55">-- Hz</div>
        </div>
      ) : (
        <motion.div
          className="absolute inset-y-0 left-0 z-[1]"
          initial={false}
          animate={{ x: trackX }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 28,
            mass: 0.7,
          }}
        >
          {renderMidis.map((midi) => {
            const noteName = noteNameFromMidi(midi);
            const frequency = frequencyFromMidi(midi);
            const distance = Math.abs(midi - continuousMidi);
            // Emphasize the note nearest the detected pitch; fade neighbors.
            const emphasis = Math.max(0.35, 1 - distance * 0.55);
            const isPrimary = Math.round(continuousMidi) === midi;

            return (
              <div
                key={midi}
                className="baseVertFlex absolute top-0 h-full gap-1 px-1"
                style={{
                  left: midi * slotWidth,
                  width: slotWidth,
                  opacity: emphasis,
                }}
              >
                <div
                  className={`font-semibold text-foreground ${isPrimary ? "text-lg lg:text-xl" : "text-base text-foreground/80 lg:text-lg"}`}
                >
                  <PrettyNote
                    note={formatNoteLabel(noteName)}
                    displayWithFlex={true}
                    showScientificPitchNotation={true}
                  />
                </div>
                <div
                  className={`tabular-nums ${isPrimary ? "text-sm font-semibold text-foreground/75 lg:text-base" : "text-xs text-foreground/55 lg:text-sm"}`}
                >
                  {`${frequency.toFixed(1)} Hz`}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default ChromaticPitchScroller;
