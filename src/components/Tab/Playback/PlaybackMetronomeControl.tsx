import { useId } from "react";
import { PiMetronome } from "react-icons/pi";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTabStore } from "~/stores/TabStore";

export default function PlaybackMetronomeControl({ mobile = false }) {
  const id = useId();
  const { enabled, setEnabled } = useTabStore((state) => ({
    enabled: state.playbackMetronomeEnabled,
    setEnabled: state.setPlaybackMetronomeEnabled,
  }));

  // Space operates this control without also invoking global play/pause.
  const keyboardProps = {
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.code === "Space") event.stopPropagation();
    },
    onKeyUp: (event: React.KeyboardEvent) => {
      if (event.code === "Space") event.stopPropagation();
    },
  };

  if (mobile) {
    return (
      <div className="baseFlex w-full !justify-between gap-2">
        <Label htmlFor={id} className="baseFlex gap-2">
          <PiMetronome className="size-4" />
          Metronome
        </Label>
        <Switch
          id={id}
          checked={enabled}
          onCheckedChange={setEnabled}
          {...keyboardProps}
        />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label="Toggle metronome"
            aria-pressed={enabled}
            className={`baseFlex size-10 shrink-0 p-0 hover:bg-accent/90 hover:!text-primary-foreground active:!bg-accent ${enabled ? "bg-accent/90 text-primary-foreground" : ""}`}
            onClick={() => setEnabled(!enabled)}
            {...keyboardProps}
          >
            <PiMetronome className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Metronome</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
