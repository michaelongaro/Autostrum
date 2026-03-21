import Link from "next/link";
import { Button } from "~/components/ui/button";
import type {
  ToolCategory,
  ToolDefinition,
} from "~/data/tools/toolDefinitions";

type ToolCardGridProps = {
  category: ToolCategory;
  tools: ToolDefinition[];
};

function ToolCardGrid({ category, tools }: ToolCardGridProps) {
  return (
    <section className="baseVertFlex w-full items-start gap-3">
      <h2 className="text-xl font-semibold">{category}</h2>

      <div className="grid w-full gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="baseVertFlex h-full items-start gap-3 rounded-lg border bg-secondary p-4 shadow-md"
          >
            <div className="baseVertFlex w-full items-start gap-2">
              <div className="baseFlex gap-2">
                <p className="text-base font-semibold">{tool.title}</p>

                {tool.status === "in-progress" && (
                  <span className="rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium">
                    In progress
                  </span>
                )}
              </div>

              <p className="text-sm text-foreground/80">{tool.description}</p>
            </div>

            <Button variant="secondary" asChild className="!h-9 px-4 text-sm">
              <Link prefetch={false} href={tool.href}>
                Open
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ToolCardGrid;
