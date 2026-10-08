import Link from "next/link";
import type { ReactNode } from "react";
import { IoArrowForward } from "react-icons/io5";
import {
  MetronomeIllustration,
  NoteTrainerIllustration,
  TunerIllustration,
} from "~/components/HomePage/ToolIllustrations";
import { Button } from "~/components/ui/button";

type ToolCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  illustration: ReactNode;
};

const toolCards: ToolCard[] = [
  {
    id: "metronome",
    title: "Metronome",
    description:
      "A simple, customizable click to help you lock in your timing and play on beat.",
    href: "/tools/metronome",
    category: "Timing",
    illustration: <MetronomeIllustration />,
  },
  {
    id: "tuner",
    title: "Tuner",
    description:
      "A quick and accurate microphone tuner to get your guitar sounding right.",
    href: "/tuner",
    category: "Pitch",
    illustration: <TunerIllustration />,
  },
  {
    id: "note-trainer",
    title: "Note Trainer",
    description:
      "Train your ear to recognize different notes across the fretboard.",
    href: "/tools/note-trainer",
    category: "Ear training",
    illustration: <NoteTrainerIllustration />,
  },
];

function ToolsShowcase() {
  return (
    <section
      aria-labelledby="practice-tools-heading"
      className="baseVertFlex w-full max-w-[1200px] !items-start gap-6 px-4 md:px-6 lg:px-8"
    >
      <div className="baseFlex w-full !items-baseline !justify-between gap-2">
        <div className="baseVertFlex max-w-2xl gap-2">
          <h2
            id="practice-tools-heading"
            className="text-2xl font-bold tracking-tight md:text-3xl"
          >
            Practice tools
          </h2>
        </div>

        <Button
          variant="link"
          asChild
          className="!h-auto !px-0 text-foreground"
        >
          <Link prefetch={false} href="/tools">
            View all tools
          </Link>
        </Button>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-3">
        {toolCards.map((tool) => (
          <Link
            key={tool.id}
            prefetch={false}
            href={tool.href}
            aria-labelledby={`${tool.id}-title`}
            aria-describedby={`${tool.id}-description`}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <div className="flex h-44 items-center justify-center border-b border-foreground/10 bg-secondary/60 p-3">
              <div className="h-full w-full max-w-[320px] motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:-translate-y-1">
                {tool.illustration}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-start gap-2 p-5 md:p-6">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/60">
                {tool.category}
              </span>
              <div className="flex w-full items-center justify-between gap-3">
                <h3
                  id={`${tool.id}-title`}
                  className="text-xl font-semibold tracking-tight"
                >
                  {tool.title}
                </h3>
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/70 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground"
                >
                  <IoArrowForward className="size-4" />
                </span>
              </div>
              <p
                id={`${tool.id}-description`}
                className="text-sm leading-relaxed text-foreground/75"
              >
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default ToolsShowcase;
