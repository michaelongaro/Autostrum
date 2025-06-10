import { FocusTrap } from "focus-trap-react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { Button } from "~/components/ui/button";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface TipsModal {
  setShowTipsModal: Dispatch<SetStateAction<boolean>>;
}

function TipsModal({ setShowTipsModal }: TipsModal) {
  useModalScrollbarHandling();

  return (
    <motion.div
      key={"TipsModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowTipsModal(false);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div className="baseVertFlex relative min-w-[300px] max-w-[90vw] gap-4 rounded-lg bg-pink-100 p-6 text-pink-950 shadow-sm text-shadow-none xs:max-w-[450px] xs:gap-8">
          {/* chord title */}
          <div className="baseFlex w-full !justify-between">
            <div className="baseFlex gap-2">
              <HiOutlineInformationCircle className="h-4 w-4" />
              Tips
            </div>

            <Button
              variant={"text"}
              onClick={() => {
                setShowTipsModal(false);
              }}
              className="!size-8 shrink-0 !p-0"
            >
              <IoClose className="size-5" />
            </Button>
          </div>

          <div className="baseVertFlex gap-2">tips!</div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default TipsModal;
