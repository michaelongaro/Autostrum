import { usePathname } from "next/navigation";

import { useMediaQuery } from "@react-hookz/web";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { IoBookmarkOutline, IoBookmark } from "react-icons/io5";
import type { UserMetadata } from "~/server/api/routers/user";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
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
  disabled?: boolean;
}

function BookmarkToggle({
  tabId,
  createdByUserId,
  currentUser,
  customClassName,
  showText,
  isBookmarked,
  infiniteQueryParams,
  disabled = false,
}: BookmarkToggle) {
  const [showUnregisteredPopover, setShowUnregisteredPopover] = useState(false);
  const [unregisteredPopoverTimeoutId, setUnregisteredPopoverTimeoutId] =
    useState<NodeJS.Timeout | null>(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animateFill = isBookmarked && !reduceMotion;

  const asPath = usePathname();
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
        render={
          <Button
            aria-label={"Bookmark toggle"}
            aria-pressed={isBookmarked}
            disabled={disabled}
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
            <span aria-hidden="true" className="grid place-items-center">
              {showText && (
                // Reserve room for the full label, the desktop icon, and the gap.
                <span className="invisible col-start-1 row-start-1 hidden whitespace-nowrap pl-7 md:block">
                  Bookmark<span className="inline-block">ed</span>
                </span>
              )}
              <span className="baseFlex col-start-1 row-start-1 gap-2">
                <motion.span
                  className="relative size-[18px] shrink-0 md:size-5"
                  initial={false}
                  animate={{
                    scale: animateFill ? [null, 0.95, 1.11, 0.99, 1] : 1,
                  }}
                  transition={
                    animateFill
                      ? {
                          duration: 0.42,
                          times: [0, 0.16, 0.57, 0.82, 1],
                          ease: "easeOut",
                        }
                      : { duration: reduceMotion ? 0 : 0.15, ease: "easeOut" }
                  }
                >
                  <IoBookmarkOutline className="absolute inset-0 size-full" />
                  <span
                    className="absolute inset-0 transition-[clip-path] duration-300 motion-reduce:transition-none"
                    style={{
                      clipPath: isBookmarked
                        ? "inset(0 0 0 0)"
                        : "inset(0 0 100% 0)",
                      transitionTimingFunction: "ease-in-out",
                    }}
                  >
                    <IoBookmark className="size-full" />
                  </span>
                </motion.span>
                {showText && (
                  <span className="hidden whitespace-nowrap md:block">
                    Bookmark
                    <span
                      className={cn(
                        "motion-safe:ease-out inline-grid motion-safe:transition-[grid-template-columns] motion-safe:duration-200",
                        isBookmarked ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
                      )}
                    >
                      <span
                        className={cn(
                          "motion-safe:ease-out min-w-0 text-start motion-safe:transition-[opacity,transform,filter] motion-safe:duration-200",
                          isBookmarked
                            ? "opacity-100"
                            : "opacity-0 motion-safe:translate-x-1 motion-safe:blur-[1.5px]",
                        )}
                      >
                        ed
                      </span>
                    </span>
                  </span>
                )}
              </span>
            </span>
          </Button>
        }
      />
      <PopoverContent className="baseFlex w-full py-2 text-sm md:text-base">
        You must be logged in to bookmark a tab.
      </PopoverContent>
    </Popover>
  );
}

export default BookmarkToggle;
