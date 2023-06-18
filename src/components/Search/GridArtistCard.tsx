import { useAuth } from "@clerk/nextjs";
import type { User } from "@clerk/nextjs/dist/api";
import { Label } from "@radix-ui/react-label";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { AiFillHeart } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

function GridArtistCard(artist: User) {
  const { userId, isLoaded } = useAuth();
  const { push } = useRouter();

  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  return (
    <motion.div
      key={artist.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className="lightestGlassmorphic baseVertFlex w-full rounded-md border-2"
    >
      <div className="baseVertFlex gap-2">
        {profileImageLoaded ? (
          <Image
            onLoadingComplete={() => {
              setProfileImageLoaded(true);
            }}
            src={artist.profileImageUrl}
            alt={`${artist.username!}'s profile picture`}
            width={64}
            height={64}
            className="cursor-pointer rounded-full"
            onClick={() => {
              void push(`/artist/${artist.username!}`);
            }}
          />
        ) : (
          <Skeleton className="h-16 w-16 rounded-full" />
        )}

        <Button variant={"ghost"} className="text-xl font-semibold">
          <Link href={`/artist/${artist.username!}`}>{artist.username}</Link>
        </Button>

        <p className="text-sm italic text-pink-50/90">{`joined ${formatDate(
          artist.createdAt
        )}`}</p>
      </div>

      <div className="baseFlex gap-4">
        <div className="baseVertFlex gap-1.5">
          <Label className="text-sm">Tabs</Label>
          <div className="baseFlex gap-2">
            <GiMusicalScore className="h-6 w-6" />
            {/* major tangent you gotta explore: are you fetching + splicing in the publicMetadata from
                  prisma when you are fetching the artists? if not do so also for sorting we have to do that 
                  manually, although shouldn't be more than just basically .sort() function */}
            {formatNumber(artist.publicMetadata.totalTabsCreated)}
          </div>
        </div>

        <div className="baseVertFlex gap-1.5">
          <Label className="text-sm">Likes</Label>
          <div className="baseFlex gap-2">
            <AiFillHeart className="h-6 w-6 text-pink-800" />
            {/* major tangent you gotta explore: are you fetching + splicing in the publicMetadata from
                  prisma when you are fetching the artists? if not do so also for sorting we have to do that 
                  manually, although shouldn't be more than just basically .sort() function */}
            {formatNumber(artist.publicMetadata.totalLikesReceived)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default GridArtistCard;
