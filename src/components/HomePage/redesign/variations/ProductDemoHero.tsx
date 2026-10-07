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

const meta = getVariation("product-demo")!;

function ProductDemoHero() {
  return (
    <VariationShell meta={meta}>
      <section className="w-full max-w-6xl px-4">
        <div className="hp-atmosphere overflow-hidden rounded-xl border shadow-md">
          <div className="relative grid gap-8 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-10">
            <div className="baseVertFlex gap-5 text-center lg:!items-start lg:text-left">
              <div className="hp-enter">
                <BrandMark size="hero" />
              </div>
              <h1 className="hp-enter hp-enter-delay-1 max-w-xl text-2xl font-bold leading-snug md:text-4xl">
                {COPY.tagline}
              </h1>
              <p className="hp-enter hp-enter-delay-2 max-w-lg text-sm text-foreground/80 md:text-base">
                {COPY.support}
              </p>
              <div className="hp-enter hp-enter-delay-3">
                <CtaGroup />
              </div>
            </div>
            <div className="hp-enter hp-enter-delay-2">
              <EditorFrame className="w-full border-primary/30 shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      <PillarsSection />
      <HearYourTabsSection />
      <EditorHighlights showFrame={false} />
      <DiscoverySection genreLimit={8} />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default ProductDemoHero;
