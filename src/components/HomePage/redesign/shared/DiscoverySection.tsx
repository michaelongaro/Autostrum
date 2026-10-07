import Image from "next/image";
import Link from "next/link";
import { FEATURED_CREATORS, GENRES } from "../content";
import TabCardMock from "./mocks/TabCardMock";
import { genreColors } from "~/utils/genreColors";
import { cn } from "~/utils/cn";

import rockImage from "public/genreThumbnails/rock.webp";
import indieImage from "public/genreThumbnails/indie.webp";
import popImage from "public/genreThumbnails/pop.webp";
import hipHopImage from "public/genreThumbnails/hiphop.webp";
import jazzImage from "public/genreThumbnails/jazz.webp";
import bluesImage from "public/genreThumbnails/blues.webp";
import classicalImage from "public/genreThumbnails/classical.webp";
import countryImage from "public/genreThumbnails/country.webp";
import metalImage from "public/genreThumbnails/metal.webp";
import folkImage from "public/genreThumbnails/folk.webp";
import electronicImage from "public/genreThumbnails/electronic.webp";
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

type DiscoverySectionProps = {
  className?: string;
  showGenres?: boolean;
  showCreators?: boolean;
  showSampleTab?: boolean;
  genreLimit?: number;
};

function DiscoverySection({
  className,
  showGenres = true,
  showCreators = true,
  showSampleTab = true,
  genreLimit = 8,
}: DiscoverySectionProps) {
  return (
    <section
      className={cn("baseVertFlex w-full max-w-6xl gap-10 px-4", className)}
    >
      <div className="baseVertFlex max-w-2xl gap-3 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">
          Discover tabs worth practicing
        </h2>
        <p className="text-sm text-foreground/80 md:text-base">
          Browse genres, follow weekly featured creators, and open tabs with
          theme-aware screenshot previews — then hear how they&apos;re supposed
          to sound.
        </p>
      </div>

      {showCreators && (
        <div className="w-full">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Weekly featured
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_CREATORS.map((creator) => (
              <Link
                key={creator.username}
                href={`/user/${creator.username}`}
                className="hp-panel hp-card-hover rounded-xl border bg-background/90 p-4 shadow-sm"
              >
                <div className="baseFlex !justify-between gap-2">
                  <p className="font-semibold">{creator.username}</p>
                  <span className="text-xs text-foreground/55">
                    ★ {creator.rating}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground/70">
                  Pinned: {creator.pinned}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                  <span>{creator.tabs} tabs</span>
                  <span>{creator.views} views</span>
                  <span>{creator.bookmarks} bookmarks</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showGenres && (
        <div className="w-full">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Genres
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
            {GENRES.slice(0, genreLimit).map((genre) => {
              const color = genreColors.get(genre) ?? genreColors.get("Misc.")!;
              const image = genreImages[genre] ?? miscImage;
              return (
                <Link
                  key={genre}
                  href={`/explore`}
                  className="hp-genre-hover relative overflow-hidden rounded-xl border"
                  style={{ backgroundColor: color }}
                >
                  <Image
                    src={image}
                    alt=""
                    className="absolute inset-0 size-full object-cover mix-blend-luminosity opacity-50"
                  />
                  <div className="relative baseFlex min-h-[72px] px-3 py-4">
                    <span className="text-sm font-semibold text-white drop-shadow">
                      {genre}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {showSampleTab && (
        <div className="baseVertFlex gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Try this tab
          </p>
          <TabCardMock large showPlay />
        </div>
      )}
    </section>
  );
}

export default DiscoverySection;
