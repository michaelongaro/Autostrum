import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";
import { useClerk, UserProfile } from "@clerk/nextjs";
import { Separator } from "~/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import Link from "next/link";
import formatDate from "~/utils/formatDate";
import TopProfileNavigationLayout from "~/components/Layouts/TopProfileNavigationLayout";
import { TabsContent } from "~/components/ui/tabs";
import PinnedTabModal from "~/components/modals/PinnedTabModal";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import GridTabCard from "~/components/Search/GridTabCard";
import TabCardSkeleton from "~/components/Search/TabCardSkeleton";

function Preferences() {
  const { user } = useClerk();
  const { push } = useRouter();

  // fair to have these here rather than store because (so far) we don't have to navigate around
  // "relative" classes on any parent elems in this component
  const [showPinnedTabModal, setShowPinnedTabModal] = useState(false);
  const [showEmptyTabsWarning, setShowEmptyTabsWarning] = useState(false);

  // const { pinne } = useTabStore(
  //   (state) => ({
  //     originalTabData: state.originalTabData,
  //   }),
  //   shallow
  // );

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: user?.id, // <--- this is jank
    },
    {
      enabled: !!user,
    }
  );

  const { data: fetchedTab, refetch: refetchTab } = api.tab.getTabById.useQuery(
    {
      id: artist?.pinnedTabId ?? -1,
    },
    {
      enabled: artist?.pinnedTabId !== -1,
    }
  );

  const { mutate: deleteAccount, isLoading: isDeleting } =
    api.artist.deleteArtist.useMutation({
      onSuccess: async () => {
        await push(`/`);
      },
      onError: (e) => {
        //  const errorMessage = e.data?.zodError?.fieldErrors.content;
        //  if (errorMessage && errorMessage[0]) {
        //    toast.error(errorMessage[0]);
        //  } else {
        //    toast.error("Failed to post! Please try again later.");
        //  }
      },
    });

  return (
    <motion.div
      key={"ArtistPreferences"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // remove z-50 if possible, I think <Bubbles /> is messing it up
      className="baseVertFlex z-50 w-full"
    >
      <TabsContent value="preferences">
        <div className="baseVertFlex gap-2 md:gap-4">
          {/* start of actual preferences component */}
          <div className="baseVertFlex lightGlassmorphic my-4 w-full gap-12 rounded-2xl px-1 py-4 transition-all md:my-8 md:p-8 md:px-4">
            <UserProfile />

            <div
              style={{
                height: isAboveMediumViewportWidth
                  ? artist?.pinnedTabId === -1
                    ? "200px"
                    : "300px"
                  : "auto",
              }}
              className="baseVertFlex relative w-full !flex-nowrap gap-4 md:flex-row md:gap-0"
            >
              <div className="baseVertFlex w-full gap-2 md:gap-4">
                <div className="baseFlex w-full !justify-start gap-4 md:w-4/5">
                  <p className="text-xl font-semibold">Pinned tab</p>
                  {artist?.pinnedTabId !== -1 && (
                    <Button
                      onClick={() => setShowPinnedTabModal(true)}
                      className="h-8 !py-0"
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="baseVertFlex min-h-[128px] w-full rounded-md md:w-4/5">
                  {/* if pinned tab, show card with tab info */}
                  {artist?.pinnedTabId !== -1 ? (
                    <>
                      {fetchedTab ? (
                        <GridTabCard tab={fetchedTab} refetchTab={refetchTab} />
                      ) : (
                        <TabCardSkeleton key="profileTabCardSkeleton" />
                      )}
                    </>
                  ) : (
                    // add conditional popover to say "You haven't created any tabs yet"
                    <div className="lightestGlassmorphic baseFlex h-[128px] w-full">
                      <Popover
                        onOpenChange={(open) => {
                          if (open === false) {
                            setShowEmptyTabsWarning(open);
                          }
                        }}
                        open={showEmptyTabsWarning}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            onClick={() => {
                              if (artist?.numberOfTabs === 0) {
                                setShowEmptyTabsWarning(true);
                                setTimeout(() => {
                                  setShowEmptyTabsWarning(false);
                                }, 3000);
                              } else setShowPinnedTabModal(true);
                            }}
                          >
                            Add tab
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="baseVertFlex p-2"
                          side="bottom"
                        >
                          <p>You haven&apos;t created any tabs yet.</p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>

              {/* absolute left-1/2 -translate-x-1/2 transform */}
              <Separator className="h-[1px] w-full md:h-full md:w-[1px]" />

              <div className="baseVertFlex w-full gap-4">
                <Button>
                  <Link href={`/artist/${artist?.username ?? ""}`}>
                    View profile
                  </Link>
                </Button>
                <Button
                  variant={"destructive"}
                  onClick={() => {
                    // confirmation popover into trpc mutation to delete account
                  }}
                >
                  Delete account
                </Button>
                {artist && (
                  <div className="text-pink-200">{`Joined on ${formatDate(
                    artist.createdAt
                  )}`}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {artist && showPinnedTabModal && (
            <PinnedTabModal
              pinnedTabIdFromDatabase={artist.pinnedTabId}
              setShowPinnedTabModal={setShowPinnedTabModal}
            />
          )}
        </AnimatePresence>
      </TabsContent>
    </motion.div>
  );
}

Preferences.PageLayout = TopProfileNavigationLayout;

export default Preferences;
