import { useState, useEffect, type ReactNode } from "react";
import Bubbles from "../Bubbles";
import Header from "../Header/Header";
import { AnimatePresence, motion } from "framer-motion";
import useKeepArtistMetadataUpdatedWithClerk from "~/hooks/useKeepArtistMetadataUpdatedWithClerk";
import AudioControls from "../AudioControls/AudioControls";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { useRouter } from "next/router";
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
  const { asPath } = useRouter();

  // reflects any updates made to username/profileImageUrl in Clerk to the ArtistMetadata
  useKeepArtistMetadataUpdatedWithClerk();

  const { showingAudioControls, reset, setEditing } = useTabStore(
    (state) => ({
      showingAudioControls: state.showingAudioControls,
      reset: state.reset,
      setEditing: state.setEditing,
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

  // not 100% sure these are the right cases, but just trying to reset tab state
  // to defaults whenever (ideally just leaving, maybe need to keep track of previous route?)
  // not on a direct tab page
  useEffect(() => {
    // only case where we want to keep tab state is when we are navigating onto a tab
    // page, or going to /edit from a tab page, etc.
    if (!asPath.includes("/tab")) {
      reset();
    }

    if (asPath.includes("/create") || asPath.includes("edit")) {
      setEditing(true);
    }
  }, [asPath, reset, setEditing]);

  return (
    <div
      style={{
        background:
          "linear-gradient(315deg, #ff3721, #ff6196, #fba6ff) fixed center / cover",
      }}
      className="baseVertFlex relative min-h-[100dvh] !justify-between"
    >
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
