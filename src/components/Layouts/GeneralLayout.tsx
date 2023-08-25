import { useState, useEffect, useMemo, type ReactNode } from "react";
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
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";

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

  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [ticking, setTicking] = useState(false);
  const [scrollToTopTicking, setScrollToTopTicking] = useState(false);
  const [submitButtonInView, setSubmitButtonInView] = useState(false);
  const [audioControlsVisibility, setAudioControlsVisibility] = useState<
    "expanded" | "minimized" | "keepMinimized"
  >("expanded");
  const [showingHeader, setShowingHeader] = useState(true);
  const [scrollThresholdReached, setScrollThresholdReached] =
    useState<boolean>(false);

  const autoscrollEnabled = useGetLocalStorageValues().autoscroll;

  // reflects any updates made to username/profileImageUrl in Clerk to the ArtistMetadata
  useKeepArtistMetadataUpdatedWithClerk();

  useAutoCompileChords();

  const {
    showingAudioControls,
    setShowingAudioControls,
    resetStoreToInitValues,
    setEditing,
    audioMetadata,
  } = useTabStore(
    (state) => ({
      showingAudioControls: state.showingAudioControls,
      setShowingAudioControls: state.setShowingAudioControls,
      resetStoreToInitValues: state.resetStoreToInitValues,
      setEditing: state.setEditing,
      audioMetadata: state.audioMetadata,
    }),
    shallow
  );

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  // autohide/show header + audio controls on scroll
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    function handleScroll() {
      if (timerId) {
        // Exit early if there's already a pending timer
        return;
      }

      timerId = setTimeout(() => {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY; //|| document.documentElement.scrollTop;
          // handle scroll down
          if (scrollTop > lastScrollTop) {
            if (scrollTop > 64) {
              setShowingHeader(false);
            }

            if (
              !audioMetadata.playing &&
              audioControlsVisibility !== "keepMinimized"
            ) {
              setAudioControlsVisibility("minimized");
            }
          }

          // handle scroll up
          else {
            // only valid to block showing header if playing with autoscroll since it would
            // be way too jarring visually
            if (!autoscrollEnabled || !audioMetadata.playing) {
              setShowingHeader(true);
            }

            if (
              !audioMetadata.playing &&
              audioControlsVisibility !== "keepMinimized"
            ) {
              setAudioControlsVisibility("expanded");
            }
          }
          setLastScrollTop(scrollTop <= 0 ? 0 : scrollTop);
          setTicking(false);
        });

        timerId = null;
      }, 200); // 200ms throttle
      setTicking(true);
    }

    if ("ontouchstart" in window) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [
    lastScrollTop,
    ticking,
    audioMetadata.playing,
    audioControlsVisibility,
    autoscrollEnabled,
  ]);

  // Contact button intersection observer
  useEffect(() => {
    const target = document.getElementById("contact");

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        setSubmitButtonInView(
          entry.isIntersecting && entry.intersectionRatio === 1
        );
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 1.0, // 100% of the target is visible
    };

    const observer = new IntersectionObserver(
      handleIntersection,
      observerOptions
    );

    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, []);

  // Scroll to top button handling
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    function handleScroll() {
      if (timerId) {
        // Exit early if there's already a pending timer
        return;
      }

      timerId = setTimeout(() => {
        window.requestAnimationFrame(() => {
          setScrollThresholdReached(
            window.scrollY > Math.floor(0.35 * window.innerHeight)
          );
          setScrollToTopTicking(false);
        });

        timerId = null;
      }, 200); // 200ms throttle
      setScrollToTopTicking(true);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrollToTopTicking]);

  // route change state reset handling
  useEffect(() => {
    setAudioControlsVisibility("expanded");

    if (!asPath.includes("/tab") && !asPath.includes("/create")) {
      setShowingAudioControls(false);
    } else {
      setShowingAudioControls(true);
    }

    // only case where we want to keep tab state is when we are navigating onto a tab
    // page, or going to /edit from a tab page, etc.
    if (!asPath.includes("/tab")) {
      resetStoreToInitValues();
    }

    if (asPath.includes("/create") || asPath.includes("edit")) {
      setEditing(true);
    }
  }, [asPath, resetStoreToInitValues, setEditing, setShowingAudioControls]);

  const scrollToTopButtonBottomValue = useMemo(() => {
    let bottomValue = "1rem";

    if (!aboveLargeViewportWidth && showingAudioControls) {
      if (
        audioControlsVisibility === "minimized" ||
        audioControlsVisibility === "keepMinimized"
      ) {
        bottomValue = "3.15rem";
      } else if (audioControlsVisibility === "expanded") {
        bottomValue = "6.5rem";
      }
    }

    return bottomValue;
  }, [audioControlsVisibility, aboveLargeViewportWidth, showingAudioControls]);

  return (
    <div
      style={{
        background:
          "linear-gradient(315deg, #ff3721, #ff6196, #fba6ff) fixed center / cover",
      }}
      className="baseVertFlex relative min-h-[100dvh] !justify-between"
    >
      <Bubbles />

      <Header offscreen={!showingHeader} />

      <AnimatePresence mode="wait">
        {showingAudioControls && (
          <AudioControls
            visibility={
              submitButtonInView ? "offscreen" : audioControlsVisibility
            }
            setVisibility={setAudioControlsVisibility}
          />
        )}
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
            onClick={() =>
              window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
            }
            style={{
              bottom: scrollToTopButtonBottomValue,
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className="baseFlex fixed right-1 z-50 lg:right-4"
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
