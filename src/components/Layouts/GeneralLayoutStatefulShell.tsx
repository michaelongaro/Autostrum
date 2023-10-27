import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { BsArrowUpShort } from "react-icons/bs";
import { shallow } from "zustand/shallow";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useFetchAndLoadSoundfonts from "~/hooks/useFetchAndLoadSoundfonts";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import useKeepArtistMetadataUpdatedWithClerk from "~/hooks/useKeepArtistMetadataUpdatedWithClerk";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import AudioControls from "../AudioControls/AudioControls";
import Header from "../Header/Header";
import { Button } from "../ui/button";
import { useLocalStorageValue } from "@react-hookz/web";
import useDetectRouteChanges from "~/hooks/useDetectRouteChanges";
import MobileHeaderModal from "../modals/MobileHeaderModal";

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

// we had quite a bit of reactive logic in the GeneralLayout component, so we
// moved it to this component to contain the rerenders to this component (+ children) only
// instead of the entire app.

function GeneralLayoutStatefulShell() {
  const { asPath } = useRouter();

  const [scrollToTopTicking, setScrollToTopTicking] = useState(false);
  const [audioControlsVisibility, setAudioControlsVisibility] = useState<
    "expanded" | "minimized"
  >("expanded");
  const [scrollThresholdReached, setScrollThresholdReached] =
    useState<boolean>(false);

  const localStorageAutoscroll = useLocalStorageValue("autostrumAutoscroll");

  const looping = useGetLocalStorageValues().looping;

  // reflects any updates made to username/profileImageUrl in Clerk to the ArtistMetadata
  useKeepArtistMetadataUpdatedWithClerk();

  useFetchAndLoadSoundfonts();

  useAutoCompileChords();

  useDetectRouteChanges();

  const {
    setLooping,
    showingAudioControls,
    setShowingAudioControls,
    resetStoreToInitValues,
    setEditing,
    setAudioMetadata,
    resetAudioAndMetadataOnRouteChange,
    setCurrentlyPlayingMetadata,
    audioMetadata,
    audioContext,
    setAudioContext,
    masterVolumeGainNode,
    setMasterVolumeGainNode,
    recordedAudioBufferSourceNode,
    isProgramaticallyScrolling,
    showMobileHeaderModal,
    setShowMobileHeaderModal,
  } = useTabStore(
    (state) => ({
      setLooping: state.setLooping,
      showingAudioControls: state.showingAudioControls,
      setShowingAudioControls: state.setShowingAudioControls,
      resetStoreToInitValues: state.resetStoreToInitValues,
      setEditing: state.setEditing,
      setAudioMetadata: state.setAudioMetadata,
      resetAudioAndMetadataOnRouteChange:
        state.resetAudioAndMetadataOnRouteChange,
      setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
      audioMetadata: state.audioMetadata,
      audioContext: state.audioContext,
      setAudioContext: state.setAudioContext,
      masterVolumeGainNode: state.masterVolumeGainNode,
      setMasterVolumeGainNode: state.setMasterVolumeGainNode,
      recordedAudioBufferSourceNode: state.recordedAudioBufferSourceNode,
      isProgramaticallyScrolling: state.isProgramaticallyScrolling,
      showMobileHeaderModal: state.showMobileHeaderModal,
      setShowMobileHeaderModal: state.setShowMobileHeaderModal,
    }),
    shallow
  );

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  useEffect(() => {
    if (audioContext && masterVolumeGainNode) return;

    const newAudioContext = new AudioContext();

    const newMasterVolumeGainNode = newAudioContext.createGain();

    newMasterVolumeGainNode.connect(newAudioContext.destination);

    setAudioContext(newAudioContext);
    setMasterVolumeGainNode(newMasterVolumeGainNode);
  }, [
    audioContext,
    masterVolumeGainNode,
    setAudioContext,
    setMasterVolumeGainNode,
  ]);

  // keeps looping local storage state in sync with store
  useEffect(() => {
    setLooping(looping);

    // since playRecordedAudio() isn't async in any way, this is the only way to
    // ensure that changes to the looping state are reflected on the audio buffer
    // after it has already started playing.
    if (recordedAudioBufferSourceNode) {
      recordedAudioBufferSourceNode.loop = looping;
    }
  }, [looping, setLooping, recordedAudioBufferSourceNode]);

  // Scroll to top button handling + break out of autoscroll if user scrolls
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    function handleScroll() {
      if (timerId) {
        // Exit early if there's already a pending timer
        return;
      }

      timerId = setTimeout(() => {
        window.requestAnimationFrame(() => {
          if (!isProgramaticallyScrolling && audioMetadata.playing) {
            localStorageAutoscroll.set("false");
          }

          setScrollThresholdReached(
            window.scrollY > Math.floor(0.35 * window.innerHeight)
          );
          setScrollToTopTicking(false);
        });

        timerId = null;
      }, 500); // 500ms throttle, doesn't need to be super accurate
      setScrollToTopTicking(true);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [
    scrollToTopTicking,
    isProgramaticallyScrolling,
    localStorageAutoscroll,
    audioMetadata.playing,
  ]);

  // route change state reset handling
  useEffect(() => {
    resetAudioAndMetadataOnRouteChange();
    setAudioControlsVisibility("expanded");

    if (asPath.includes("/tab/") || asPath.includes("/create")) {
      setShowingAudioControls(true);
    } else {
      setShowingAudioControls(false);
    }

    // only case where we want to keep tab state is when we are navigating onto a tab
    // page, or going to /edit from a tab page, etc.
    if (!asPath.includes("/tab/")) {
      resetStoreToInitValues();
    }

    if (asPath.includes("/create") || asPath.includes("edit")) {
      setEditing(true);
    }
  }, [
    asPath,
    resetStoreToInitValues,
    setEditing,
    setShowingAudioControls,
    setAudioMetadata,
    resetAudioAndMetadataOnRouteChange,
    setCurrentlyPlayingMetadata,
  ]);

  const scrollToTopButtonBottomValue = useMemo(() => {
    let bottomValue = "1rem";

    if (!aboveLargeViewportWidth && showingAudioControls) {
      if (audioControlsVisibility === "minimized") {
        bottomValue = "3.15rem";
      } else if (audioControlsVisibility === "expanded") {
        bottomValue = "7rem";
      }
    }

    return bottomValue;
  }, [audioControlsVisibility, aboveLargeViewportWidth, showingAudioControls]);

  return (
    <>
      <Header />

      <AnimatePresence mode="wait">
        {showMobileHeaderModal && (
          <MobileHeaderModal
            setShowMobileHeaderModal={setShowMobileHeaderModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showingAudioControls && (
          <AudioControls
            visibility={audioControlsVisibility}
            setVisibility={setAudioControlsVisibility}
          />
        )}
      </AnimatePresence>

      {/* scroll to top button */}
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
              transition: "bottom 0.3s linear",
            }}
            className="baseFlex fixed right-1 z-[47] lg:right-4"
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
    </>
  );
}

export default GeneralLayoutStatefulShell;
