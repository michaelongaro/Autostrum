import { BsBarChartLine } from "react-icons/bs";
import { GiMusicalScore } from "react-icons/gi";
import { HiOutlineLightBulb } from "react-icons/hi";
import { COPY } from "../content";
import { cn } from "~/utils/cn";

const PILLARS = [
  {
    key: "compose",
    icon: GiMusicalScore,
    title: COPY.compose.title,
    body: COPY.compose.body,
  },
  {
    key: "inspiration",
    icon: HiOutlineLightBulb,
    title: COPY.inspiration.title,
    body: COPY.inspiration.body,
  },
  {
    key: "practice",
    icon: BsBarChartLine,
    title: COPY.practice.title,
    body: COPY.practice.body,
  },
] as const;

type PillarsSectionProps = {
  className?: string;
  layout?: "row" | "stack" | "cards";
  showDetails?: boolean;
};

function PillarsSection({
  className,
  layout = "row",
  showDetails = false,
}: PillarsSectionProps) {
  return (
    <section className={cn("w-full max-w-6xl px-4", className)}>
      <div
        className={cn(
          "gap-6 md:gap-8",
          layout === "stack" && "flex flex-col items-stretch",
          layout === "row" &&
            "flex flex-col items-stretch md:grid md:grid-cols-3 md:items-start",
          layout === "cards" &&
            "flex flex-col items-stretch md:grid md:grid-cols-3",
        )}
      >
        {PILLARS.map(({ key, icon: Icon, title, body }) => (
          <div
            key={key}
            className={cn(
              "flex flex-col items-start gap-3",
              layout === "cards" &&
                "hp-panel hp-card-hover rounded-xl border bg-background/90 p-5 shadow-sm",
            )}
          >
            <div className="baseFlex gap-3">
              <div className="rounded-md border bg-secondary-active/50 p-2 shadow-sm">
                <Icon className="size-7" />
              </div>
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <p className="text-sm text-foreground/85 md:text-base">{body}</p>
            {showDetails && (
              <ul className="mt-1 space-y-1 text-sm text-foreground/70">
                {(key === "compose"
                  ? COPY.compose.details
                  : key === "inspiration"
                    ? COPY.inspiration.details
                    : COPY.practice.details
                )
                  .slice(0, 4)
                  .map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default PillarsSection;
