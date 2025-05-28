import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import FocusLock from "react-focus-lock";
import PinnedTabList from "~/components/Profile/PinnedTabList";
import type { LocalSettings } from "~/pages/profile/settings";

interface PinnedTabModal {
  userId: string;
  localPinnedTabId: number;
  setLocalPinnedTabId: Dispatch<SetStateAction<number>>;
  setShowPinnedTabModal: Dispatch<SetStateAction<boolean>>;
  localSettings: LocalSettings | null;
}

function PinnedTabModal({
  userId,
  localPinnedTabId,
  setLocalPinnedTabId,
  setShowPinnedTabModal,
  localSettings,
}: PinnedTabModal) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPinnedTabModal(false);
        }
      }}
    >
      <FocusLock autoFocus={false} returnFocus={true} persistentFocus={true}>
        <div className="baseVertFlex h-[500px] w-[500px] gap-4 rounded-md bg-pink-400 p-4 shadow-sm">
          <PinnedTabList
            userId={userId}
            localPinnedTabId={localPinnedTabId}
            setLocalPinnedTabId={setLocalPinnedTabId}
            setShowPinnedTabModal={setShowPinnedTabModal}
            localSettings={localSettings}
          />
        </div>
      </FocusLock>
    </motion.div>
  );
}

export default PinnedTabModal;
