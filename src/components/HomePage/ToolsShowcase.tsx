import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IoChevronForward, IoEar } from "react-icons/io5";
import { PiMetronome } from "react-icons/pi";
import TuningFork from "~/components/ui/icons/TuningFork";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";

import electronicImage from "public/genreThumbnails/electronic.webp";
import folkImage from "public/genreThumbnails/folk.webp";
import jazzImage from "public/genreThumbnails/jazz.webp";

type ToolCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  image: StaticImageData;
  icon: ReactNode;
};

const toolCards: ToolCard[] = [
  {
    id: "metronome",
    title: "Metronome",
    description:
      "A simple, customizable click to help you lock in your timing and play on beat.",
    href: "/tools/metronome",
    image: electronicImage,
    icon: <PiMetronome className="size-5" />,
  },
  {
    id: "tuner",
    title: "Tuner",
    description:
      "A quick and accurate microphone tuner to get your guitar sounding right.",
    href: "/tuner",
    image: folkImage,
    icon: <TuningFork className="size-4" />,
  },
  {
    id: "note-trainer",
    title: "Note Trainer",
    description:
      "Train your ear to recognize different notes across the fretboard.",
    href: "/tools/note-trainer",
    image: jazzImage,
    icon: <IoEar className="size-[18px]" />,
  },
];

function ToolsShowcase() {
  const { theme } = useTabStore((state) => ({
    theme: state.theme,
  }));

  return (
    <section className="baseVertFlex w-full max-w-[1200px] !items-start gap-6 px-4 md:px-6 lg:px-8">
      <div className="baseFlex w-full !items-baseline !justify-between gap-2">
        <div className="baseVertFlex max-w-2xl gap-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
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
            className={`group relative h-full min-h-[220px] overflow-hidden rounded-xl border shadow-md transition ${
              theme === "light"
                ? "hover:brightness-[0.98] active:brightness-95"
                : "hover:brightness-110 active:brightness-105"
            }`}
          >
            <Image
              src={tool.image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/35" />

            <div className="baseVertFlex relative h-full !items-start !justify-between gap-4 p-5 md:p-6">
              <div className="baseFlex !justify-start gap-2 rounded-md border bg-background/80 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                {tool.icon}
                <span className="text-sm font-semibold">{tool.title}</span>
              </div>

              <div className="baseFlex w-full !items-end !justify-between gap-3">
                <p className="max-w-[85%] text-sm text-foreground/90">
                  {tool.description}
                </p>
                <IoChevronForward className="mb-0.5 size-5 shrink-0 text-foreground/60" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default ToolsShowcase;
