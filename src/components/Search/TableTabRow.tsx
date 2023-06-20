import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { BsFillPlayFill } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { TableCell, TableRow } from "~/components/ui/table";
import type { TabWithLikes } from "~/server/api/routers/tab";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";
import type { Genre } from "@prisma/client";

interface TableTabRow {
  genreId?: number;
  searchQuery?: string;
  sortByRelevance: boolean;
  additionalSortFilter?: "newest" | "oldest" | "leastLiked" | "mostLiked";
}

function TableTabRow(tab: TabWithLikes) {
  const { userId, isLoaded } = useAuth();
  const { push, asPath } = useRouter();

  const genreArray = api.genre.getAll.useQuery();

  const genreObject: Record<number, Genre> = useMemo(() => {
    if (!genreArray.data) return {};

    return genreArray.data.reduce((acc: Record<number, Genre>, genre) => {
      acc[genre.id] = genre;
      return acc;
    }, {});
  }, [genreArray.data]);

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
        if (asPath.includes("user")) void refetchTabCreator();
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
        if (asPath.includes("user")) void refetchTabCreator();
      },
    });

  // may need resize observer to refetch data when more tabs are able to be shown
  // but maybe also is automatically handled by IntersectionObserver hook for main infinite scroll

  // not sure if this is best workaround because I would ideally not have loading spinner at all but:
  // maybe show loading spinner when isLoadingTabResults is true and then as soon as it is false
  // have a manual timeout to show correct amount of cards being rendered with their skeleton loading
  // state and then after that timeout is done, show the actual cards with their data?
  // ^^^ really all depends on how long it takes to fetch data in first place

  return (
    <TableRow className="w-full">
      <TableCell className="min-w-[100px] font-medium">
        <Link href={`/tab/${tab.id}`}>{tab.title}</Link>
      </TableCell>
      <TableCell>
        <div
          style={{
            backgroundColor: genreObject[tab.genreId]?.color,
          }}
          className="rounded-md px-4 py-[0.65rem] lg:px-16"
        >
          {/* need bubbles, prob fine to hardcode them tbh */}
          {genreObject[tab.genreId]?.name}
        </div>
      </TableCell>
      <TableCell className="baseFlex !justify-start gap-2">
        <Button variant={"ghost"} className="px-3 py-1">
          <Link
            href={`/user/${tabCreator?.username ?? ""}`}
            className="baseFlex gap-2"
          >
            <Image
              src={tabCreator?.profileImageUrl ?? ""}
              alt={`${tabCreator?.username ?? "Anonymous"}'s profile image`}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full bg-pink-800"
            ></Image>
            <span>{tabCreator?.username ?? "Anonymous"}</span>
          </Link>
        </Button>
      </TableCell>
      <TableCell>{formatDate(tab.createdAt)}</TableCell>
      <TableCell>
        <Button
          variant={"ghost"}
          size={"sm"}
          className="baseFlex gap-2"
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
            <div className="text-lg">{formatNumber(tab.numberOfLikes)}</div>
          )}
        </Button>
      </TableCell>
      <TableCell className="baseFlex">
        <Button variant={"ghost"} size="sm" className="baseFlex">
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
      </TableCell>
    </TableRow>
  );
}

export default TableTabRow;
