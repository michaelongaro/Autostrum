import { UserProfile, useClerk } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { MdModeEditOutline } from "react-icons/md";
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
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
  const [showClerkUserProfile, setShowClerkUserProfile] = useState(false);

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

  useEffect(() => {
    setTimeout(() => {
      setShowClerkUserProfile(true);
    }, 1000);
  }, []);

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: user?.id, // <--- this is jank
    },
    {
      enabled: !!user,
    }
  );

  const { data: fetchedTab, refetch: refetchTab } =
    api.tab.getMinimalTabById.useQuery(
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
        <meta
          name="description"
          content="Edit your acount preferences, change your pinned tab on your profile, and more."
        />
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
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/profile.png"
        ></meta>
      </Head>

      <TabsContent value="preferences">
        <div className="baseVertFlex lightGlassmorphic mt-12 w-full gap-12 rounded-2xl p-2 transition-all md:my-8 md:p-8 md:px-4">
          <div className="grid min-h-[500px] w-full grid-cols-1 place-items-center overflow-hidden">
            <div
              style={{
                opacity: showClerkUserProfile ? 1 : 0,
              }}
              className="baseFlex col-start-1 col-end-2 row-start-1 row-end-2 h-full w-full !max-w-[100%] pb-1 transition-opacity"
            >
              <UserProfile
                appearance={{
                  elements: {
                    rootBox:
                      "max-w-[100%] securedByClerkBreakpoint md:max-w-[95%]",
                    card: "max-w-[100%] securedByClerkBreakpoint md:max-w-[95%]",
                  },
                }}
              />
            </div>

            <div
              className={`baseFlex col-start-1 col-end-2 row-start-1 row-end-2 h-full w-11/12 rounded-2xl bg-pink-300 transition-opacity ${
                showClerkUserProfile
                  ? "z-[-1] opacity-0"
                  : "animate-pulse opacity-100"
              }`}
            ></div>
          </div>

          <div
            style={{
              height: isAboveMediumViewportWidth
                ? artist?.pinnedTabId === -1
                  ? "275px"
                  : "305px"
                : "auto",
            }}
            className="baseVertFlex relative w-full !flex-nowrap gap-6 md:flex-row md:gap-0"
          >
            <div className="baseVertFlex h-full w-full !justify-start gap-6">
              <div className="baseFlex w-full !justify-start gap-4 md:w-4/5">
                <div className="baseVertFlex">
                  <p className="text-xl font-semibold">Pinned tab</p>
                  <Separator className="w-full bg-pink-500" />
                </div>
                {artist?.pinnedTabId !== -1 && (
                  <Button
                    onClick={() => setShowPinnedTabModal(true)}
                    className="baseFlex h-8 gap-2 !py-0"
                  >
                    Edit
                    <MdModeEditOutline className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="baseVertFlex min-h-[128px] w-full rounded-md md:w-4/5">
                {/* if pinned tab, show card with tab info */}
                {artist?.pinnedTabId !== -1 ? (
                  <>
                    {fetchedTab ? (
                      <GridTabCard
                        minimalTab={fetchedTab}
                        refetchTab={refetchTab}
                      />
                    ) : (
                      <TabCardSkeleton uniqueKey="profileTabCardSkeleton" />
                    )}
                  </>
                ) : (
                  // add conditional popover to say "You haven't created any tabs yet"
                  <div className="lightestGlassmorphic baseFlex h-[200px] w-full rounded-md">
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

            <Separator className="h-[2px] w-full md:h-full md:w-[2px]" />

            <div className="baseVertFlex h-full w-full !flex-nowrap !items-start !justify-start gap-6">
              <div className="baseVertFlex ml-1 md:ml-4">
                <p className="text-xl font-semibold ">Miscellaneous actions</p>
                <Separator className="w-full bg-pink-500" />
              </div>
              <div className="baseVertFlex my-8 h-full w-full gap-4 md:mt-0">
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
                  <div className="text-sm italic text-pink-200">{`Joined on ${formatDate(
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
