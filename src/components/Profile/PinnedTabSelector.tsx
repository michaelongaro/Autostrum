import { api } from "~/utils/api";
import { motion } from "framer-motion";
import { useState, type Dispatch, type SetStateAction } from "react";
import { TbPinned } from "react-icons/tb";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerPortal,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import { Separator } from "~/components/ui/separator";
import PinnedTabList from "~/components/Profile/PinnedTabList";
import { IoClose } from "react-icons/io5";
import type { LocalSettings } from "~/pages/profile/settings";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PinnedTabSelector {
  userId: string;
  localPinnedTabId: number | null;
  setLocalPinnedTabId: Dispatch<SetStateAction<number | null>>;
  setShowPinnedTabModal: Dispatch<SetStateAction<boolean>>;
  localSettings: LocalSettings | null;
}

function PinnedTabSelector({
  userId,
  localPinnedTabId,
  setLocalPinnedTabId,
  setShowPinnedTabModal,
  localSettings,
}: PinnedTabSelector) {
  const { setMobileHeaderModal } = useTabStore((state) => ({
    setMobileHeaderModal: state.setMobileHeaderModal,
  }));

  const { data: pinnedTabTitle, isFetching: isFetchingPinnedTabTitle } =
    api.tab.getTitle.useQuery(localPinnedTabId ?? -1, {
      enabled: localPinnedTabId !== null,
    });

  const [drawerIsOpen, setDrawerIsOpen] = useState(false);
  // const [renderPinnedTabList, setRenderPinnedTabList] = useState(false);

  const isAboveLgViewport = useViewportWidthBreakpoint(1024);

  return (
    <div className="baseVertFlex w-full !items-start gap-2 lg:!flex-row lg:!justify-between">
      <span className="text-xl font-medium lg:text-2xl">Pinned tab</span>

      <div className="baseFlex w-full !justify-between gap-4 lg:w-auto lg:!justify-center">
        <div className="baseFlex gap-2">
          <motion.div layout>
            <TbPinned className="size-4 sm:size-5" />
          </motion.div>

          <motion.div
            key={
              localSettings && (!isFetchingPinnedTabTitle || !localPinnedTabId)
                ? "loadedPinnedTab"
                : "loadingPinnedTab"
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="baseFlex"
          >
            {localSettings ? (
              <span
                className={`text-lg ${pinnedTabTitle ? "" : "italic text-opacity-50"}`}
              >
                {pinnedTabTitle ?? "None"}
              </span>
            ) : (
              <div className="pulseAnimation bg-skeleton h-5 w-28 rounded-md"></div>
            )}
          </motion.div>
        </div>

        <div className="baseFlex gap-4">
          {localPinnedTabId !== -1 && (
            <Button
              variant={"text"}
              disabled={!localSettings}
              className="!size-8 shrink-0 !p-0"
              onClick={() => {
                setLocalPinnedTabId(-1);
              }}
            >
              <IoClose className="size-5" />
            </Button>
          )}

          {isAboveLgViewport ? (
            <Button
              variant={"outline"}
              disabled={!localSettings}
              onClick={() => setShowPinnedTabModal(true)}
            >
              Edit
            </Button>
          ) : (
            <Drawer
              open={drawerIsOpen}
              onOpenChange={(open) => {
                setDrawerIsOpen(open);
                setMobileHeaderModal({
                  showing: open,
                  zIndex: open ? 49 : 48,
                });
              }}
              onClose={() => {
                // setDrawerView("Search filters");
              }}
            >
              <DrawerTrigger asChild>
                <Button variant={"outline"}>Edit</Button>
              </DrawerTrigger>
              <DrawerPortal>
                <DrawerContent className="baseVertFlex fixed bottom-0 left-0 right-0 h-[471px] !items-start !justify-start rounded-t-2xl bg-secondary pt-3">
                  <VisuallyHidden>
                    <DrawerTitle>Pinned tab selector</DrawerTitle>
                    <DrawerDescription>
                      Select a pinned tab to display on your profile.
                    </DrawerDescription>
                  </VisuallyHidden>

                  <Separator className="mt-2 w-full bg-gray" />

                  <PinnedTabList
                    userId={userId}
                    localPinnedTabId={localPinnedTabId}
                    setLocalPinnedTabId={setLocalPinnedTabId}
                  />
                </DrawerContent>
              </DrawerPortal>
            </Drawer>
          )}
        </div>
      </div>
    </div>
  );
}

export default PinnedTabSelector;
