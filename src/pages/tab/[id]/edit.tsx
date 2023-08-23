import { useMemo } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Tab from "~/components/Tab/Tab";
import { motion } from "framer-motion";
import TabSkeleton from "~/components/Tab/TabSkeleton";

// not sure if this is correct file routing for slug

// not sure if this is the best name for this component
function IndividualTabEdit() {
  const router = useRouter();

  const tabIdFromUrl = useMemo(() => {
    if (typeof router.query.id === "string") {
      return parseInt(router.query.id);
    }
    return -1;
  }, [router.query.id]);

  // prob don't need refetch on refocus
  const fetchedTab = api.tab.getTabById.useQuery({
    id: tabIdFromUrl,
  });

  // may need to manually show skeleton for 0.5s or whatever, we see

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

      {fetchedTab ? (
        <Tab tab={fetchedTab.data} />
      ) : (
        <TabSkeleton editing={true} />
      )}
    </motion.div>
  );
}

export default IndividualTabEdit;
