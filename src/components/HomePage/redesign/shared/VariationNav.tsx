import Link from "next/link";
import { VARIATIONS, type VariationMeta } from "../content";
import { cn } from "~/utils/cn";

type VariationNavProps = {
  current: VariationMeta;
  className?: string;
};

function VariationNav({ current, className }: VariationNavProps) {
  const prev = VARIATIONS.find((v) => v.number === current.number - 1);
  const next = VARIATIONS.find((v) => v.number === current.number + 1);

  return (
    <div
      className={cn(
        "sticky top-[4.25rem] z-30 w-full border-b bg-background/90 px-3 py-2 backdrop-blur-sm md:top-[4.5rem]",
        className,
      )}
    >
      <div className="baseFlex mx-auto w-full max-w-6xl !justify-between gap-2 text-xs sm:text-sm">
        <Link
          href="/homepage-redesign"
          className="shrink-0 font-medium text-primary hover:underline"
        >
          All variations
        </Link>
        <div className="baseFlex min-w-0 gap-2">
          <span className="truncate font-semibold">
            {current.number}/10 · {current.shortTitle}
          </span>
        </div>
        <div className="baseFlex shrink-0 gap-2">
          {prev ? (
            <Link
              href={`/homepage-redesign/${prev.slug}`}
              className="text-foreground/70 hover:text-foreground"
            >
              Prev
            </Link>
          ) : (
            <span className="text-foreground/30">Prev</span>
          )}
          <span className="text-foreground/30">|</span>
          {next ? (
            <Link
              href={`/homepage-redesign/${next.slug}`}
              className="text-foreground/70 hover:text-foreground"
            >
              Next
            </Link>
          ) : (
            <span className="text-foreground/30">Next</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default VariationNav;
