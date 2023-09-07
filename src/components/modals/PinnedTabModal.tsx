import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { motion } from "framer-motion";
import { shallow } from "zustand/shallow";
import { api } from "~/utils/api";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";
import { useClerk } from "@clerk/nextjs";
import { useTabStore } from "~/stores/TabStore";
import SearchInput from "../Search/SearchInput";
import SearchResults from "../Search/SearchResults";
import { TbPinned } from "react-icons/tb";
import FocusTrap from "focus-trap-react";
import { Button } from "../ui/button";

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
  const { user } = useClerk();
  const ctx = api.useContext();

  const [currentlySelectedPinnedTabId, setCurrentlySelectedPinnedTabId] =
    useState(pinnedTabIdFromDatabase);

  // const { data: artist } = api.artist.getByIdOrUsername.useQuery(
  //   {
  //     userId: user?.id,
  //   },
  //   {
  //     enabled: !!user,
  //   }
  // );

  const { mutate: updateArtist } = api.artist.updateArtist.useMutation({
    onSettled: () => {
      void ctx.artist.getByIdOrUsername.invalidate();
      void ctx.tab.getTabById.invalidate();
    },
  });

  // useEffect(() => {
  //   if (
  //     artist &&
  //     artist.pinnedTabId !== -1 &&
  //     currentlySelectedPinnedTabId === -1
  //   ) {
  //     setCurrentlySelectedPinnedTabId(artist.pinnedTabId);
  //   }
  // }, [artist, currentlySelectedPinnedTabId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    setCurrentlySelectedPinnedTabId(pinnedTabIdFromDatabase);
  }, [pinnedTabIdFromDatabase]);

  const { genreId, type, searchQuery, sortByRelevance, additionalSortFilter } =
    useGetUrlParamFilters();

  const viewType = useGetLocalStorageValues().viewType;

  function handleUpdatePinnedTab() {
    if (!user) return;

    updateArtist({
      id: user.id,
      pinnedTabId: currentlySelectedPinnedTabId,
    });
  }

  return (
    <motion.div
      key={"PinnedTabModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100vh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
    >
      <FocusTrap>
        <div
          tabIndex={-1}
          className="baseVertFlex w-11/12 gap-4 rounded-md bg-pink-400 p-2 shadow-sm md:p-4 lg:gap-8 xl:w-9/12"
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
            viewType={viewType}
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
