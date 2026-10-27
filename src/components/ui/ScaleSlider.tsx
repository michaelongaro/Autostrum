import { useId } from "react";
import { getTrackBackground, Range } from "~/components/ui/Range";
import { Label } from "~/components/ui/label";

interface ScaleSliderProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
  onInteractionChange?: (pressing: boolean) => void;
}

export default function ScaleSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
  onInteractionChange,
}: ScaleSliderProps) {
  const labelId = useId();
  return (
    <div className="baseVertFlex w-full gap-2" data-scale-slider="">
      <div className="baseFlex w-full !justify-between gap-2 text-sm font-medium">
        <Label id={labelId}>{label}</Label>
        <output htmlFor={id}>{formatValue(value)}</output>
      </div>
      <div
        className="baseFlex w-full"
        onTouchStart={() => onInteractionChange?.(true)}
        onTouchCancel={() => onInteractionChange?.(false)}
        onTouchEnd={() => onInteractionChange?.(false)}
      >
        <Range
          label={label}
          labelledBy={labelId}
          min={min}
          max={max}
          step={step}
          values={[value]}
          onChange={(values) => onChange(values[0] ?? value)}
          renderMark={({ props, index }) => (
            <div
              {...props}
              key={props.key}
              data-scale-mark=""
              aria-hidden="true"
              style={{
                ...props.style,
                marginTop: "0px",
                height: "12px",
                width: "2px",
                borderRadius: "25%",
                backgroundColor:
                  min + index * step <= value + 1e-8
                    ? "hsl(var(--primary))"
                    : "#939098",
              }}
            />
          )}
          renderTrack={({ props, children, disabled }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <div
                ref={props.ref}
                className="w-full"
                data-scale-track=""
                style={{
                  height: "8px",
                  borderRadius: "0px",
                  alignSelf: "center",
                  filter: disabled ? "brightness(0.75)" : "none",
                  background: getTrackBackground({
                    values: [value],
                    colors: ["hsl(var(--primary))", "#939098"],
                    min,
                    max,
                  }),
                }}
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              key={`${props.key}-${index}`}
              id={id}
              aria-valuetext={formatValue(value)}
              className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary"
            />
          )}
        />
      </div>
      <div
        className="baseFlex w-full !justify-between gap-2 text-xs font-medium"
        aria-hidden="true"
      >
        <span>{formatValue(min)}</span>
        <span>{formatValue((min + max) / 2)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}
