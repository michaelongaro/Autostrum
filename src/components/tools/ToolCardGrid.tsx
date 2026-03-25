import Link from "next/link";
import type { ReactNode } from "react";
import { GiMusicalScore } from "react-icons/gi";
import { IoChevronForward, IoEar, IoMusicalNotes } from "react-icons/io5";
import { PiMetronome } from "react-icons/pi";
import TuningFork from "~/components/ui/icons/TuningFork";
import type { ToolDefinition } from "~/data/tools/toolDefinitions";

const toolIcons: Record<string, ReactNode> = {
  warmups: <IoMusicalNotes className="size-5" />,
  scales: <GiMusicalScore className="size-6" />,
  metronome: <PiMetronome className="size-6" />,
  "note-trainer": <IoEar className="size-5" />,
  tuner: <TuningFork className="size-5" />,
};

type ToolCardGridProps = {
  tools: ToolDefinition[];
};

function ToolCardGrid({ tools }: ToolCardGridProps) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      {tools.map((tool) => (
        <Link
          key={tool.id}
          prefetch={false}
          href={tool.href}
          className="baseFlex h-full justify-between gap-3 rounded-lg border bg-secondary p-4 shadow-md transition-colors hover:bg-secondary/80"
        >
          <div className="baseVertFlex !items-start gap-2">
            <div className="baseFlex gap-2">
              {toolIcons[tool.id] && (
                <span className="text-foreground">{toolIcons[tool.id]}</span>
              )}
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
