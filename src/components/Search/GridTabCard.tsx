import React, { forwardRef, useState } from "react";
import type { Tab } from "@prisma/client";
import { motion } from "framer-motion";
import { Separator } from "../ui/separator";
import Image from "next/image";
import { api } from "~/utils/api";
import { Skeleton } from "../ui/skeleton";
import formatDate from "~/utils/formatDate";
import { Button } from "../ui/button";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { formatNumber } from "~/utils/formatNumber";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { useRouter } from "next/router";
import type { TabWithLikes } from "~/server/api/routers/tab";

const GridTabCard = forwardRef<HTMLDivElement, TabWithLikes>((tab, ref) => {
  const { userId, isLoaded } = useAuth();
  const { push, asPath } = useRouter();

  const { data: currentArtist, refetch: refetchCurrentArtist } =
    api.artist.getByIdOrUsername.useQuery(
      {
        userId: userId!,
      },
      {
        enabled: isLoaded,
      }
    );

  const { data: tabCreator, refetch: refetchTabCreator } =
    api.artist.getByIdOrUsername.useQuery({
      userId: tab.createdById,
    });
  const ctx = api.useContext();

  const { mutate: likeTab, isLoading: isLiking } =
    api.like.createLike.useMutation({
      onMutate: async (data) => {
        //
      },
      onError: (e) => {
        console.error(e);
      },
      onSettled: () => {
        void ctx.tab.getTabById.invalidate();

        // void ctx.artist.getByIdOrUsername.invalidate();
        void refetchCurrentArtist();
        if (asPath.includes("artist")) void refetchTabCreator();
      },
    });

  const { mutate: unlikeTab, isLoading: isUnliking } =
    api.like.deleteLike.useMutation({
      onMutate: async (data) => {
        //
      },
      onError: (e) => {
        console.error(e);
      },
      onSettled: () => {
        void ctx.tab.getTabById.invalidate();

        // void ctx.artist.getByIdOrUsername.invalidate();
        void refetchCurrentArtist();
        if (asPath.includes("artist")) void refetchTabCreator();
      },
    });

  return (
    <motion.div
      ref={ref} // hoping that if ref is undefined it will just ignore it
      key={tab.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      // lightestGlassmorphic
      className="lightestGlassmorphic baseVertFlex w-full rounded-md border-2"
    >
      {/* preview */}
      <div className="h-36 w-full rounded-t-md bg-gray-200"></div>

      <Separator />

      <div className="baseFlex w-full !justify-between">
        {/* title & date */}
        <div className="baseVertFlex !items-start p-2">
          <p className="text-lg font-semibold">{tab.title}</p>
          <p className="text-sm text-pink-50/90">{formatDate(tab.createdAt)}</p>
        </div>

        {/* user link & likes & play button */}
        <div className="baseFlex gap-2">
          <div className="baseVertFlex gap-1">
            <div className="baseFlex gap-2 px-2 py-1">
              <Button variant={"ghost"} className="px-3 py-1">
                <Link
                  href={`/artist/${tabCreator?.username ?? ""}`}
                  className="baseFlex gap-2"
                >
                  <Image
                    src={tabCreator?.profileImageUrl ?? ""}
                    alt={`${
                      tabCreator?.username ?? "Anonymous"
                    }'s profile image`}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full bg-pink-800"
                  ></Image>
                  <span>{tabCreator?.username ?? "Anonymous"}</span>
                </Link>
              </Button>
            </div>
            <div className="baseFlex w-full !justify-evenly rounded-tl-md border-l-2 border-t-2">
              {/* likes button */}
              <Button
                variant={"ghost"}
                size={"sm"}
                className="baseFlex h-8 w-1/2 gap-2 rounded-r-none rounded-bl-none rounded-tl-sm border-r-[1px]"
                onClick={() => {
                  if (!tabCreator || !currentArtist) return;

                  if (currentArtist.likedTabIds.includes(tab.id)) {
                    unlikeTab({
                      tabId: tab.id,
                      artistWhoLikedId: currentArtist.userId,
                    });
                  } else {
                    likeTab({
                      tabId: tab.id,
                      tabArtistId: tab.createdById,
                      tabArtistUsername: tabCreator.username,
                      artistWhoLikedId: currentArtist.userId,
                    });
                  }
                }}
              >
                {currentArtist?.likedTabIds.includes(tab.id) ? (
                  <AiFillHeart className="h-6 w-6 text-pink-800" />
                ) : (
                  <AiOutlineHeart className="h-6 w-6" />
                )}
                {tab.numberOfLikes > 0 && (
                  <div className="text-lg">
                    {formatNumber(tab.numberOfLikes)}
                  </div>
                )}
              </Button>
              {/* play/pause button */}
              <Button
                variant={"ghost"}
                size="sm"
                className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px]"
              >
                {/* prob use framer to crossfade */}

                {/* write rudimentary playing state in store that has shape of {
                      isPlaying: boolean,
                      tabId: string
                      secondsElapsed?: number
                      currentChord?: number
                    } */}

                {/* just for now to fill design */}
                <BsFillPlayFill className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

GridTabCard.displayName = "GridTabCard";

export default GridTabCard;
