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

const meta = getVariation("split-narrative")!;

function SplitNarrative() {
  return (
    <VariationShell meta={meta}>
      <section className="w-full max-w-6xl px-4">
        <div className="baseVertFlex gap-10 md:grid md:grid-cols-2 md:items-center md:gap-12">
          <div className="baseVertFlex !items-start gap-5 text-left">
            <div className="hp-enter">
              <BrandMark size="hero" />
            </div>
            <h1 className="hp-enter hp-enter-delay-1 text-2xl font-bold leading-snug md:text-4xl">
              {COPY.tagline}
            </h1>
            <p className="hp-enter hp-enter-delay-2 max-w-md text-sm text-foreground/80 md:text-base">
              Write faster in the editor, then practice with generated guitar
              audio — speed, loop, instrument, and section controls included.
            </p>
            <div className="hp-enter hp-enter-delay-3">
              <CtaGroup />
            </div>
          </div>

          <div className="hp-enter hp-enter-delay-2 relative baseFlex">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-full bg-audio/10 blur-2xl"
            />
            <TabCardMock large showPlay className="relative shadow-lg" />
          </div>
        </div>
      </section>

      <PillarsSection showDetails />
      <HearYourTabsSection />
      <EditorHighlights />
      <DiscoverySection />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default SplitNarrative;
