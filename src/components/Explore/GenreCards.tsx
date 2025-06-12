import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useRouter } from "next/router";
import { useState } from "react";
import { api } from "~/utils/api";
import { formatNumber } from "~/utils/formatNumber";
import { genreList } from "~/utils/genreList";

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
import Image from "next/image";

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

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

function GenreCards() {
  const { data: genres, isLoading: genresAreLoading } =
    api.genre.getAllWithTotalTabCount.useQuery();

  return (
    <>
      {[...genreList.entries()].map(([genre, color]) => (
        <GenreCard
          key={genre}
          name={genre}
          color={color}
          image={genreNameToImageMap[genre] ?? miscImage}
          totalTabs={genres?.get(genre) ?? 0}
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
}

function GenreCard({ name, color, image, totalTabs }: GenreCard) {
  const { push, query } = useRouter();

  const [darkenCard, setDarkenCard] = useState(false);

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
    void push({
      pathname: "search/filters",
      query: {
        ...query,
        genre,
      },
    });
  }

  return (
    <motion.div
      key={`genreCardButton${name}`}
      tabIndex={0}
      variants={opacityVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{
        duration: 0.15,
      }}
      style={{
        backgroundColor: color,
      }}
      className={`baseVertFlex group relative h-36 w-full cursor-pointer !items-start !justify-start gap-1 overflow-hidden rounded-lg p-4 shadow-md transition-all hover:shadow-lg sm:!justify-center sm:p-6 md:gap-2 ${
        darkenCard ? "brightness-75" : "brightness-100"
      }`}
      onPointerLeave={() => {
        setDarkenCard(false);
      }}
      onPointerDown={() => setDarkenCard(true)}
      onPointerUp={() => setDarkenCard(false)}
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
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
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

      {/* bg-gradient-to-b from-transparent to-black/50 */}
      <div
        style={{
          backgroundColor: color,
        }}
        className="absolute inset-0 z-10 size-full opacity-50 blur-sm lg:hidden"
      ></div>

      {/* z-index as fallback just incase for weird safari positioning */}
      <p className="z-10 text-lg font-semibold">{name}</p>

      {/* z-index as fallback just incase for weird safari positioning */}
      <p className="z-10">{`${formatNumber(totalTabs)} ${
        totalTabs === 1 ? "tab" : "tabs"
      }`}</p>

      <Image
        src={image}
        alt={`${name} genre thumbnail`}
        className="pointer-events-none absolute bottom-0 right-0 size-full select-none rounded-lg object-cover object-center opacity-75 grayscale lg:rounded-l-none lg:[clip-path:polygon(60%_0%,100%_0%,100%_100%,40%_100%)]"
      />
    </motion.div>
  );
}
//[clip-path:polygon(0%_0%,50%_0%,50%_100%,0%_100%)]
