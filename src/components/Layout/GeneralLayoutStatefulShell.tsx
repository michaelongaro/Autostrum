import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect } from "react";
import useDetectRouteChanges from "~/hooks/useDetectRouteChanges";
import useFetchAndLoadSoundfonts from "~/hooks/useFetchAndLoadSoundfonts";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useInitializeAudioContext } from "~/hooks/useInitializeAudioContext";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import DesktopHeader from "../Header/DesktopHeader";
import MobileHeader from "../Header/MobileHeader";
import useGetViewportLabel from "~/hooks/useGetViewportLabel";
import useScreenWakeLock from "~/hooks/useScreenWakeLock";
import useColorAndThemeController from "~/hooks/useColorAndThemeController";
import PostSignupDialog from "~/components/Dialogs/PostSignupDialog";

const MobileHeaderModal = dynamic(
  () => import("~/components/modals/MobileHeaderModal"),
);

// I had quite a bit of reactive logic in the GeneralLayout component, so I
// moved it to this component to contain the rerenders to this component (+ children) only
// instead of the entire app.

function GeneralLayoutStatefulShell() {
  const { asPath } = useRouter();

  const looping = useGetLocalStorageValues().looping;

  useColorAndThemeController();
  useInitializeAudioContext();
  useFetchAndLoadSoundfonts();
  useDetectRouteChanges();
  useGetViewportLabel();
  useScreenWakeLock();

  const {
    setLooping,
    setShowingAudioControls,
    resetStoreToInitValues,
    setEditing,
    setAudioMetadata,
    resetAudioAndMetadataOnRouteChange,
    setCurrentlyPlayingMetadata,
    showMobileHeaderModal,
    setShowMobileHeaderModal,
  } = useTabStore((state) => ({
    setLooping: state.setLooping,
    setShowingAudioControls: state.setShowingAudioControls,
    resetStoreToInitValues: state.resetStoreToInitValues,
    setEditing: state.setEditing,
    setAudioMetadata: state.setAudioMetadata,
    resetAudioAndMetadataOnRouteChange:
      state.resetAudioAndMetadataOnRouteChange,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    showMobileHeaderModal: state.showMobileHeaderModal,
    setShowMobileHeaderModal: state.setShowMobileHeaderModal,
  }));

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  // keeps looping local storage state in sync with store
  useEffect(() => {
    setLooping(looping);
  }, [looping, setLooping]);

  // route change state reset handling
  useEffect(() => {
    resetAudioAndMetadataOnRouteChange();

    if (asPath.includes("/edit") || asPath.includes("/create")) {
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

  return (
    <>
      {aboveLargeViewportWidth ? <DesktopHeader /> : <MobileHeader />}

      <AnimatePresence mode="wait">
        {showMobileHeaderModal && (
          <MobileHeaderModal
            setShowMobileHeaderModal={setShowMobileHeaderModal}
          />
        )}
      </AnimatePresence>

      <PostSignupDialog />
    </>
  );
}

export default GeneralLayoutStatefulShell;
