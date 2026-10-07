import Image from "next/image";
import Link from "next/link";
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
import { COPY, FEATURED_CREATORS, GENRES, getVariation } from "../content";
import { genreColors } from "~/utils/genreColors";

import rockImage from "public/genreThumbnails/rock.webp";
import indieImage from "public/genreThumbnails/indie.webp";
import jazzImage from "public/genreThumbnails/jazz.webp";
import popImage from "public/genreThumbnails/pop.webp";
import folkImage from "public/genreThumbnails/folk.webp";
import countryImage from "public/genreThumbnails/country.webp";
import bluesImage from "public/genreThumbnails/blues.webp";
import hipHopImage from "public/genreThumbnails/hiphop.webp";
import electronicImage from "public/genreThumbnails/electronic.webp";
import classicalImage from "public/genreThumbnails/classical.webp";
import metalImage from "public/genreThumbnails/metal.webp";
import miscImage from "public/genreThumbnails/misc.webp";
import type { StaticImageData } from "next/image";

const genreImages: Record<string, StaticImageData> = {
  Rock: rockImage,
  Indie: indieImage,
  Jazz: jazzImage,
  Pop: popImage,
  Folk: folkImage,
  Country: countryImage,
  Blues: bluesImage,
  "Hip-Hop": hipHopImage,
  Electronic: electronicImage,
  Classical: classicalImage,
  Metal: metalImage,
  "Misc.": miscImage,
};

const meta = getVariation("library-explore")!;

function LibraryExplore() {
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
            A growing library with genre browsing, weekly featured creators, and
            tabs you can hear before you commit to learning them.
          </p>
          <div className="hp-enter hp-enter-delay-3">
            <CtaGroup primaryLabel="Explore tabs" secondaryLabel="Create a tab" />
          </div>
        </div>

        <div className="hp-enter hp-enter-delay-2 grid w-full grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3">
          {GENRES.map((genre) => {
            const color = genreColors.get(genre) ?? genreColors.get("Misc.")!;
            const image = genreImages[genre] ?? miscImage;
            return (
              <Link
                key={genre}
                href="/explore"
                className="hp-genre-hover relative overflow-hidden rounded-xl border"
                style={{ backgroundColor: color }}
              >
                <Image
                  src={image}
                  alt=""
                  className="absolute inset-0 size-full object-cover opacity-45 mix-blend-luminosity"
                />
                <div className="relative baseFlex min-h-[64px] px-2 py-3 sm:min-h-[84px]">
                  <span className="text-xs font-semibold text-white drop-shadow sm:text-sm">
                    {genre}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="baseVertFlex w-full max-w-6xl gap-4 px-4">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Weekly featured creators
        </p>
        <div className="grid w-full gap-3 md:grid-cols-3">
          {FEATURED_CREATORS.map((creator) => (
            <Link
              key={creator.username}
              href={`/user/${creator.username}`}
              className="hp-panel hp-card-hover rounded-xl border bg-background/90 p-4 shadow-sm"
            >
              <p className="font-semibold">{creator.username}</p>
              <p className="mt-1 text-sm text-foreground/70">
                {creator.pinned}
              </p>
              <p className="mt-2 text-xs text-foreground/60">
                {creator.tabs} tabs · {creator.views} views · ★ {creator.rating}
              </p>
            </Link>
          ))}
        </div>
        <TabCardMock large showPlay className="mt-4" />
      </section>

      <PillarsSection />
      <HearYourTabsSection />
      <EditorHighlights />
      <ToolsTeaser />
      <ThemesSection />
      <FinalCta />
    </VariationShell>
  );
}

export default LibraryExplore;
