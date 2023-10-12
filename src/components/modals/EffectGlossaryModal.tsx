import { motion } from "framer-motion";
import { useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";

import EffectGlossary from "../ui/EffectGlossary";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

function EffectGlossaryModal() {
  const { setPreventFramerLayoutShift } = useTabStore(
    (state) => ({
      setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
    }),
    shallow
  );

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
      key={"EffectGlossaryModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
    >
      <div className="h-[643px]">
        <EffectGlossary />
      </div>
    </motion.div>
  );
}

export default EffectGlossaryModal;
