import { UserProfile, useClerk } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { LuExternalLink } from "react-icons/lu";
import { shallow } from "zustand/shallow";
import TopProfileNavigationLayout from "~/components/Layouts/TopProfileNavigationLayout";
import GridTabCard from "~/components/Search/GridTabCard";
import TabCardSkeleton from "~/components/Search/TabCardSkeleton";
import DeleteAccountModal from "~/components/modals/DeleteAccountModal";
import PinnedTabModal from "~/components/modals/PinnedTabModal";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { TabsContent } from "~/components/ui/tabs";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";

function Preferences() {
  const { user } = useClerk();

  // fair to have these here rather than store because (so far) we don't have to navigate around
  // "relative" classes on any parent elems in this component
  const [showPinnedTabModal, setShowPinnedTabModal] = useState(false);
  const [showEmptyTabsWarning, setShowEmptyTabsWarning] = useState(false);

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const {
    showDeleteAccountModal,
    setShowDeleteAccountModal,
    setPreventFramerLayoutShift,
  } = useTabStore(
    (state) => ({
      showDeleteAccountModal: state.showDeleteAccountModal,
      setShowDeleteAccountModal: state.setShowDeleteAccountModal,
      setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
    }),
    shallow
  );

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
      <Head>
        <title>Preferences | Autostrum</title>
        <meta property="og:title" content="Preferences | Autostrum"></meta>
        <meta
          property="og:url"
          content="www.autostrum.com/profile/preferences"
        />
        <meta
          property="og:description"
          content="Edit your acount preferences, change your pinned tab on your profile, and more."
        />
        <meta property="og:type" content="website" />
        {/* should be just homepage ss of homepage? */}
        <meta property="og:image" content=""></meta>
      </Head>

      <TabsContent value="preferences">
        <div className="baseVertFlex lightGlassmorphic mt-12 w-full gap-12 rounded-2xl p-2 transition-all md:my-8 md:p-8 md:px-4">
          <UserProfile
            appearance={{
              elements: {
                rootBox: "max-w-[100%] securedByClerkBreakpoint md:max-w-[95%]",
                card: "max-w-[100%] securedByClerkBreakpoint md:max-w-[95%]",
              },
            }}
          />

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
                      <TabCardSkeleton uniqueKey="profileTabCardSkeleton" />
                    )}
                  </>
                ) : (
                  // add conditional popover to say "You haven't created any tabs yet"
                  <div className="lightestGlassmorphic baseFlex h-[128px] w-full rounded-md">
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
              <Button asChild>
                <Link
                  href={`/artist/${artist?.username ?? ""}`}
                  className="baseFlex gap-2"
                >
                  Visit profile
                  <LuExternalLink className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant={"destructive"}
                onClick={() => {
                  setShowDeleteAccountModal(true);
                }}
                className="baseFlex gap-2"
              >
                Delete account
                <FaTrashAlt className="h-4 w-4" />
              </Button>
              {artist && (
                <div className="text-sm text-pink-200">{`Joined on ${formatDate(
                  artist.createdAt
                )}`}</div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {artist && showPinnedTabModal && (
            <PinnedTabModal
              pinnedTabIdFromDatabase={artist.pinnedTabId}
              setShowPinnedTabModal={setShowPinnedTabModal}
              setPreventFramerLayoutShift={setPreventFramerLayoutShift}
            />
          )}
        </AnimatePresence>
      </TabsContent>

      <AnimatePresence mode="wait">
        {showDeleteAccountModal && <DeleteAccountModal />}
      </AnimatePresence>
    </motion.div>
  );
}

Preferences.PageLayout = TopProfileNavigationLayout;

export default Preferences;
