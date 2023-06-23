import { useState, useEffect } from "react";
import { useLocalStorageValue } from "@react-hookz/web";

function useViewTypeFromLocalStorage() {
  const [viewType, setViewType] = useState<"grid" | "table">("grid");

  const localStorageViewType = useLocalStorageValue("viewType", {
    defaultValue: "grid",
  });

  useEffect(() => {
    setViewType((localStorageViewType.value as "grid" | "table") ?? "grid");
  }, [localStorageViewType.value]);

  return viewType;
}

export default useViewTypeFromLocalStorage;
