import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useRouter } from "next/router";
import { useState } from "react";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import { formatNumber } from "~/utils/formatNumber";
import { genreList } from "~/utils/genreList";

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
  totalTabs: number;
}

function GenreCard({ name, color, totalTabs }: GenreCard) {
  const { push, query, pathname } = useRouter();

  const [hoveringOnGenre, setHoveringOnGenre] = useState(false);
  const [mouseDownOnGenre, setMouseDownOnGenre] = useState(false);

  const aboveSmallViewportWidth = useViewportWidthBreakpoint(640);

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
      className={`baseVertFlex group relative h-36 w-full cursor-pointer !items-start !justify-start gap-1 rounded-lg p-4 shadow-md transition-all hover:shadow-lg sm:!justify-center sm:p-6 md:gap-2 ${
        mouseDownOnGenre ? "brightness-75" : "brightness-100"
      }`}
      onMouseEnter={() => setHoveringOnGenre(true)}
      onMouseLeave={() => {
        setHoveringOnGenre(false);
        setMouseDownOnGenre(false);
      }}
      onMouseDown={() => setMouseDownOnGenre(true)}
      onMouseUp={() => setMouseDownOnGenre(false)}
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

      {/* z-index as fallback just incase for weird safari positioning */}
      <p className="z-10 text-lg font-semibold">{name}</p>

      {/* z-index as fallback just incase for weird safari positioning */}
      <p className="z-10">{`${formatNumber(totalTabs)} ${
        totalTabs === 1 ? "tab" : "tabs"
      }`}</p>
    </motion.div>
  );
}
