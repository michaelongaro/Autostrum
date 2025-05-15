import { AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import Footer from "../Footer/Footer";
import GeneralLayoutStatefulShell from "./GeneralLayoutStatefulShell";
import { Noto_Sans } from "next/font/google";

const notoSans = Noto_Sans({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

interface GeneralLayout {
  children: ReactNode;
}

function GeneralLayout({ children }: GeneralLayout) {
  return (
    <main
      className={`${notoSans.className} baseVertFlex relative min-h-[100dvh] !justify-between`}
    >
      <GeneralLayoutStatefulShell />

      <AnimatePresence mode="wait">{children}</AnimatePresence>

      <Footer />

      <Analytics />
    </main>
  );
}

export default GeneralLayout;
