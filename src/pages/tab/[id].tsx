import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import Tab from "~/components/Tab/Tab";
import { motion } from "framer-motion";
import TabSkeleton from "~/components/Tab/TabSkeleton";

// not sure if this is correct file routing for slug

// not sure if this is the best name for this component
function IndividualTabView() {
  const router = useRouter();

  const { editing, setEditing } = useTabStore(
    (state) => ({
      editing: state.editing,
      setEditing: state.setEditing,
    }),
    shallow
  );

  useEffect(() => {
    setEditing(false); // zustand setters should be referential so it won't ever be stale
  }, []);

  const tabIdFromUrl = useMemo(() => {
    if (typeof router.query.id === "string") {
      return parseInt(router.query.id);
    }
    return -1;
  }, [router.query.id]);

  // prob don't need refetch on refocus
  const { data: fetchedTab, refetch: refetchTab } = api.tab.getTabById.useQuery(
    {
      id: tabIdFromUrl,
    },
    {
      enabled: tabIdFromUrl !== -1,
    }
  );

  return (
    <motion.div
      key={"viewingTab"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <>
        {fetchedTab ? (
          <Tab tab={fetchedTab} refetchTab={refetchTab} />
        ) : (
          <TabSkeleton editing={false} />
        )}
      </>
    </motion.div>
  );
}

export default IndividualTabView;
