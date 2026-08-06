import Link from "next/link";
import { FaBookmark, FaStar } from "react-icons/fa6";
import BrandMark from "../shared/BrandMark";
import CtaGroup from "../shared/CtaGroup";
import EditorHighlights from "../shared/EditorHighlights";
import FinalCta from "../shared/FinalCta";
import HearYourTabsSection from "../shared/HearYourTabsSection";
import PillarsSection from "../shared/PillarsSection";
import ThemesSection from "../shared/ThemesSection";
import ToolsTeaser from "../shared/ToolsTeaser";
import VariationShell from "../shared/VariationShell";
import TabCardMock from "../shared/mocks/TabCardMock";
import { COPY, FEATURED_CREATORS, getVariation } from "../content";

const meta = getVariation("social-creator")!;

function SocialCreator() {
  return (
    <VariationShell meta={meta}>
      <section className="w-full max-w-6xl px-4">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col items-start gap-5 text-left">
            <div className="hp-enter">
              <BrandMark size="hero" />
            </div>
            <h1 className="hp-enter hp-enter-delay-1 text-2xl font-bold md:text-4xl">
              {COPY.tagline}
            </h1>
            <p className="hp-enter hp-enter-delay-2 text-sm text-foreground/80 md:text-base">
              Publish tabs with auto-generated previews, earn ratings and
              bookmarks, pin your best work, and earn a spot in weekly featured —
              product-truthful discovery, not influencer fluff.
            </p>
            <div className="hp-enter hp-enter-delay-2 baseFlex flex-wrap !justify-start gap-2 text-sm">
              <span className="baseFlex gap-1.5 rounded-md border bg-background px-3 py-1.5">
                <FaStar className="text-primary" /> Rate 1–5
              </span>
              <span className="baseFlex gap-1.5 rounded-md border bg-background px-3 py-1.5">
                <FaBookmark className="text-primary" /> Bookmarks
              </span>
              <span className="rounded-md border bg-background px-3 py-1.5">
                Public tab URLs
              </span>
              <span className="rounded-md border bg-background px-3 py-1.5">
                Profile stats
              </span>
            </div>
            <div className="hp-enter hp-enter-delay-3">
              <CtaGroup primaryLabel="Create a tab" />
            </div>
          </div>

          <div className="hp-enter hp-enter-delay-2 flex w-full min-w-0 flex-col items-stretch gap-3">
            {FEATURED_CREATORS.map((creator, index) => (
              <Link
                key={creator.username}
                href={`/user/${creator.username}`}
                className="hp-panel hp-card-hover rounded-xl border bg-background/90 p-4 shadow-sm"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="baseFlex !justify-between">
                  <div>
                    <p className="font-semibold">{creator.username}</p>
                    <p className="text-sm text-foreground/70">
                      Pinned · {creator.pinned}
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                      Featured
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-foreground/65">
                  <div>
                    <p className="font-semibold text-foreground">{creator.tabs}</p>
                    <p>tabs</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{creator.views}</p>
                    <p>views</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{creator.rating}</p>
                    <p>rating</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {creator.bookmarks}
                    </p>
                    <p>saves</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="baseVertFlex gap-3 px-4">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Share how it&apos;s supposed to sound
        </p>
        <TabCardMock large showPlay />
      </section>

      <PillarsSection layout="cards" />
      <HearYourTabsSection />
      <EditorHighlights />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default SocialCreator;
