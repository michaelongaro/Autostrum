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
  const isPublicTab =
    /^\/tab\/\d+\/[^/]+$/.test(pathname) && !pathname.endsWith("/edit");
  const content = (
    <>
      {/* Run the reset as a preceding sibling, before page hydration effects. */}
      <RouteReset pathname={pathname} />
      {children}
    </>
  );

  return (
    <ClientErrorBoundary resetKey={pathname}>
      {/* Render the public song content in place before JavaScript runs. */}
      {isPublicTab ? content : <Suspense fallback={null}>{content}</Suspense>}
    </ClientErrorBoundary>
  );
}
