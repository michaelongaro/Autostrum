import BrandMark from "./BrandMark";
import CtaGroup from "./CtaGroup";
import { COPY } from "../content";
import { cn } from "~/utils/cn";

type FinalCtaProps = {
  className?: string;
};

function FinalCta({ className }: FinalCtaProps) {
  return (
    <section
      className={cn(
        "hp-panel baseVertFlex w-full max-w-3xl gap-5 rounded-xl border bg-background/90 px-6 py-10 text-center shadow-sm sm:px-10",
        className,
      )}
    >
      <BrandMark size="section" />
      <p className="max-w-xl text-base text-foreground/85 md:text-lg">
        {COPY.tagline}
      </p>
      <CtaGroup showSecondary={false} />
    </section>
  );
}

export default FinalCta;
