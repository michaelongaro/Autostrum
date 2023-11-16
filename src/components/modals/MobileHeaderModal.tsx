import { motion } from "framer-motion";
import { useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";

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
  const { setPreventFramerLayoutShift } = useTabStore((state) => ({
    setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
  }));

  useEffect(() => {
    setPreventFramerLayoutShift(true);

    setTimeout(() => {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");
    }, 50);

    return () => {
      setPreventFramerLayoutShift(false);

      setTimeout(() => {
        const offsetY = Math.abs(
          parseInt(`${document.body.style.top || 0}`, 10)
        );
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, offsetY || 0);
      }, 50);
    };
  }, [setPreventFramerLayoutShift]);

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
