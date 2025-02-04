import { useAuth } from "@clerk/nextjs";
import { FocusTrap } from "focus-trap-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { TbPinned } from "react-icons/tb";
import { Check } from "lucide-react";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";
import { api } from "~/utils/api";
import SearchInput from "../Search/SearchInput";
import SearchResults from "../Search/SearchResults";
import { Button } from "../ui/button";
import { isDesktop } from "react-device-detect";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";

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
  const ctx = api.useUtils();

  const [currentlySelectedPinnedTabId, setCurrentlySelectedPinnedTabId] =
    useState(pinnedTabIdFromDatabase);
  const [showSaveCheckmark, setShowSaveCheckmark] = useState(false);

  useModalScrollbarHandling();

  const { mutate: updateArtist, isLoading: isSaving } =
    api.artist.updateArtist.useMutation({
      onSuccess: () => {
        setShowSaveCheckmark(true);

        setTimeout(() => {
          void ctx.artist.getByIdOrUsername.invalidate();
          void ctx.tab.getTabById.invalidate();
        }, 250);

        setTimeout(() => {
          setShowSaveCheckmark(false);
        }, 1500);

        setTimeout(() => {
          setShowPinnedTabModal(false);
        }, 2000);
      },
    });

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
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget && isDesktop) {
          setShowPinnedTabModal(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPinnedTabModal(false);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div className="baseVertFlex max-h-[95vh] w-11/12 !flex-nowrap gap-4 rounded-md bg-pink-400 p-2 shadow-sm md:p-4 lg:gap-8 xl:w-9/12">
          {/* chord title */}
          <div className="baseFlex lightGlassmorphic gap-2 rounded-md p-2 px-8 text-pink-100">
            <TbPinned className="h-5 w-5" />
            <p className="text-lg font-semibold">Pinned tab</p>
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
            hideLikesAndPlayButtons={true}
          />

          <div className="baseFlex gap-4">
            <Button
              variant={"ghost"}
              onClick={() => setShowPinnedTabModal(false)}
            >
              Close
            </Button>
            <Button
              disabled={
                pinnedTabIdFromDatabase === currentlySelectedPinnedTabId ||
                isSaving ||
                showSaveCheckmark
              }
              onClick={handleUpdatePinnedTab}
              className="baseFlex gap-2"
            >
              {showSaveCheckmark && !isSaving
                ? "Saved"
                : isSaving
                  ? "Saving"
                  : "Save"}

              <AnimatePresence mode="wait">
                {/* will need to also include condition for while recording is being
                            uploaded to s3 to also show loading spinner, don't necessarily have to
                            communicate that it's uploading recorded audio imo */}
                {isSaving && (
                  <motion.svg
                    key="pinnedModalSaveLoadingSpinner"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "24px" }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.15,
                    }}
                    className="h-6 w-6 animate-stableSpin rounded-full bg-inherit fill-none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </motion.svg>
                )}
                {showSaveCheckmark && (
                  <motion.div
                    key="pinnedModalSaveSuccessCheckmark"
                    initial={{ opacity: 0, width: "20px" }}
                    animate={{ opacity: 1, width: "20px" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{
                      duration: 0.25,
                    }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default PinnedTabModal;
