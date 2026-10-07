import BrandMark from "../shared/BrandMark";
import CtaGroup from "../shared/CtaGroup";
import DiscoverySection from "../shared/DiscoverySection";
import EditorHighlights from "../shared/EditorHighlights";
import FinalCta from "../shared/FinalCta";
import HearYourTabsSection from "../shared/HearYourTabsSection";
import PillarsSection from "../shared/PillarsSection";
import ThemesSection from "../shared/ThemesSection";
import ToolsTeaser from "../shared/ToolsTeaser";
import VariationShell from "../shared/VariationShell";
import EditorFrame from "../shared/mocks/EditorFrame";
import { COPY, getVariation } from "../content";

const meta = getVariation("minimal-utility")!;

function MinimalUtility() {
  return (
    <VariationShell meta={meta}>
      <section className="baseVertFlex min-h-[70dvh] w-full max-w-3xl gap-8 px-4 text-center">
        <div className="hp-enter">
          <BrandMark size="hero" />
        </div>
        <h1 className="hp-enter hp-enter-delay-1 text-xl font-semibold leading-relaxed text-foreground/90 md:text-2xl">
          {COPY.tagline}
        </h1>
        <div className="hp-enter hp-enter-delay-2">
          <CtaGroup showSecondary={false} />
        </div>
        <div className="hp-enter hp-enter-delay-3 w-full pt-2">
          <EditorFrame compact className="mx-auto w-full max-w-xl shadow-sm" />
        </div>
      </section>

      <PillarsSection layout="stack" className="max-w-2xl opacity-95" />
      <HearYourTabsSection className="max-w-4xl" />
      <EditorHighlights className="max-w-4xl" showFrame={false} />
      <DiscoverySection className="max-w-4xl" genreLimit={6} />
      <ToolsTeaser className="max-w-4xl" />
      <ThemesSection />
      <FinalCta className="max-w-xl border-none bg-transparent shadow-none" />
    </VariationShell>
  );
}

export default MinimalUtility;
