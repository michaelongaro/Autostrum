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
  playbackSpeedPresets,
  playbackSpeedsEqual,
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
        className="baseVertFlex w-64 gap-4 p-4"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="baseVertFlex w-full gap-3">
          <div className="baseFlex w-full !justify-between text-sm">
            <span className="font-medium">Speed</span>
            <span className="tabular-nums text-foreground/80">{speedLabel}</span>
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
              >
                <div
                  ref={props.ref}
                  style={{
                    height: "8px",
                    borderRadius: "4px",
                    alignSelf: "center",
                    background: getTrackBackground({
                      values: [clampedSpeed],
                      colors: [
                        "hsl(var(--primary))",
                        "hsl(var(--gray)/0.75)",
                      ],
                      min: PLAYBACK_SPEED_MIN,
                      max: PLAYBACK_SPEED_MAX,
                    }),
                  }}
                  className="relative w-full"
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
        </div>

        <div className="baseFlex w-full flex-wrap !justify-start gap-2">
          {playbackSpeedPresets.map((preset) => {
            const isActive = playbackSpeedsEqual(clampedSpeed, preset);

            return (
              <Button
                key={preset}
                type="button"
                variant={isActive ? "default" : "outline"}
                className="h-8 px-2.5 tabular-nums"
                onClick={() => handleSpeedChange(preset)}
              >
                {formatPlaybackSpeed(preset)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PlaybackSpeedPopover;
