import Link from "next/link";
import { IoChevronForward } from "react-icons/io5";
import type { ToolDefinition } from "~/data/tools/toolDefinitions";

type ToolCardGridProps = {
  tools: ToolDefinition[];
};

function ToolCardGrid({ tools }: ToolCardGridProps) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {tools.map((tool) => (
        <Link
          key={tool.id}
          prefetch={false}
          href={tool.href}
          className="baseFlex h-full justify-between gap-3 rounded-lg border bg-secondary p-4 shadow-md transition-colors hover:bg-secondary/80"
        >
          <div className="baseVertFlex !items-start gap-2">
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

          <IoChevronForward className="size-5 shrink-0 text-foreground/60" />
        </Link>
      ))}
    </div>
  );
}

export default ToolCardGrid;
