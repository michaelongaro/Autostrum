import React, { useState } from "react";
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

function GridTabCard(tab: Tab) {
  const { userId, isLoaded } = useAuth();
  const { push } = useRouter();

  const { data: currentUser } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: userId!,
    },
    {
      enabled: isLoaded,
    }
  );

  const { data: tabCreator } = api.artist.getByIdOrUsername.useQuery({
    userId: tab.createdById,
  });

  const [numberOfLikes, setNumberOfLikes] = useState(tab.numberOfLikes);

  const ctx = api.useContext();
  const { mutate: toggleLike, isLoading: isLiking } =
    api.tab.toggleTabLikeStatus.useMutation({
      onMutate: async (data) => {
        // optimistic update

        // have check to also optimistically update tabCreator query if on their page (if "user" is in url)

        // updating number of likes on tab (hmm do you want to do this normally or just update
        // store value...)
        setNumberOfLikes(numberOfLikes + (data.likingTab ? 1 : -1));

        await ctx.tab.getTabById.cancel();
        ctx.tab.getTabById.setData(
          {
            id: tab.id,
          },
          (prevTabData) => {
            if (!prevTabData) return prevTabData;
            return {
              ...prevTabData,
              numberOfLikes: data.likingTab
                ? prevTabData.numberOfLikes + 1
                : prevTabData.numberOfLikes - 1,
            };
          }
        );

        await ctx.user.getUserByIdOrUsername.cancel();
        ctx.user.getUserByIdOrUsername.setData(
          {
            id: userId!,
          },
          (prevUserData) => {
            if (!prevUserData || !prevUserData.publicMetadata.likedTabIds)
              return prevUserData;
            return {
              ...prevUserData,
              publicMetadata: {
                ...prevUserData.publicMetadata,
                likedTabIds: data.likingTab
                  ? [...prevUserData.publicMetadata.likedTabIds, tab.id]
                  : prevUserData.publicMetadata.likedTabIds.filter(
                      (tabId) => tabId !== tab.id
                    ),
              },
            };
          }
        );
      },
      onError: (e) => {
        console.error(e);
      },
      onSettled: () => {
        void ctx.tab.getTabById.invalidate();
      },
    });

  return (
    <motion.div
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
            <div className="baseFlex gap-1 p-2">
              {tabCreator ? (
                <Image
                  src={tabCreator.profileImageUrl}
                  alt={`${tabCreator.username!}'s profile picture`}
                  width={36}
                  height={36}
                  className="cursor-pointer rounded-full"
                  onClick={() => {
                    void push(`/artist/${tabCreator.username!}`);
                  }}
                />
              ) : (
                <Skeleton className="h-12 w-12 rounded-full" />
              )}

              <div className="baseVertFlex">
                {tabCreator ? (
                  <Button variant={"ghost"} className="h-6 px-2">
                    <Link href={`/artist/${tabCreator.username!}`}>
                      {tabCreator.username}
                    </Link>
                  </Button>
                ) : (
                  <Skeleton className="h-4 w-12" />
                )}
              </div>
            </div>
            {/* <Separator /> */}
            <div className="baseFlex w-full !justify-evenly rounded-tl-md border-l-[1px] border-t-[1px]">
              {/* likes button */}
              <Button
                variant={"ghost"}
                size={"sm"}
                className="baseFlex h-8 w-1/2 gap-2 rounded-r-none rounded-bl-none rounded-tl-sm border-r-[1px]"
                onClick={() => {
                  if (!currentUser) return;

                  toggleLike({
                    likingTab: !currentUser.publicMetadata.likedTabIds.includes(
                      tab.id
                    ),
                    tabOwnerId: tab.createdById,
                    tabId: tab.id,
                    userId: userId ?? "",
                  });
                }}
              >
                {currentUser?.publicMetadata?.likedTabIds?.includes(tab.id) ? (
                  <AiFillHeart className="h-6 w-6 text-pink-800" />
                ) : (
                  <AiOutlineHeart className="h-6 w-6" />
                )}
                {numberOfLikes > 0 && (
                  <div className="text-lg">{formatNumber(numberOfLikes)}</div>
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
}

export default GridTabCard;
