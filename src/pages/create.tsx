import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

import Tab from "~/components/Tab/Tab";

function Create() {
  const { setEditing } = useTabStore(
    (state) => ({
      setEditing: state.setEditing,
    }),
    shallow
  );

  useEffect(() => {
    setEditing(true);
  }, [setEditing]);

  return (
    <motion.div
      key={"create"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <Tab tab={undefined} />
    </motion.div>
  );
}

export default Create;
