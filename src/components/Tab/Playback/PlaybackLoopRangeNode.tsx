import { BsPlus } from "react-icons/bs";
import { Button } from "~/components/ui/button";

export type LoopRangeNodeRole = "start" | "end" | "plus" | "middle" | "none";

interface PlaybackLoopRangeNode {
  role: LoopRangeNodeRole;
  opacity: number;
  disabled: boolean;
  onSelect: () => void;
}

function PlaybackLoopRangeNode({
  role,
  opacity,
  disabled,
  onSelect,
}: PlaybackLoopRangeNode) {
  if (role === "none") return null;

  if (role === "middle") {
    return (
      <div
        style={{ opacity }}
        className="baseFlex h-7 w-full"
        aria-hidden="true"
      >
        <div className="h-px w-full bg-foreground" />
      </div>
    );
  }

  // Invariant: any lowered-opacity interactive node must be disabled.
  const isDisabled = disabled || opacity < 1;

  return (
    <Button
      type="button"
      size="sm"
      disabled={isDisabled}
      data-loop-range-node="true"
      onPointerDown={(e) => {
        // Keep strip scrubbing from stealing the chord-selection tap.
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (isDisabled) return;
        onSelect();
      }}
      style={{
        opacity,
        ["--loop-node-opacity" as string]: opacity,
      }}
      // Inline opacity must win over the shared Button `disabled:opacity-50`.
      className="relative z-20 h-7 min-w-[1.75rem] rounded-full px-1 py-0 !transition-none disabled:!opacity-[var(--loop-node-opacity)]"
    >
      {role === "start" && (
        <div className="baseVertFlex text-[9px] leading-[1.1]">
          <span>Start</span>
        </div>
      )}
      {role === "end" && (
        <div className="baseVertFlex text-[9px] leading-[1.1]">
          <span>End</span>
        </div>
      )}
      {role === "plus" && <BsPlus className="size-5" />}
    </Button>
  );
}

export default PlaybackLoopRangeNode;
