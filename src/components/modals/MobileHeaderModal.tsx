import { motion } from "framer-motion";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface MobileHeaderModal {
  mobileHeaderModal: {
    showing: boolean;
    zIndex: number;
  };
  setMobileHeaderModal: (showMobileHeaderModal: {
    showing: boolean;
    zIndex: number;
  }) => void;
}

function MobileHeaderModal({
  mobileHeaderModal,
  setMobileHeaderModal,
}: MobileHeaderModal) {
  useModalScrollbarHandling();

  return (
    <motion.div
      key={"MobileHeaderModalBackdrop"}
      style={{
        zIndex: mobileHeaderModal.zIndex,
      }}
      className="baseFlex fixed left-0 top-0 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setMobileHeaderModal({
            ...mobileHeaderModal,
            showing: false,
          });
        }
      }}
    ></motion.div>
  );
}

export default MobileHeaderModal;
