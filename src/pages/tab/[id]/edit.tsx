import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Tab from "~/components/Tab/Tab";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

// not sure if this is correct file routing for slug

// not sure if this is the best name for this component
function IndividualTabEdit() {
  const router = useRouter();

  console.log(router.pathname, router.query);
  console.log("here");

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

  const urlId = useMemo(() => {
    if (typeof router.query.id === "string") {
      return parseInt(router.query.id);
    }
    return -1;
  }, [router.query.id]);

  // prob don't need refetch on refocus
  const fetchedTab = api.tab.getTabById.useQuery({
    id: urlId,
  });

  return <Tab tab={fetchedTab.data} />;
}

export default IndividualTabEdit;
