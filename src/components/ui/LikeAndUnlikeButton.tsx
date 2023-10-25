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
import { Button } from "../ui/button";
import type { InfiniteQueryParams } from "../Search/SearchResults";

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
  refetchCurrentArtist: () => void;
  refetchTabCreator: () => void;
  refetchTab?: () => void;
  currentArtist: ArtistMetadata | null | undefined;
  tabCreator: ArtistMetadata | null | undefined;
  customClassName: string;
  infiniteQueryParams?: InfiniteQueryParams;
}

function LikeAndUnlikeButton({
  id,
  createdById,
  numberOfLikes,
  refetchCurrentArtist,
  refetchTabCreator,
  refetchTab,
  currentArtist,
  tabCreator,
  customClassName,
  infiniteQueryParams,
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

        // this logic isn't perfect, but it does the job pretty well as far as I can tell
        // in an optimistic sense

        if (infiniteQueryParams) {
          await ctx.tab.getInfiniteTabsBySearchQuery.cancel();
          ctx.tab.getInfiniteTabsBySearchQuery.setInfiniteData(
            infiniteQueryParams,
            (prevTabData) => {
              if (!prevTabData) return { pages: [], pageParams: [] };

              const modifiedPages = prevTabData.pages.map((page) => {
                // Deep copy of page and its nested data
                const modifiedPage = {
                  ...page,
                  data: {
                    ...page.data,
                    tabs: page.data.tabs.map((tab) => ({ ...tab })),
                  },
                };

                modifiedPage.data.tabs = modifiedPage.data.tabs.map((tab) => {
                  if (tab.id !== id) return tab;
                  return { ...tab, numberOfLikes: tab.numberOfLikes + 1 };
                });

                if (
                  infiniteQueryParams.sortBy === "mostLiked" ||
                  infiniteQueryParams.sortBy === "leastLiked"
                ) {
                  modifiedPage.data.tabs.sort((a, b) => {
                    return infiniteQueryParams.sortBy === "mostLiked"
                      ? b.numberOfLikes - a.numberOfLikes
                      : a.numberOfLikes - b.numberOfLikes;
                  });
                }

                return modifiedPage;
              });

              return {
                pages: modifiedPages,
                pageParams: prevTabData.pageParams,
              };
            }
          );
        }
      },
      onError: (e) => {
        console.error(e);
      },
      onSettled: () => {
        if (refetchTab) void refetchTab();
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

        // this logic isn't perfect, but it does the job pretty well as far as I can tell
        // in an optimistic sense

        if (infiniteQueryParams) {
          await ctx.tab.getInfiniteTabsBySearchQuery.cancel();
          ctx.tab.getInfiniteTabsBySearchQuery.setInfiniteData(
            infiniteQueryParams,
            (prevTabData) => {
              if (!prevTabData) return { pages: [], pageParams: [] };

              const modifiedPages = prevTabData.pages.map((page) => {
                // Deep copy of page and its nested data
                const modifiedPage = {
                  ...page,
                  data: {
                    ...page.data,
                    tabs: page.data.tabs.map((tab) => ({ ...tab })),
                  },
                };

                modifiedPage.data.tabs = modifiedPage.data.tabs.map((tab) => {
                  if (tab.id !== id) return tab;
                  return { ...tab, numberOfLikes: tab.numberOfLikes - 1 };
                });

                if (
                  infiniteQueryParams.sortBy === "mostLiked" ||
                  infiniteQueryParams.sortBy === "leastLiked"
                ) {
                  modifiedPage.data.tabs.sort((a, b) => {
                    return infiniteQueryParams.sortBy === "mostLiked"
                      ? b.numberOfLikes - a.numberOfLikes
                      : a.numberOfLikes - b.numberOfLikes;
                  });
                }

                return modifiedPage;
              });

              return {
                pages: modifiedPages,
                pageParams: prevTabData.pageParams,
              };
            }
          );
        }
      },
      onError: (e) => {
        console.error(e);
      },
      onSettled: () => {
        if (refetchTab) void refetchTab();
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
          aria-label={"Like/Unlike"}
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
                <AiFillHeart className="h-[18px] w-[18px] md:h-5 md:w-5" />
                <AnimatePresence mode="wait">
                  {numberOfLikes > 0 && (
                    <motion.p
                      key={`filledHeartNumber${id}`}
                      variants={opacityAndScaleVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.15 }}
                      className="text-sm md:text-lg"
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
                <AiOutlineHeart className="h-[18px] w-[18px] md:h-5 md:w-5" />
                <AnimatePresence mode="wait">
                  {numberOfLikes > 0 && (
                    <motion.p
                      key={`outlineHeartNumber${id}`}
                      variants={opacityAndScaleVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.15 }}
                      className="text-sm md:text-lg"
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
      <PopoverContent className="baseFlex w-full bg-pink-50 py-2 text-sm text-pink-950 md:text-base">
        Only registered users can like tabs.
      </PopoverContent>
    </Popover>
  );
}

export default LikeAndUnlikeButton;
