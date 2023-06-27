import { motion } from "framer-motion";

import Tab from "~/components/Tab/Tab";

function Create() {
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
