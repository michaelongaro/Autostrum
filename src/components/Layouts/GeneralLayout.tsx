import { useState, useEffect, type ReactNode } from "react";
import Bubbles from "../Bubbles";
import Header from "../Header/Header";
import { AnimatePresence, motion } from "framer-motion";
import useKeepArtistMetadataUpdatedWithClerk from "~/hooks/useKeepArtistMetadataUpdatedWithClerk";
import AudioControls from "../AudioControls/AudioControls";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { BsArrowUpShort } from "react-icons/bs";
import { Button } from "../ui/button";
import Footer from "../Footer/Footer";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0.5,
  },
};
interface GeneralLayout {
  children: ReactNode;
}

function GeneralLayout({ children }: GeneralLayout) {
  // reflects any updates made to username/profileImageUrl in Clerk to the ArtistMetadata
  useKeepArtistMetadataUpdatedWithClerk();

  const { showingAudioControls } = useTabStore(
    (state) => ({
      showingAudioControls: state.showingAudioControls,
    }),
    shallow
  );

  const [scrollThresholdReached, setScrollThresholdReached] =
    useState<boolean>(false);

  useEffect(() => {
    function handleScroll() {
      setScrollThresholdReached(
        window.scrollY > Math.floor(0.35 * window.innerHeight)
      );
    }

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      style={{
        background:
          "linear-gradient(315deg, #ff3721, #ff6196, #fba6ff) fixed center / cover",
      }}
      className="baseVertFlex relative min-h-[100dvh] !justify-between"
    >
      {/* not sure why setting z-index 0 on Bubbles doesn't make everything else automatically
          interactable */}
      <Bubbles />
      <Header />

      <AnimatePresence mode="wait">
        {/* temp: remove "true" once showingAudioControls is working properly */}
        {(showingAudioControls || true) && <AudioControls />}
      </AnimatePresence>

      {/* bottom right scroll to top button */}
      <AnimatePresence mode="wait">
        {scrollThresholdReached && (
          <motion.div
            key={"ScrollToTop"}
            variants={opacityAndScaleVariants}
            initial="closed"
            animate="expanded"
            exit="closed"
            transition={{
              duration: 0.15,
            }}
            onClick={() => window.scrollTo(0, 0)}
            style={{
              // temp: remove "true" once showingAudioControls is working properly
              bottom: showingAudioControls || true ? "7.5rem" : "1rem",
            }}
            className="baseFlex fixed right-4 z-50"
          >
            <Button
              variant="secondary"
              className="rounded-full p-[0.4rem] md:p-2"
            >
              <BsArrowUpShort className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">{children}</AnimatePresence>

      <Footer />
    </div>
  );
}

export default GeneralLayout;
