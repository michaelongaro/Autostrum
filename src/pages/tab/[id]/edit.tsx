import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Tab from "~/components/Tab/Tab";
import { motion } from "framer-motion";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

// not sure if this is correct file routing for slug

// not sure if this is the best name for this component
function IndividualTabEdit() {
  const router = useRouter();

  const { editing, setEditing } = useTabStore(
    (state) => ({
      editing: state.editing,
      setEditing: state.setEditing,
    }),
    shallow
  );

  useEffect(() => {
    setEditing(true); // zustand setters should be referential so it won't ever be stale
  }, []);

  const tabIdFromUrl = useMemo(() => {
    if (typeof router.query.id === "string") {
      return parseInt(router.query.id);
    }
    return -1;
  }, [router.query.id]);

  // prob don't need refetch on refocus
  const fetchedTab = api.tab.getTabById.useQuery(
    {
      id: tabIdFromUrl,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  return (
    <motion.div
      key={"editingTab"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      {/* TODO: should ONLY render tab if the person viewing it is the owner of the tab, otherwise 
          display text saying `Sorry, only ${tabOwnerUsername} can edit this tab` */}

      <Tab tab={fetchedTab.data} />
    </motion.div>
  );
}

export default IndividualTabEdit;
