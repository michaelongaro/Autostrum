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
import TabCardMock from "../shared/mocks/TabCardMock";
import { COPY, getVariation } from "../content";

const meta = getVariation("toolkit-showcase")!;

function ToolkitShowcase() {
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
            {COPY.support}
          </p>
          <div className="hp-enter hp-enter-delay-3">
            <CtaGroup />
          </div>
        </div>
        <div className="hp-enter hp-enter-delay-4">
          <TabCardMock showPlay large />
        </div>
      </section>

      <ToolsTeaser featured className="hp-enter" />

      <PillarsSection />
      <HearYourTabsSection />
      <EditorHighlights />
      <DiscoverySection showSampleTab={false} />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default ToolkitShowcase;
