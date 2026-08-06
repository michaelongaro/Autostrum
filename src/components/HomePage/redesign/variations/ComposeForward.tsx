import BrandMark from "../shared/BrandMark";
import CtaGroup from "../shared/CtaGroup";
import DiscoverySection from "../shared/DiscoverySection";
import FinalCta from "../shared/FinalCta";
import HearYourTabsSection from "../shared/HearYourTabsSection";
import PillarsSection from "../shared/PillarsSection";
import ThemesSection from "../shared/ThemesSection";
import ToolsTeaser from "../shared/ToolsTeaser";
import VariationShell from "../shared/VariationShell";
import EditorFrame from "../shared/mocks/EditorFrame";
import { COPY, EDITOR_SHORTCUTS, getVariation } from "../content";

const meta = getVariation("compose-forward")!;

function ComposeForward() {
  return (
    <VariationShell meta={meta}>
      <section className="baseVertFlex w-full max-w-6xl gap-8 px-4">
        <div className="baseVertFlex max-w-3xl gap-5 text-center">
          <div className="hp-enter">
            <BrandMark size="hero" />
          </div>
          <h1 className="hp-enter hp-enter-delay-1 text-2xl font-bold md:text-4xl">
            {COPY.tagline}
          </h1>
          <p className="hp-enter hp-enter-delay-2 text-sm text-foreground/80 md:text-base">
            Creators first: strumming patterns, chord diagrams, section
            progression, and keyboard shortcuts that cut the repetitive work.
          </p>
          <div className="hp-enter hp-enter-delay-3">
            <CtaGroup primaryLabel="Start composing" />
          </div>
        </div>

        <div className="hp-enter hp-enter-delay-2 grid w-full gap-4 lg:grid-cols-[1fr_280px]">
          <EditorFrame className="w-full" />
          <div className="hp-panel baseVertFlex !items-stretch gap-2 rounded-xl border bg-background/90 p-4 shadow-sm">
            <p className="mb-1 text-sm font-semibold">Shortcuts</p>
            {EDITOR_SHORTCUTS.map((s) => (
              <div
                key={s.keys}
                className="baseFlex !justify-between gap-2 rounded-md border bg-secondary/40 px-2.5 py-2 text-sm"
              >
                <kbd className="!bg-background !text-foreground">{s.keys}</kbd>
                <span className="text-foreground/75">{s.label}</span>
              </div>
            ))}
            <div className="mt-2 rounded-md border border-dashed p-3 text-left text-xs text-foreground/70">
              <p className="font-semibold text-foreground">Chord · Em</p>
              <p className="mt-1">Diagram + named chord recall while you write.</p>
            </div>
          </div>
        </div>
      </section>

      <PillarsSection layout="cards" showDetails />
      <HearYourTabsSection />
      <DiscoverySection />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default ComposeForward;
