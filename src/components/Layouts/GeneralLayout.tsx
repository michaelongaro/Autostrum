import type { ReactNode } from "react";
import Bubbles from "../Bubbles";
import Header from "../Header/Header";
import { AnimatePresence } from "framer-motion";

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
      className="baseVertFlex relative min-h-[100dvh]"
    >
      {/* not sure why setting z-index 0 on Bubbles doesn't make everything else automatically
          interactable */}
      <Bubbles />
      <Header />
      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </div>
  );
}

export default GeneralLayout;
