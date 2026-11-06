import { AnimatePresence } from "framer-motion";

import { useEffect } from "react";
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
import MobileHeaderModal from "~/components/modals/MobileHeaderModal";
import IPhoneSoundDrawerController from "~/components/AudioControls/IPhoneSoundDrawerController";

// I had quite a bit of reactive logic in the GeneralLayout component, so I
// moved it to this component to contain the rerenders to this component (+ children) only
// instead of the entire app.

function GeneralLayoutStatefulShell() {
  const looping = useGetLocalStorageValues().looping;
  const countIn = useGetLocalStorageValues().countIn;
  const colorCodedChords = useGetLocalStorageValues().colorCodedChords;

  useColorAndThemeController();
  useInitializeAudioContext();
  useFetchAndLoadSoundfonts();
  useGetViewportLabel();
  useScreenWakeLock();

  const {
    setLooping,
    setCountInTimerEnabled,
    setChordDisplayMode,
    showMobileHeaderModal,
    setShowMobileHeaderModal,
  } = useTabStore((state) => ({
    setLooping: state.setLooping,
    setCountInTimerEnabled: state.setCountInTimerEnabled,
    setChordDisplayMode: state.setChordDisplayMode,
    showMobileHeaderModal: state.showMobileHeaderModal,
    setShowMobileHeaderModal: state.setShowMobileHeaderModal,
  }));

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  // keeps looping local storage state in sync with store
  useEffect(() => {
    setLooping(looping);
  }, [looping, setLooping]);

  // keeps count-in local storage state in sync with store
  useEffect(() => {
    setCountInTimerEnabled(countIn);
  }, [countIn, setCountInTimerEnabled]);

  // keeps color-coded chords local storage state in sync with store
  useEffect(() => {
    setChordDisplayMode(colorCodedChords ? "color" : "text");
  }, [colorCodedChords, setChordDisplayMode]);

  return (
    <>
      {aboveLargeViewportWidth ? <DesktopHeader /> : <MobileHeader />}

      <AnimatePresence mode="wait">
        {showMobileHeaderModal && !aboveLargeViewportWidth && (
          <MobileHeaderModal
            setShowMobileHeaderModal={setShowMobileHeaderModal}
          />
        )}
      </AnimatePresence>

      <PostSignupDialog />
      <IPhoneSoundDrawerController />
    </>
  );
}

export default GeneralLayoutStatefulShell;
