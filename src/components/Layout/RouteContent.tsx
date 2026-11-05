"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import ClientErrorBoundary from "~/components/errors/ClientErrorBoundary";
import { getTabStore } from "~/stores/TabStore";

function RouteReset({ pathname }: { pathname: string }) {
  useEffect(() => {
    const state = getTabStore();
    state.pauseAudio(true);
    state.resetStoreToInitValues();
    const editing =
      pathname === "/create" || /^\/tab\/[^/]+\/edit$/.test(pathname);
    state.setEditing(editing);
    state.setShowingAudioControls(editing);
    state.setIsLoadingARoute(false);
  }, [pathname]);
  return null;
}

export default function RouteContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ClientErrorBoundary resetKey={pathname}>
      <Suspense fallback={null}>
        {/* Run the reset as a preceding sibling, before page hydration effects.
            Keeping it in this boundary also handles streamed initial loads. */}
        <RouteReset pathname={pathname} />
        {children}
      </Suspense>
    </ClientErrorBoundary>
  );
}
