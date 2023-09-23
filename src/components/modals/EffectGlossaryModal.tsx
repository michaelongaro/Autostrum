import { motion } from "framer-motion";
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
  return (
    <motion.div
      key={"EffectGlossaryModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100vh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
    >
      <div
        style={{
          height: "590px",
        }}
      >
        <EffectGlossary />
      </div>
    </motion.div>
  );
}

export default EffectGlossaryModal;
