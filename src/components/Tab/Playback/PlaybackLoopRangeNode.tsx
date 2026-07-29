import { BsPlus } from "react-icons/bs";
import { Button } from "~/components/ui/button";

export type LoopRangeNodeRole = "start" | "end" | "plus" | "none";

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

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
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
        if (disabled) return;
        onSelect();
      }}
      style={{ opacity }}
      className="relative z-20 h-7 min-w-[1.75rem] rounded-full px-1 py-0 transition-opacity"
    >
      {role === "start" && (
        <div className="baseVertFlex text-[9px] leading-[1.1]">
          <span>Loop</span>
          <span>start</span>
        </div>
      )}
      {role === "end" && (
        <div className="baseVertFlex text-[9px] leading-[1.1]">
          <span>Loop</span>
          <span>end</span>
        </div>
      )}
      {role === "plus" && <BsPlus className="size-5" />}
    </Button>
  );
}

export default PlaybackLoopRangeNode;
