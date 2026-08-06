import PlaybackFrame from "./mocks/PlaybackFrame";
import { cn } from "~/utils/cn";

type HearYourTabsSectionProps = {
  className?: string;
  reverse?: boolean;
};

function HearYourTabsSection({
  className,
  reverse = false,
}: HearYourTabsSectionProps) {
  return (
    <section
      className={cn(
        "baseVertFlex w-full max-w-6xl gap-8 px-4 md:grid md:grid-cols-2 md:items-center md:gap-12",
        reverse && "md:[direction:rtl] md:[&>*]:[direction:ltr]",
        className,
      )}
    >
      <div className="baseVertFlex !items-start gap-3 md:max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          Hear your tabs
        </p>
        <h2 className="text-2xl font-bold md:text-3xl">
          Practice with realistic generated audio
        </h2>
        <p className="text-sm text-foreground/80 md:text-base">
          No uploads. No YouTube embeds. Autostrum turns your tab into playable
          guitar audio — change speed, loop a range, swap instruments, and
          practice section by section.
        </p>
      </div>
      <PlaybackFrame className="w-full" />
    </section>
  );
}

export default HearYourTabsSection;
