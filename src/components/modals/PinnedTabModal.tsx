import { useAuth } from "@clerk/nextjs";
import FocusTrap from "focus-trap-react";
import { motion } from "framer-motion";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { TbPinned } from "react-icons/tb";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";
import { api } from "~/utils/api";
import SearchInput from "../Search/SearchInput";
import SearchResults from "../Search/SearchResults";
import { Button } from "../ui/button";
import { isDesktop } from "react-device-detect";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface PinnedTabModal {
  pinnedTabIdFromDatabase: number;
  setShowPinnedTabModal: Dispatch<SetStateAction<boolean>>;
}

function PinnedTabModal({
  pinnedTabIdFromDatabase,
  setShowPinnedTabModal,
}: PinnedTabModal) {
  const { userId } = useAuth();
  const ctx = api.useContext();

  const [currentlySelectedPinnedTabId, setCurrentlySelectedPinnedTabId] =
    useState(pinnedTabIdFromDatabase);

  const { mutate: updateArtist } = api.artist.updateArtist.useMutation({
    onSettled: () => {
      void ctx.artist.getByIdOrUsername.invalidate();
      void ctx.tab.getTabById.invalidate();
    },
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    setCurrentlySelectedPinnedTabId(pinnedTabIdFromDatabase);
  }, [pinnedTabIdFromDatabase]);

  const {
    genreId,
    type,
    searchQuery,
    view,
    sortByRelevance,
    additionalSortFilter,
  } = useGetUrlParamFilters();

  function handleUpdatePinnedTab() {
    if (!userId) return;

    updateArtist({
      userId,
      pinnedTabId: currentlySelectedPinnedTabId,
    });
  }

  return (
    <motion.div
      key={"PinnedTabModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-[49] h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget && isDesktop) {
          setShowPinnedTabModal(false);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
        }}
      >
        <div
          tabIndex={-1}
          className="baseVertFlex max-h-[90vh] w-11/12 !flex-nowrap gap-4 rounded-md bg-pink-400 p-2 shadow-sm md:p-4 lg:gap-8 xl:w-9/12"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowPinnedTabModal(false);
            }
          }}
        >
          {/* chord title */}
          <div className="baseFlex gap-2">
            <TbPinned className="h-5 w-5" />
            <p className="text-xl font-semibold">Pinned tab</p>
          </div>
          <SearchInput initialSearchQueryFromUrl={searchQuery} />

          <SearchResults
            genreId={genreId}
            type={type}
            searchQuery={searchQuery}
            sortByRelevance={sortByRelevance}
            additionalSortFilter={additionalSortFilter}
            viewType={view}
            selectedPinnedTabId={currentlySelectedPinnedTabId}
            setSelectedPinnedTabId={setCurrentlySelectedPinnedTabId}
          />

          <div className="baseFlex gap-8">
            <Button
              variant={"secondary"}
              onClick={() => setShowPinnedTabModal(false)}
            >
              Close
            </Button>
            <Button
              disabled={
                pinnedTabIdFromDatabase === currentlySelectedPinnedTabId
              }
              onClick={handleUpdatePinnedTab}
            >
              Save
            </Button>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default PinnedTabModal;
