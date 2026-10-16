import ChordStrumIcon from "~/components/ui/icons/ChordStrumIcon";
import { cn } from "~/utils/cn";
import type { ChordTrainerStrum } from "~/data/tools/chordTrainerStrummingPatterns";

interface ChordTrainerStrumPreviewProps {
  strums: ChordTrainerStrum[];
  className?: string;
}

function ChordTrainerStrumPreview({
  strums,
  className,
}: ChordTrainerStrumPreviewProps) {
  return (
    <div className={cn("baseFlex", className)}>
      {strums.map((strum, index) => (
        <div key={`${strum.effect}-${index}`} className="baseFlex">
          {strum.effect ? (
            <ChordStrumIcon effects={strum.effect} className="h-4 w-4" />
          ) : (
            <div className="h-4 w-2.5" />
          )}
        </div>
      ))}
    </div>
  );
}

export default ChordTrainerStrumPreview;
