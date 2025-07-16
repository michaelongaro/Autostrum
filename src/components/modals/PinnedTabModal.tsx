import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import FocusLock from "react-focus-lock";
import PinnedTabList from "~/components/Profile/PinnedTabList";

interface PinnedTabModal {
  userId: string;
  localPinnedTabId: number | null;
  setLocalPinnedTabId: Dispatch<SetStateAction<number | null>>;
  setShowPinnedTabModal: Dispatch<SetStateAction<boolean>>;
}

function PinnedTabModal({
  userId,
  localPinnedTabId,
  setLocalPinnedTabId,
  setShowPinnedTabModal,
}: PinnedTabModal) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/60 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPinnedTabModal(false);
        }
      }}
    >
      <FocusLock autoFocus={false} returnFocus={true} persistentFocus={true}>
        <div
          tabIndex={-1}
          className="baseVertFlex modalGradient relative h-[500px] w-[500px] gap-4 rounded-lg border p-4 shadow-sm"
        >
          <PinnedTabList
            userId={userId}
            localPinnedTabId={localPinnedTabId}
            setLocalPinnedTabId={setLocalPinnedTabId}
            setShowPinnedTabModal={setShowPinnedTabModal}
          />
        </div>
      </FocusLock>
    </motion.div>
  );
}

export default PinnedTabModal;
