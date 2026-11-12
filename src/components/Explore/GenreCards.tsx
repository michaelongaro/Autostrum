import { routeUrl } from "~/utils/routeUrl";
import { useRouter } from "next/navigation";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

import { api } from "~/utils/api";
import { formatNumber } from "~/utils/formatNumber";
import { genreColors } from "~/utils/genreColors";
import type { StaticImageData } from "next/image";
import Image from "next/image";

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

const genreNameToImageMap: Record<string, StaticImageData> = {
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
  Misc: miscImage,
};

function GenreCards() {
  const { data: genres } = api.genre.getAllWithTotalTabCount.useQuery();

  return (
    <>
      {[...genreColors.entries()].map(([genre, color], index) => (
        <GenreCard
          key={genre}
          name={genre}
          color={color}
          image={genreNameToImageMap[genre] ?? miscImage}
          totalTabs={genres?.get(genre) ?? 0}
          // Load the first row before hydration, including all four desktop columns.
          eager={index < 4}
        />
      ))}
    </>
  );
}

export default GenreCards;

interface GenreCard {
  name: string;
  color: string;
  image: StaticImageData;
  totalTabs: number;
  eager: boolean;
}

function GenreCard({ name, color, image, totalTabs, eager }: GenreCard) {
  const router = useRouter();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const { left, top } = currentTarget.getBoundingClientRect();

    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  function searchForSpecificGenre(genre: string) {
    router.push(routeUrl("/search/filters", { genre }));
  }

  return (
    // Keep the card visible from SSR onward. Nested entrance fades and an idle
    // brightness filter force extra compositing of the filtered images on iOS.
    <div
      tabIndex={0}
      style={{
        backgroundColor: color,
      }}
      className="baseVertFlex group relative isolate h-28 w-full cursor-pointer !items-start !justify-start !overflow-hidden rounded-lg p-4 text-primary-foreground shadow-md transition hover:shadow-lg active:brightness-75 sm:h-36 sm:p-6"
      onMouseMove={handleMouseMove}
      onClick={() => {
        searchForSpecificGenre(name);
      }}
      onKeyDown={(event) =>
        event.key === "Enter" && searchForSpecificGenre(name)
      }
    >
      <motion.div
        key={`genreCardButton${name}Hover`}
        className="pointer-events-none absolute -inset-px hidden rounded-lg opacity-0 transition duration-300 group-hover:opacity-100 lg:block"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              350px circle at ${mouseX}px ${mouseY}px,
              hsla(210, 40%, 95%, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      <div
        style={{
          backgroundColor: color,
        }}
        className="absolute inset-0 z-10 size-full overflow-hidden opacity-40 lg:hidden"
      ></div>

      {/* z-index as fallback just in case for weird safari positioning */}
      <p className="z-10 text-lg font-semibold drop-shadow-xl lg:drop-shadow-none">
        {name}
      </p>

      {/* z-index as fallback just in case for weird safari positioning */}
      <p className="z-10 drop-shadow-xl lg:text-primary-foreground/75 lg:drop-shadow-none">{`${formatNumber(totalTabs)} ${
        totalTabs === 1 ? "tab" : "tabs"
      }`}</p>

      <Image
        src={image}
        loading={eager ? "eager" : "lazy"}
        alt={`${name} genre thumbnail`}
        // had to do some magic number positioning/width/clip-path to reduce visible 1px of bg color on right side of desktop card
        className="pointer-events-none absolute bottom-0 right-[-1px] h-full w-[calc(100%+1px)] max-w-none select-none rounded-lg object-cover object-center opacity-75 grayscale lg:rounded-none lg:[clip-path:polygon(60%_0%,101%_0%,101%_100%,40%_100%)]"
      />
    </div>
  );
}
