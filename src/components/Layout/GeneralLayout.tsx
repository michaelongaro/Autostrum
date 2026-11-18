"use client";
import { Suspense, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import Footer from "../Footer/Footer";
import GeneralLayoutStatefulShell from "./GeneralLayoutStatefulShell";
import { notoSans } from "./siteFont";

interface GeneralLayout {
  children: ReactNode;
}

function GeneralLayout({ children }: GeneralLayout) {
  // Keep the 4rem footer below the viewport while route content streams in.
  return (
    <main
      className={`${notoSans.className} baseVertFlex relative isolate min-h-[calc(100dvh+4rem)] !justify-between`}
    >
      <Suspense fallback={<div className="h-16 w-full" />}>
        <GeneralLayoutStatefulShell />
      </Suspense>

      <div aria-hidden="true" className="pageBackgroundClip">
        <div className="pageBackgroundGradient" />
      </div>

      {children}

      <Footer />

      <Analytics />
    </main>
  );
}

export default GeneralLayout;
