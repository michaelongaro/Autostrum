import Link from "next/link";
import { toolDefinitions } from "~/data/tools/toolDefinitions";
import { Button } from "~/components/ui/button";
import { cn } from "~/utils/cn";

type ToolsTeaserProps = {
  className?: string;
  featured?: boolean;
};

function ToolsTeaser({ className, featured = false }: ToolsTeaserProps) {
  return (
    <section
      className={cn(
        "baseVertFlex w-full max-w-6xl gap-6 px-4",
        featured &&
          "hp-panel rounded-xl border bg-background/90 py-8 shadow-sm sm:py-10",
        className,
      )}
    >
      <div className="baseVertFlex max-w-2xl gap-3 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">
          Free practice tools, built in
        </h2>
        <p className="text-sm text-foreground/80 md:text-base">
          Warmups, scales, chord trainer, metronome, note trainer, and a guitar
          tuner — ready before you open a tab.
        </p>
      </div>

      <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {toolDefinitions.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className="hp-card-hover rounded-xl border bg-background/80 p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {tool.category}
            </p>
            <p className="mt-1 font-semibold">{tool.title}</p>
            <p className="mt-1 text-sm text-foreground/70">{tool.description}</p>
          </Link>
        ))}
      </div>

      <Button asChild variant="secondary">
        <Link href="/tools">Open tools hub</Link>
      </Button>
    </section>
  );
}

export default ToolsTeaser;
