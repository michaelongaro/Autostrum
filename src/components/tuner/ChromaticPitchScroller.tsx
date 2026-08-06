import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PrettyNote } from "~/components/ui/PrettyTuning";
import { formatNoteLabel, frequencyFromMidi } from "~/utils/tunerMath";

const VISIBLE_SLOTS = 3;
const RENDER_RADIUS = 2;
/** Middle of the standard MIDI note range (0–127). */
const DEFAULT_CENTER_MIDI = 64; // E4

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
  // Whole-note MIDI to park on when idle. Continuous position may include cents
  // while live, but idle must always center a note exactly in the viewport.
  const lastNoteMidiRef = useRef(DEFAULT_CENTER_MIDI);
  const [continuousMidi, setContinuousMidi] = useState(DEFAULT_CENTER_MIDI);

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

  useEffect(() => {
    if (hasLivePitch && detectedMidi !== null && detectedCents !== null) {
      lastNoteMidiRef.current = detectedMidi;
      // Live: slide continuously with cents offset between neighboring notes.
      setContinuousMidi(detectedMidi + detectedCents / 100);
      return;
    }

    // Idle / lost signal: snap to the last whole note so it sits dead-center.
    setContinuousMidi(lastNoteMidiRef.current);
  }, [hasLivePitch, detectedMidi, detectedCents]);

  const centerMidi = Math.round(continuousMidi);
  const slotWidth = viewportWidth / VISIBLE_SLOTS;

  const renderMidis = Array.from(
    { length: RENDER_RADIUS * 2 + 1 },
    (_, index) => centerMidi - RENDER_RADIUS + index,
  );

  // Absolute MIDI coordinate space: each note sits at midi * slotWidth.
  // Translate so continuousMidi is centered in the viewport.
  const trackX =
    slotWidth > 0
      ? viewportWidth / 2 - continuousMidi * slotWidth - slotWidth / 2
      : 0;

  return (
    <div
      ref={viewportRef}
      className="relative mx-auto h-[76px] w-full max-w-sm overflow-hidden lg:h-[84px]"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {slotWidth > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0"
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
