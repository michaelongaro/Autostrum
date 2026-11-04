import { AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import Footer from "../Footer/Footer";
import GeneralLayoutStatefulShell from "./GeneralLayoutStatefulShell";
import localFont from "next/font/local";

// Keep font loading independent of Google Fonts responses during compilation.
const notoSans = localFont({
  src: [
    {
      path: "../../styles/fonts/noto-sans.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "../../styles/fonts/noto-sans-italic.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  display: "swap",
});

interface GeneralLayout {
  children: ReactNode;
}

function GeneralLayout({ children }: GeneralLayout) {
  return (
    <main
      className={`${notoSans.className} baseVertFlex relative isolate min-h-[100dvh] !justify-between`}
    >
      <GeneralLayoutStatefulShell />

      <div aria-hidden="true" className="pageBackgroundClip">
        <div className="pageBackgroundGradient" />
      </div>

      <AnimatePresence mode="wait">{children}</AnimatePresence>

      <Footer />

      <Analytics />
    </main>
  );
}

export default GeneralLayout;
