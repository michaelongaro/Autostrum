import { ChevronDown } from "lucide-react";
import { getTrackBackground, Range } from "react-range";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/utils/cn";
import {
  clampPlaybackSpeed,
  formatPlaybackSpeed,
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  PLAYBACK_SPEED_STEP,
  type PlaybackSpeed,
} from "~/utils/playbackSpeedControls";

interface PlaybackSpeedPopoverProps {
  playbackSpeed: PlaybackSpeed;
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** "select" matches existing SelectTrigger styling; "link" is a compact text trigger. */
  triggerVariant?: "select" | "link";
  triggerClassName?: string;
  id?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

function PlaybackSpeedPopover({
  playbackSpeed,
  onPlaybackSpeedChange,
  disabled = false,
  onOpenChange,
  triggerVariant = "select",
  triggerClassName,
  id,
  side = "bottom",
  align = "center",
}: PlaybackSpeedPopoverProps) {
  const clampedSpeed = clampPlaybackSpeed(playbackSpeed);
  const speedLabel = formatPlaybackSpeed(clampedSpeed);

  function handleSpeedChange(rawSpeed: number) {
    onPlaybackSpeedChange(clampPlaybackSpeed(rawSpeed));
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {triggerVariant === "link" ? (
          <Button
            id={id}
            variant="link"
            disabled={disabled}
            className={cn("min-w-[42px] !px-0 tabular-nums", triggerClassName)}
          >
            {speedLabel}
          </Button>
        ) : (
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "border-input flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
              triggerClassName,
            )}
          >
            <span className="tabular-nums">{speedLabel}</span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="baseVertFlex w-80 gap-4 p-4"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // PlaybackModal's FocusTrap does not contain this portaled content.
        // react-range focuses its thumb on touch; the trap then reclaims focus
        // onto the modal, which Radix treats as focus-outside and closes the
        // popover (iOS). Pointer-outside / Escape still dismiss normally.
        // The Drawer host has no FocusTrap, which is why it was unaffected.
        onFocusOutside={(event) => event.preventDefault()}
      >
        <div className="baseVertFlex w-full">
          <div className="baseFlex w-full !justify-between text-sm">
            <span className="font-medium">Speed</span>
            {speedLabel}
          </div>

          <Range
            label="Slider to control the playback speed"
            min={PLAYBACK_SPEED_MIN}
            max={PLAYBACK_SPEED_MAX}
            step={PLAYBACK_SPEED_STEP}
            values={[clampedSpeed]}
            onChange={(values) => {
              handleSpeedChange(values[0] ?? 1);
            }}
            renderMark={({ props, index }) => {
              const markValue =
                PLAYBACK_SPEED_MIN + index * PLAYBACK_SPEED_STEP;
              const isMajorTick = index % 5 === 0; // 0.25, 0.5, 0.75, 1, 1.25, 1.5
              const isActive = markValue <= clampedSpeed + Number.EPSILON;

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
                      values: [clampedSpeed],
                      colors: ["hsl(var(--primary))", "#939098"],
                      min: PLAYBACK_SPEED_MIN,
                      max: PLAYBACK_SPEED_MAX,
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

          <div className="baseFlex relative mt-4 w-full !justify-between gap-4 text-xs font-medium">
            <span className="absolute bottom-0 left-0">0.25x</span>
            <span className="absolute bottom-0 left-12">0.5x</span>
            <span className="absolute bottom-0 left-[100px]">0.75x</span>
            <span className="absolute bottom-0 right-[108px]">1x</span>
            <span className="absolute bottom-0 right-11">1.25x</span>
            <span className="absolute bottom-0 right-0">1.5x</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PlaybackSpeedPopover;
