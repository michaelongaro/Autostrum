import { useEffect } from "react";
import Router from "next/router";
import { useTabStore } from "~/stores/TabStore";

function useDetectRouteChanges() {
  const { events } = Router;

  const { setIsLoadingARoute } = useTabStore((state) => ({
    setIsLoadingARoute: state.setIsLoadingARoute,
  }));

  useEffect(() => {
    events.on("routeChangeStart", () => setIsLoadingARoute(true));
    events.on("routeChangeComplete", () => setIsLoadingARoute(false));
    events.on("routeChangeError", () => setIsLoadingARoute(false));
    return () => {
      events.off("routeChangeStart", () => setIsLoadingARoute(true));
      events.off("routeChangeComplete", () => setIsLoadingARoute(false));
      events.off("routeChangeError", () => setIsLoadingARoute(false));
    };
  }, [events, setIsLoadingARoute]);
}

export default useDetectRouteChanges;
