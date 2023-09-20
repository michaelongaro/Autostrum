import { useState, useEffect, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import Bubbles from "../Bubbles";
import Footer from "../Footer/Footer";
import GeneralLayoutStatefulShell from "./GeneralLayoutStatefulShell";
import { useRef } from "react";
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("~/components/canvas/Scene"), {
  ssr: false,
});
interface GeneralLayout {
  children: ReactNode;
}

function GeneralLayout({ children }: GeneralLayout) {
  const ref = useRef<HTMLDivElement>(null);

  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    setDpr(window.devicePixelRatio > 1 ? 1.1 : 1);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        background:
          "linear-gradient(315deg, #ff3721, #ff6196, #fba6ff) fixed center / cover",
      }}
      className="baseVertFlex relative min-h-[100dvh] !justify-between"
    >
      <Bubbles />

      <GeneralLayoutStatefulShell />

      <AnimatePresence mode="wait">{children}</AnimatePresence>

      <Scene
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
        }}
        camera={{ position: [0, 0, 50] }}
        dpr={dpr}
        eventSource={ref}
        eventPrefix="client"
      />

      <Footer />
    </div>
  );
}

export default GeneralLayout;
