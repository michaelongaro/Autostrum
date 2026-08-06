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
import PlaybackFrame from "../shared/mocks/PlaybackFrame";
import { COPY, getVariation } from "../content";

const meta = getVariation("dark-maple-night")!;

function DarkMapleNight() {
  return (
    <VariationShell meta={meta}>
      <section className="w-full max-w-6xl px-4">
        <div className="hp-atmosphere relative overflow-hidden rounded-xl border border-[#c2a499]/35 bg-[#1c1917] px-5 py-12 sm:px-10 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 top-8 size-56 rounded-full bg-[#a18072]/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-10 size-40 rounded-full bg-audio/10 blur-3xl"
          />

          <div className="relative baseVertFlex gap-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
            <div className="baseVertFlex !items-start gap-5 text-left text-[#e8d8cf]">
              <div className="hp-enter">
                <BrandMark size="hero" tone="cream" />
              </div>
              <h1 className="hp-enter hp-enter-delay-1 text-2xl font-bold md:text-4xl">
                {COPY.tagline}
              </h1>
              <p className="hp-enter hp-enter-delay-2 text-sm text-[#e8d8cf]/80 md:text-base">
                A warm night session for composing and practicing — maple bronze
                accents, soft cream type, and playback green when it&apos;s time
                to hear the riff.
              </p>
              <div className="hp-enter hp-enter-delay-3">
                <CtaGroup />
              </div>
            </div>
            <div className="hp-enter hp-enter-delay-2">
              <PlaybackFrame className="w-full border-[#c2a499]/40 shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      <PillarsSection layout="cards" />
      <HearYourTabsSection />
      <EditorHighlights />
      <DiscoverySection />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default DarkMapleNight;
