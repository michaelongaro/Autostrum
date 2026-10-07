import Image from "next/image";
import GuitarImage from "public/explore/header.jpg";
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

const meta = getVariation("atmospheric-studio")!;

function AtmosphericStudio() {
  return (
    <VariationShell meta={meta}>
      <section className="relative min-h-[78dvh] w-full overflow-hidden">
        <Image
          src={GuitarImage}
          alt=""
          fill
          priority
          className="object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        <div className="hp-atmosphere absolute inset-0 opacity-80" />

        <div className="relative baseVertFlex mx-auto min-h-[78dvh] max-w-3xl gap-6 px-4 py-16 text-center">
          <div className="hp-enter">
            <BrandMark size="hero" />
          </div>
          <h1 className="hp-enter hp-enter-delay-1 text-3xl font-bold leading-tight md:text-5xl">
            {COPY.tagline}
          </h1>
          <p className="hp-enter hp-enter-delay-2 max-w-xl text-base text-foreground/85 md:text-lg">
            {COPY.support}
          </p>
          <div className="hp-enter hp-enter-delay-3">
            <CtaGroup layout="stack" />
          </div>
          <div className="hp-enter hp-enter-delay-4 mt-4 opacity-90">
            <TabCardMock showPlay className="mx-auto shadow-lg" />
          </div>
        </div>
      </section>

      <PillarsSection layout="cards" />
      <HearYourTabsSection reverse />
      <EditorHighlights />
      <DiscoverySection showSampleTab={false} />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default AtmosphericStudio;
