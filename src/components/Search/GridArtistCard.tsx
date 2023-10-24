import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/router";
import { forwardRef, useState } from "react";
import { AiFillHeart } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { ArtistMetadata } from "~/server/api/routers/artist";
import { formatNumber } from "~/utils/formatNumber";

const GridArtistCard = forwardRef<HTMLDivElement, ArtistMetadata>(
  (artist, ref) => {
    const { push } = useRouter();

    const [profileImageLoaded, setProfileImageLoaded] = useState(false);

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

    return (
      <motion.div
        ref={ref}
        key={`${artist.id}gridArtistCard`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="lightestGlassmorphic baseVertFlex group relative w-full cursor-pointer gap-6 rounded-md border-2 px-2 py-4 !shadow-none !shadow-none shadow-sm brightness-100 transition-all hover:shadow-lg active:brightness-90"
        onMouseMove={handleMouseMove}
        onClick={() => {
          void push(`/artist/${artist.username}`);
        }}
      >
        <motion.div
          key={`hoveredRadialGradient${artist.id}`}
          className="pointer-events-none absolute -inset-px z-[-1] rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
            radial-gradient(
              250px circle at ${mouseX}px ${mouseY}px,
              hsla(335, 78%, 42%, 0.15),
              transparent 80%
            )
          `,
          }}
        />
        <div className="baseVertFlex gap-3">
          <div className="grid grid-cols-1 grid-rows-1">
            <Image
              src={artist.profileImageUrl ?? ""}
              alt={`${artist.username ?? "Anonymous"}'s profile image`}
              width={250}
              height={250}
              onLoadingComplete={() => {
                setProfileImageLoaded(true);
              }}
              style={{
                opacity: profileImageLoaded ? 1 : 0,
                width: "4rem",
                height: "4rem",
              }}
              className="col-start-1 col-end-2 row-start-1 row-end-2 h-16 w-16 rounded-full object-cover object-center transition-opacity"
            />
            <div
              style={{
                opacity: !profileImageLoaded ? 1 : 0,
                zIndex: !profileImageLoaded ? 1 : -1,
              }}
              className={`col-start-1 col-end-2 row-start-1 row-end-2 h-16 w-16 rounded-full bg-pink-300 transition-opacity
                              ${!profileImageLoaded ? "animate-pulse" : ""}
                            `}
            ></div>
          </div>

          <p className="text-xl font-semibold">{artist.username}</p>
        </div>

        <div className="baseFlex gap-4">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="baseFlex gap-2">
                  <GiMusicalScore className="h-6 w-6" />
                  {formatNumber(artist.numberOfTabs)}
                </div>
              </TooltipTrigger>
              <TooltipContent side={"bottom"}>
                <p>Total tabs</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="baseFlex gap-2">
                  <AiFillHeart className="h-6 w-6 text-pink-800" />
                  {formatNumber(artist.numberOfLikes)}
                </div>
              </TooltipTrigger>
              <TooltipContent side={"bottom"}>
                <p>Total likes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
    );
  }
);

GridArtistCard.displayName = "GridArtistCard";

export default GridArtistCard;
