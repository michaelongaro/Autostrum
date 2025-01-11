import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect } from "react";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useDetectRouteChanges from "~/hooks/useDetectRouteChanges";
import useFetchAndLoadSoundfonts from "~/hooks/useFetchAndLoadSoundfonts";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useInitializeAudioContext } from "~/hooks/useInitializeAudioContext";
import useKeepArtistMetadataUpdatedWithClerk from "~/hooks/useKeepArtistMetadataUpdatedWithClerk";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import DesktopHeader from "../Header/DesktopHeader";
import MobileHeader from "../Header/MobileHeader";
import useGetViewportLabel from "~/hooks/useGetViewportLabel";
import useScreenWakeLock from "~/hooks/useScreenWakeLock";
import usePostSignUpRegistration from "~/hooks/usePostSignUpRegistration";

const MobileHeaderModal = dynamic(
  () => import("~/components/modals/MobileHeaderModal"),
);

// we had quite a bit of reactive logic in the GeneralLayout component, so we
// moved it to this component to contain the rerenders to this component (+ children) only
// instead of the entire app.

function GeneralLayoutStatefulShell() {
  const { asPath } = useRouter();

  const looping = useGetLocalStorageValues().looping;

  // reflects any updates made to username/profileImageUrl in Clerk to the ArtistMetadata
  useKeepArtistMetadataUpdatedWithClerk();
  usePostSignUpRegistration();
  useInitializeAudioContext();
  useFetchAndLoadSoundfonts();
  useAutoCompileChords();
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
    recordedAudioBufferSourceNode,
    mobileHeaderModal,
    setMobileHeaderModal,
  } = useTabStore((state) => ({
    setLooping: state.setLooping,
    setShowingAudioControls: state.setShowingAudioControls,
    resetStoreToInitValues: state.resetStoreToInitValues,
    setEditing: state.setEditing,
    setAudioMetadata: state.setAudioMetadata,
    resetAudioAndMetadataOnRouteChange:
      state.resetAudioAndMetadataOnRouteChange,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    recordedAudioBufferSourceNode: state.recordedAudioBufferSourceNode,
    mobileHeaderModal: state.mobileHeaderModal,
    setMobileHeaderModal: state.setMobileHeaderModal,
  }));

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

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
        {mobileHeaderModal.showing && (
          <MobileHeaderModal
            mobileHeaderModal={mobileHeaderModal}
            setMobileHeaderModal={setMobileHeaderModal}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default GeneralLayoutStatefulShell;
