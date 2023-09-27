import { AnimatePresence } from "framer-motion";
import { useRef, type ReactNode } from "react";
import Bubbles from "../Bubbles";
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
  const ref = useRef<HTMLDivElement>(null);

  return (
    <main
      ref={ref}
      className={`${notoSans.className} baseVertFlex relative min-h-[100dvh] !justify-between`}
    >
      <Bubbles />

      <GeneralLayoutStatefulShell />

      <AnimatePresence mode="wait">{children}</AnimatePresence>

      <Footer />
    </main>
  );
}

export default GeneralLayout;
