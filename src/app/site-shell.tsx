"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import dynamic from "next/dynamic";

const SiteProviders = dynamic(() => import("./providers"));

export default function SiteShell({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  if (segment === "screenshot-preview") return children;

  return <SiteProviders>{children}</SiteProviders>;
}
