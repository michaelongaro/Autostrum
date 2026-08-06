import Link from "next/link";
import { BsBarChartLine } from "react-icons/bs";
import { GiMusicalScore } from "react-icons/gi";
import { HiOutlineLightBulb } from "react-icons/hi";
import { IoChevronForward } from "react-icons/io5";
import { useTabStore } from "~/stores/TabStore";

const pillars = [
  {
    title: "Compose",
    href: "/create",
    icon: GiMusicalScore,
    blurb: "A keyboard-first tab editor built for speed, not busywork.",
    bullets: [
      "Chord & strumming sections, diagrams, and palm mute",
      "Articulations: hammer-ons, pull-offs, slides, bends, vibrato, mutes",
      "Tunings, capo, BPM, key, difficulty — then publish in one flow",
    ],
  },
  {
    title: "Find inspiration",
    href: "/explore",
    icon: HiOutlineLightBulb,
    blurb:
      "An ever-growing library, from brand-new tabs to weekly featured creators.",
    bullets: [
      "Browse by genre, tuning, capo, and difficulty",
      "Weekly featured users + recently added / most popular",
      "Rate, bookmark, and open any tab straight into playback",
    ],
  },
  {
    title: "Practice",
    href: "/tools",
    icon: BsBarChartLine,
    blurb:
      "Play along with realistic guitar audio — at your tempo, on your terms.",
    bullets: [
      "Soundfonts: nylon, steel, clean & jazz electric",
      "Speed control, loop ranges, count-in, section focus",
      "Scrub, autoscroll, and practice views for chords & strums",
    ],
  },
] as const;

function PillarCards() {
  const { theme } = useTabStore((state) => ({
    theme: state.theme,
  }));

  return (
    <section className="baseVertFlex w-full max-w-[1200px] gap-6 px-4 md:px-6 lg:px-8">
      <div className="grid w-full gap-4 md:grid-cols-3 md:gap-5">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;

          return (
            <Link
              key={pillar.title}
              prefetch={false}
              href={pillar.href}
              className={`baseVertFlex h-full !items-start !justify-between gap-4 rounded-xl border bg-background p-5 shadow-md transition md:p-6 ${
                theme === "light"
                  ? "hover:brightness-[0.98] active:brightness-95"
                  : "hover:brightness-110 active:brightness-105"
              }`}
            >
              <div className="baseVertFlex w-full !items-start gap-3">
                <div className="baseFlex w-full !justify-between gap-3">
                  <div className="baseFlex !justify-start gap-2.5">
                    <div className="shrink-0 rounded-md border bg-secondary-active/50 p-2 shadow-sm">
                      <Icon className="size-7" />
                    </div>
                    <h2 className="text-lg font-bold md:text-xl">
                      {pillar.title}
                    </h2>
                  </div>
                  <IoChevronForward className="size-5 shrink-0 text-foreground/50" />
                </div>

                <p className="text-sm text-foreground/85 md:text-[0.95rem]">
                  {pillar.blurb}
                </p>

                <ul className="baseVertFlex w-full !items-start gap-1.5 text-sm text-foreground/75">
                  {pillar.bullets.map((bullet) => (
                    <li key={bullet} className="baseFlex !items-start !justify-start gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default PillarCards;
