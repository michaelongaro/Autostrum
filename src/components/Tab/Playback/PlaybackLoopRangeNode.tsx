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
      size="sm"
      disabled={disabled}
      onPointerDown={(e) => {
        // Keep strip scrubbing from stealing the chord-selection tap.
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ opacity }}
      className="h-6 min-w-[1.5rem] rounded-full px-1 py-0 transition-opacity"
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
      {role === "plus" && <BsPlus className="size-4" />}
    </Button>
  );
}

export default PlaybackLoopRangeNode;
