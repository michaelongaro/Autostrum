import { type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import Bubbles from "../Bubbles";
import Footer from "../Footer/Footer";
import GeneralLayoutStatefulShell from "./GeneralLayoutStatefulShell";
interface GeneralLayout {
  children: ReactNode;
}

function GeneralLayout({ children }: GeneralLayout) {
  return (
    <div
      style={{
        background:
          "linear-gradient(315deg, #ff3721, #ff6196, #fba6ff) fixed center / cover",
      }}
      className="baseVertFlex relative min-h-[100dvh] !justify-between"
    >
      <Bubbles />

      <GeneralLayoutStatefulShell />

      <AnimatePresence mode="wait">{children}</AnimatePresence>

      <Footer />
    </div>
  );
}

export default GeneralLayout;
