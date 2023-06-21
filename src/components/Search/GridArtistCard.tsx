import { useAuth } from "@clerk/nextjs";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState, forwardRef } from "react";
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
import { Skeleton } from "../ui/skeleton";

const GridArtistCard = forwardRef<HTMLDivElement, ArtistMetadata>(
  (artist, ref) => {
    const { userId, isLoaded } = useAuth();
    const { push } = useRouter();

    const [profileImageLoaded, setProfileImageLoaded] = useState(false);
    // maybe try to make a custom Button variant for this eventually
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);

    // try https://buildui.com/recipes/spotlight
    // then move on to checking responsiveness + list view
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
        key={artist.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25 }}
        className={`lightestGlassmorphic baseVertFlex group relative w-full cursor-pointer gap-2 rounded-md border-2 p-2
                  ${isHovered ? "shadow-lg" : "shadow-sm"} 
                  ${isActive ? "brightness-90" : "brightness-100"}
                  transition-all`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsActive(false);
        }}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        onMouseMove={handleMouseMove}
        onClick={() => {
          void push(`/artist/${artist.username}`);
        }}
      >
        <motion.div
          className="pointer-events-none absolute -inset-px z-[-1] rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
            radial-gradient(
              350px circle at ${mouseX}px ${mouseY}px,
              hsla(335, 78%, 42%, 0.15),
              transparent 80%
            )
          `,
          }}
        />
        <div className="baseVertFlex gap-2">
          <Image
            onLoadingComplete={() => {
              setProfileImageLoaded(true);
            }}
            src={artist.profileImageUrl}
            alt={`${artist.username}'s profile picture`}
            width={64}
            height={64}
            style={{
              opacity: profileImageLoaded ? 1 : 0,
            }}
            className="rounded-full"
          />

          {!profileImageLoaded && (
            <Skeleton className="h-16 w-16 rounded-full" />
          )}

          <p className="text-xl font-semibold">{artist.username}</p>
        </div>

        <div className="baseFlex gap-4">
          <TooltipProvider delayDuration={300}>
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

          <TooltipProvider delayDuration={300}>
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
