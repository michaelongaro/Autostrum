import { motion } from "framer-motion";

function TunerCentsMeter({
  cents,
  toleranceCents,
}: {
  cents: number | null;
  toleranceCents: number;
}) {
  const clampedCents = Math.max(-50, Math.min(50, cents ?? 0));
  const normalizedNeedlePosition = (clampedCents + 50) / 100;

  const toleranceWidthPercent = Math.min(100, (toleranceCents / 50) * 100);
  const toleranceLeftPercent = 50 - toleranceWidthPercent / 2;

  return (
    <div className="baseVertFlex w-full gap-1">
      <div className="baseFlex w-full !justify-between text-xs text-foreground/70">
        <span>-50</span>
        <span>0</span>
        <span>+50</span>
      </div>

      <div className="relative h-6 w-full rounded-md border bg-secondary">
        <div
          className="absolute top-0 h-full bg-primary/15"
          style={{
            left: `${toleranceLeftPercent}%`,
            width: `${toleranceWidthPercent}%`,
          }}
        />

        <div className="absolute left-1/2 top-0 h-full w-px bg-foreground/30" />

        <motion.div
          className="absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-sm bg-primary"
          animate={{
            left: `${normalizedNeedlePosition * 100}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 24,
            mass: 0.55,
          }}
        />
      </div>
    </div>
  );
}

export default TunerCentsMeter;
