import type { ReactNode } from "react";
import Bubbles from "../Bubbles";
import Header from "../Header/Header";
import { AnimatePresence } from "framer-motion";
import useKeepArtistMetadataUpdatedWithClerk from "~/hooks/useKeepArtistMetadataUpdatedWithClerk";
import AudioControls from "../AudioControls/AudioControls";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

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

      <AnimatePresence mode="wait">
        {/* temp: remove "true" once showingAudioControls is working properly */}
        {(showingAudioControls || true) && <AudioControls />}
      </AnimatePresence>

      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </div>
  );
}

export default GeneralLayout;
