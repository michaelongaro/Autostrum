import Link from "next/link";
import { type ReactNode } from "react";
import HeaderLogo from "~/components/Header/HeaderLogo";
import {
  MiniTabCard,
  SAMPLE_TABS,
  TabStaff,
  VariationFrame,
} from "~/components/HomepageVariations/shared";

function TourRow({
  eyebrow,
  title,
  desc,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <section className="grid w-full max-w-5xl grid-cols-1 items-center gap-8 lg:grid-cols-2">
      <div className={`baseVertFlex !items-start gap-4 ${flip ? "lg:order-2" : ""}`}>
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          {eyebrow}
        </span>
        <h2 className="text-balance text-3xl font-bold md:text-4xl">{title}</h2>
        <p className="max-w-md text-pretty text-lg text-foreground/70">{desc}</p>
      </div>
      <div className={flip ? "lg:order-1" : ""}>{visual}</div>
    </section>
  );
}

function ProductTour() {
  return (
    <VariationFrame id={3} title="Product Tour">
      <div className="baseVertFlex z-10 w-full gap-20 px-4 py-16 md:py-24">
        {/* Intro */}
        <div className="baseVertFlex max-w-2xl gap-4 text-center">
          <HeaderLogo width={240} height={42} />
          <h1 className="text-balance text-3xl font-bold md:text-4xl">
            Everything you need to write, share, and practice tabs
          </h1>
          <p className="text-pretty text-lg text-foreground/70">
            Follow a riff from first note to full performance.
          </p>
        </div>

        {/* Compose */}
        <TourRow
          eyebrow="01 — Compose"
          title="An editor that keeps up with you"
          desc="Add strumming patterns, chords, and section repeats without leaving the keyboard. Autostrum handles the repetitive parts."
          visual={
            <div className="baseVertFlex w-full gap-3 rounded-2xl border bg-background p-4 shadow-lg">
              <div className="baseFlex w-full flex-wrap !justify-start gap-2 text-xs">
                <span className="rounded-md border bg-secondary/60 px-2 py-1">Note length · Eighth</span>
                <span className="rounded-md border bg-secondary/60 px-2 py-1">95 BPM</span>
                <span className="rounded-md border bg-secondary/60 px-2 py-1">Repetitions ×2</span>
                <span className="rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground">PM Editor</span>
              </div>
              <TabStaff seed={21} measures={5} showLabels height={130} className="w-full" />
            </div>
          }
        />

        {/* Find inspiration */}
        <TourRow
          flip
          eyebrow="02 — Find inspiration"
          title="Discover new talent every week"
          desc="Browse an ever-growing library, follow featured artists, and bookmark the tabs you want to come back to."
          visual={
            <div className="grid grid-cols-2 gap-3">
              {SAMPLE_TABS.slice(0, 4).map((tab) => (
                <MiniTabCard key={tab.id} tab={tab} />
              ))}
            </div>
          }
        />

        {/* Practice */}
        <TourRow
          eyebrow="03 — Practice"
          title="Play along, your way"
          desc="Change the instrument, slow things down, loop a tough section, and let autoscroll keep your place."
          visual={
            <div className="baseVertFlex w-full gap-4 rounded-2xl border bg-background p-5 shadow-lg">
              <TabStaff seed={41} measures={4} showLabels height={110} className="w-full" />
              <div className="baseFlex w-full flex-wrap gap-3 rounded-full border bg-secondary/40 px-4 py-3">
                <span className="rounded-md border bg-background px-2 py-1 text-xs">Acoustic guitar · Steel</span>
                <span className="rounded-md border bg-background px-2 py-1 text-xs">Speed 1×</span>
                <span className="rounded-md border bg-background px-2 py-1 text-xs">Autoscroll</span>
                <div className="baseFlex ml-auto gap-2">
                  <button type="button" className="baseFlex size-8 rounded-full bg-audio text-audio-foreground">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                  <span className="text-xs text-foreground/60">0:00 / 2:44</span>
                </div>
              </div>
            </div>
          }
        />

        {/* CTA */}
        <div className="baseVertFlex gap-4 rounded-2xl border bg-secondary/40 px-8 py-10 text-center">
          <h2 className="text-balance text-2xl font-bold md:text-3xl">
            Ready to hear your riff come to life?
          </h2>
          <Link href="/create" className="baseFlex rounded-lg bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-primaryButton transition-transform hover:scale-[1.02]">
            Start composing
          </Link>
        </div>
      </div>
    </VariationFrame>
  );
}

export default ProductTour;
