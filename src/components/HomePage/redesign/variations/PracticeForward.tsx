import BrandMark from "../shared/BrandMark";
import CtaGroup from "../shared/CtaGroup";
import DiscoverySection from "../shared/DiscoverySection";
import EditorHighlights from "../shared/EditorHighlights";
import FinalCta from "../shared/FinalCta";
import PillarsSection from "../shared/PillarsSection";
import ThemesSection from "../shared/ThemesSection";
import ToolsTeaser from "../shared/ToolsTeaser";
import VariationShell from "../shared/VariationShell";
import PlaybackFrame from "../shared/mocks/PlaybackFrame";
import { COPY, getVariation } from "../content";

const meta = getVariation("practice-forward")!;

const PRACTICE_POINTS = [
  "Speed 0.25×–1.5×",
  "Loop any range",
  "Count-in before you start",
  "Nylon · Steel · Electric",
  "Section-by-section practice",
  "Wake lock stays on",
] as const;

function PracticeForward() {
  return (
    <VariationShell meta={meta}>
      <section className="w-full max-w-6xl px-4">
        <div className="hp-atmosphere rounded-xl border px-5 py-10 sm:px-8 sm:py-12">
          <div className="baseVertFlex gap-8 lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-10">
            <div className="baseVertFlex !items-start gap-5 text-left">
              <div className="hp-enter">
                <BrandMark size="hero" />
              </div>
              <h1 className="hp-enter hp-enter-delay-1 text-2xl font-bold md:text-4xl">
                {COPY.tagline}
              </h1>
              <p className="hp-enter hp-enter-delay-2 text-sm text-foreground/80 md:text-base">
                Open any tab and practice with realistic generated guitar audio —
                not a recording upload, not a video embed.
              </p>
              <ul className="hp-enter hp-enter-delay-2 grid w-full grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {PRACTICE_POINTS.map((point) => (
                  <li
                    key={point}
                    className="baseFlex !justify-start gap-2 rounded-md border bg-background/70 px-3 py-2"
                  >
                    <span className="size-1.5 rounded-full bg-audio" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="hp-enter hp-enter-delay-3">
                <CtaGroup
                  primaryLabel="Explore tabs"
                  secondaryLabel="Create a tab"
                />
              </div>
            </div>
            <div className="hp-enter hp-enter-delay-2 w-full">
              <PlaybackFrame className="w-full shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      <PillarsSection />
      <EditorHighlights />
      <DiscoverySection />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default PracticeForward;
