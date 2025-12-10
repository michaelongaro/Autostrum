import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { IoBookmarkOutline, IoBookmark } from "react-icons/io5";
import type { UserMetadata } from "~/server/api/routers/user";
import { api } from "~/utils/api";
import { Button } from "./button";
import type { InfiniteQueryParams } from "~/server/api/routers/search";

interface BookmarkToggle {
  tabId: number;
  createdByUserId: string | null;
  currentUser: UserMetadata | null | undefined;
  customClassName: string;
  showText: boolean;
  isBookmarked: boolean;
  infiniteQueryParams?: InfiniteQueryParams;
}

function BookmarkToggle({
  tabId,
  createdByUserId,
  currentUser,
  customClassName,
  showText,
  isBookmarked,
  infiniteQueryParams,
}: BookmarkToggle) {
  const [showUnregisteredPopover, setShowUnregisteredPopover] = useState(false);
  const [unregisteredPopoverTimeoutId, setUnregisteredPopoverTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  const { asPath } = useRouter();
  const ctx = api.useUtils();

  const { mutate: addBookmark } = api.bookmark.addBookmark.useMutation({
    onMutate: async () => {
      if (!currentUser) return;

      // --- optimistic updates ---

      // modify the dynamic metadata for the tab
      await ctx.tab.getRatingBookmarkAndViewCount.cancel();
      ctx.tab.getRatingBookmarkAndViewCount.setData(tabId, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          bookmarked: true,
        };
      });

      // add to the current user's bookmarked tab ids
      await ctx.user.getById.cancel(currentUser.userId);
      ctx.user.getById.setData(
        currentUser.userId,

        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            bookmarkedTabIds: [...prev.bookmarkedTabIds, tabId],
          };
        },
      );

      // increment the totalBookmarksReceived for the tab creator if they exist
      if (createdByUserId) {
        await ctx.user.getById.cancel(createdByUserId);
        ctx.user.getById.setData(createdByUserId, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalBookmarksReceived: prev.totalBookmarksReceived + 1,
          };
        });
      }
    },
    onError: (e) => {
      console.error(e);
    },
  });

  const { mutate: removeBookmark } = api.bookmark.removeBookmark.useMutation({
    onMutate: async () => {
      if (!currentUser) return;

      // --- optimistic updates ---

      // modify the dynamic metadata for the tab
      await ctx.tab.getRatingBookmarkAndViewCount.cancel();
      ctx.tab.getRatingBookmarkAndViewCount.setData(tabId, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          bookmarked: false,
        };
      });

      // remove from the current user's bookmarked tab ids
      await ctx.user.getById.cancel(currentUser.userId);
      ctx.user.getById.setData(currentUser.userId, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          bookmarkedTabIds: prev.bookmarkedTabIds.filter(
            (bookmarkedTabId) => bookmarkedTabId !== tabId,
          ),
        };
      });

      // decrement the totalBookmarksReceived for the tab creator if they exist
      if (createdByUserId) {
        await ctx.user.getById.cancel(createdByUserId);
        ctx.user.getById.setData(createdByUserId, (prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            totalBookmarksReceived: prev.totalBookmarksReceived - 1,
          };
        });
      }

      // if on bookmarks page, remove the tab from the infinite query
      if (asPath.includes("/profile/bookmarks") && infiniteQueryParams) {
        await ctx.search.getInfiniteTabsBySearchQuery.cancel();
        ctx.search.getInfiniteTabsBySearchQuery.setInfiniteData(
          infiniteQueryParams,
          (prevTabData) => {
            if (!prevTabData) return { pages: [], pageParams: [] };

            const modifiedPages = prevTabData.pages.map((page) => {
              // filter out the tab that was unbookmarked
              const modifiedTabs = page.data.tabs.filter((tab) => {
                return tab.id !== tabId;
              });

              return {
                ...page,
                data: {
                  ...page.data,
                  tabs: modifiedTabs,
                },
              };
            });
            return {
              pages: modifiedPages,
              pageParams: prevTabData.pageParams,
            };
          },
        );
      }
    },
    onError: (e) => {
      console.error(e);
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
          if (!currentUser) {
            setShowUnregisteredPopover(true);
            setUnregisteredPopoverTimeoutId(
              setTimeout(() => {
                setShowUnregisteredPopover(false);
              }, 2000),
            );
          }
        }}
        className="baseFlex p-0"
      >
        <Button
          aria-label={"Bookmark toggle"}
          variant={"secondary"}
          className={customClassName}
          onClick={() => {
            if (!currentUser || !createdByUserId) return;

            if (isBookmarked) {
              removeBookmark({
                tabId,
                tabCreatorUserId: createdByUserId,
              });
            } else {
              addBookmark({
                tabId,
                tabCreatorUserId: createdByUserId,
              });
            }
          }}
        >
          <AnimatePresence mode="wait">
            {isBookmarked ? (
              <motion.div
                key={`bookmark${tabId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="baseFlex gap-2"
              >
                <IoBookmark className="h-[18px] w-[18px] md:h-5 md:w-5" />
                {showText && "Bookmarked"}
              </motion.div>
            ) : (
              <motion.div
                key={`bookmarkOutline${tabId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="baseFlex gap-2"
              >
                <IoBookmarkOutline className="h-[18px] w-[18px] md:h-5 md:w-5" />
                {showText && "Bookmark"}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="baseFlex w-full py-2 text-sm md:text-base">
        Only registered users can bookmark tabs.
      </PopoverContent>
    </Popover>
  );
}

export default BookmarkToggle;
