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
  setShowMobileHeaderModal: (showMobileHeaderModal: boolean) => void;
}

function MobileHeaderModal({ setShowMobileHeaderModal }: MobileHeaderModal) {
  useModalScrollbarHandling();

  return (
    <motion.div
      key={"MobileHeaderModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-40 h-[100dvh] w-[100vw] bg-black/60 backdrop-blur-sm"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowMobileHeaderModal(false);
        }
      }}
    ></motion.div>
  );
}

export default MobileHeaderModal;
