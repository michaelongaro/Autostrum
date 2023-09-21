import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useState } from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { ArtistMetadata } from "~/server/api/routers/artist";
import { api } from "~/utils/api";
import { formatNumber } from "~/utils/formatNumber";
import type { RefetchTab } from "../Tab/Tab";
import { Button } from "../ui/button";
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from "@tanstack/react-query";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0.5,
  },
};

interface LikeAndUnlikeButton {
  id: number;
  createdById: string | null;
  numberOfLikes: number;
  refetchTab?: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
    // @ts-expect-error asdf
  ) => Promise<QueryObserverResult<TData, TError>>;
  refetchCurrentArtist: () => void;
  refetchTabCreator: () => void;
  currentArtist: ArtistMetadata | null | undefined;
  tabCreator: ArtistMetadata | null | undefined;
  customClassName: string;
}

function LikeAndUnlikeButton({
  id,
  createdById,
  numberOfLikes,
  refetchTab,
  refetchCurrentArtist,
  refetchTabCreator,
  currentArtist,
  tabCreator,
  customClassName,
}: LikeAndUnlikeButton) {
  const [showUnregisteredPopover, setShowUnregisteredPopover] = useState(false);
  const [unregisteredPopoverTimeoutId, setUnregisteredPopoverTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  const { asPath } = useRouter();
  const ctx = api.useContext();

  const { mutate: likeTab, isLoading: isLiking } =
    api.like.createLike.useMutation({
      onMutate: async () => {
        // optimistic updates

        await ctx.artist.getByIdOrUsername.cancel();
        ctx.artist.getByIdOrUsername.setData(
          {
            userId: createdById as string,
          },
          (prevArtistData) => {
            if (!prevArtistData) return prevArtistData;
            return {
              ...prevArtistData,
              likedTabIds: [...prevArtistData.likedTabIds, id],
              // if needing to update number of likes received on artist, do it here
            };
          }
        );

        await ctx.tab.getTabById.cancel();
        ctx.tab.getTabById.setData(
          {
            id,
          },
          (prevTabData) => {
            if (!prevTabData) return prevTabData;
            return {
              ...prevTabData,
              numberOfLikes: prevTabData.numberOfLikes + 1,
            };
          }
        );
      },
      onError: (e) => {
        console.error(e);
      },
      onSettled: () => {
        void refetchTab?.();
        void refetchCurrentArtist();
        if (asPath.includes("artist")) void refetchTabCreator();
      },
    });

  const { mutate: unlikeTab, isLoading: isUnliking } =
    api.like.deleteLike.useMutation({
      onMutate: async () => {
        // optimistic updates

        await ctx.artist.getByIdOrUsername.cancel();
        ctx.artist.getByIdOrUsername.setData(
          {
            userId: createdById as string,
          },
          (prevArtistData) => {
            if (!prevArtistData) return prevArtistData;
            return {
              ...prevArtistData,
              likedTabIds: prevArtistData.likedTabIds.filter(
                (tabId) => tabId !== id
              ),
            };
          }
        );

        await ctx.tab.getTabById.cancel();
        ctx.tab.getTabById.setData(
          {
            id,
          },
          (prevTabData) => {
            if (!prevTabData) return prevTabData;
            return {
              ...prevTabData,
              numberOfLikes: prevTabData.numberOfLikes - 1,
            };
          }
        );
      },
      onError: (e) => {
        console.error(e);
      },
      onSettled: () => {
        void refetchTab?.();
        void refetchCurrentArtist();
        if (asPath.includes("artist")) void refetchTabCreator();
      },
    });
  return (
    <Popover
      open={showUnregisteredPopover}
      onOpenChange={(open) => {
        if (open === false) {
          setShowUnregisteredPopover(false);
          if (unregisteredPopoverTimeoutId) {
            clearTimeout(unregisteredPopoverTimeoutId);
            setUnregisteredPopoverTimeoutId(null);
          }
        }
      }}
    >
      <PopoverTrigger
        asChild
        onClick={() => {
          if (!currentArtist) {
            setShowUnregisteredPopover(true);
            setUnregisteredPopoverTimeoutId(
              setTimeout(() => {
                setShowUnregisteredPopover(false);
              }, 2000)
            );
          }
        }}
        className="baseFlex p-0"
      >
        <Button
          variant={"ghost"}
          disabled={isLiking || isUnliking || !tabCreator}
          className={customClassName}
          onClick={() => {
            if (!tabCreator || !currentArtist) return;

            if (currentArtist.likedTabIds.includes(id)) {
              unlikeTab({
                tabId: id,
                artistWhoLikedId: currentArtist.userId,
              });
            } else {
              likeTab({
                tabId: id,
                tabArtistId: createdById!,
                tabArtistUsername: tabCreator.username,
                artistWhoLikedId: currentArtist.userId,
              });
            }
          }}
        >
          <AnimatePresence mode="wait">
            {currentArtist?.likedTabIds?.includes(id) ? (
              <motion.div
                key={`filledHeartLike${id}`}
                variants={opacityAndScaleVariants}
                initial="closed"
                animate="expanded"
                exit="closed"
                transition={{ duration: 0.15 }}
                className="baseFlex !flex-nowrap gap-2"
              >
                <AiFillHeart className="h-6 w-6" />
                <AnimatePresence mode="wait">
                  {numberOfLikes > 0 && (
                    <motion.p
                      key={`filledHeartNumber${id}`}
                      variants={opacityAndScaleVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.15 }}
                      className="text-lg"
                    >
                      {formatNumber(numberOfLikes)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key={`outlineHeartLike${id}`}
                variants={opacityAndScaleVariants}
                initial="closed"
                animate="expanded"
                exit="closed"
                transition={{ duration: 0.15 }}
                className="baseFlex !flex-nowrap gap-2"
              >
                <AiOutlineHeart className="h-6 w-6" />
                <AnimatePresence mode="wait">
                  {numberOfLikes > 0 && (
                    <motion.p
                      key={`outlineHeartNumber${id}`}
                      variants={opacityAndScaleVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.15 }}
                      className="text-lg"
                    >
                      {formatNumber(numberOfLikes)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="baseFlex w-full bg-pink-50 py-2 text-pink-950">
        Only registered users can like tabs.
      </PopoverContent>
    </Popover>
  );
}

export default LikeAndUnlikeButton;
