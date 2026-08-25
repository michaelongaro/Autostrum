import { getTrackBackground, Range } from "react-range";
import { Label } from "~/components/ui/label";
import { cn } from "~/utils/cn";

export const CHORD_TRAINER_BPM_MIN = 10;
export const CHORD_TRAINER_BPM_MAX = 180;
export const CHORD_TRAINER_BPM_STEP = 10;

const BPM_LABELS = [10, 50, 90, 130, 180] as const;

interface ChordTrainerBpmRangeProps {
  tempo: number;
  onTempoChange: (tempo: number) => void;
  className?: string;
}

export function clampChordTrainerTempo(value: number) {
  const rounded =
    Math.round(value / CHORD_TRAINER_BPM_STEP) * CHORD_TRAINER_BPM_STEP;

  return Math.min(
    CHORD_TRAINER_BPM_MAX,
    Math.max(CHORD_TRAINER_BPM_MIN, rounded),
  );
}

function ChordTrainerBpmRange({
  tempo,
  onTempoChange,
  className,
}: ChordTrainerBpmRangeProps) {
  const clampedTempo = clampChordTrainerTempo(tempo);

  return (
    <div className={cn("baseVertFlex w-full !items-start", className)}>
      <div className="baseFlex mb-1 w-full !justify-between text-sm">
        <Label htmlFor="chord-trainer-bpm" className="font-medium">
          BPM
        </Label>
        <span className="tabular-nums">{clampedTempo}</span>
      </div>

      <div className="w-full px-1">
        <Range
          label="Slider to control the chord trainer BPM"
          min={CHORD_TRAINER_BPM_MIN}
          max={CHORD_TRAINER_BPM_MAX}
          step={CHORD_TRAINER_BPM_STEP}
          values={[clampedTempo]}
          onChange={(values) => {
            onTempoChange(clampChordTrainerTempo(values[0] ?? clampedTempo));
          }}
          renderMark={({ props, index }) => {
            const markValue =
              CHORD_TRAINER_BPM_MIN + index * CHORD_TRAINER_BPM_STEP;
            const isMajorTick =
              index % 4 === 0 || markValue === CHORD_TRAINER_BPM_MAX;
            const isActive = markValue <= clampedTempo + Number.EPSILON;

            return (
              <div
                {...props}
                key={props.key}
                style={{
                  ...props.style,
                  marginTop: "0px",
                  height: isMajorTick ? "16px" : "12px",
                  width: "2px",
                  borderRadius: "1px",
                  backgroundColor: isActive
                    ? "hsl(var(--primary))"
                    : "#939098",
                }}
              />
            );
          }}
          renderTrack={({ props, children }) => (
            <div
              id="chord-trainer-bpm"
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
                justifyContent: "center",
              }}
              className="mb-1 mt-3"
            >
              <div
                ref={props.ref}
                style={{
                  height: "8px",
                  borderRadius: "0px",
                  alignSelf: "center",
                  background: getTrackBackground({
                    values: [clampedTempo],
                    colors: ["hsl(var(--primary))", "#939098"],
                    min: CHORD_TRAINER_BPM_MIN,
                    max: CHORD_TRAINER_BPM_MAX,
                  }),
                }}
                className="relative mb-2 w-full"
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props }) => {
            const { key, ...restOfProps } = props;
            return (
              <div
                key={key}
                {...restOfProps}
                className="!z-20 size-[18px] rounded-full border bg-primary"
              />
            );
          }}
        />

        <div className="relative mt-4 h-4 w-full text-xs font-medium">
          {BPM_LABELS.map((label) => {
            const percent =
              ((label - CHORD_TRAINER_BPM_MIN) /
                (CHORD_TRAINER_BPM_MAX - CHORD_TRAINER_BPM_MIN)) *
              100;
            const isFirst = label === CHORD_TRAINER_BPM_MIN;
            const isLast = label === CHORD_TRAINER_BPM_MAX;

            return (
              <span
                key={label}
                className="absolute bottom-0 tabular-nums"
                style={{
                  left: `${percent}%`,
                  transform: isFirst
                    ? "translateX(0)"
                    : isLast
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ChordTrainerBpmRange;
