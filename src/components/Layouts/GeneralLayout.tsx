import type { ReactNode } from "react";
import Bubbles from "../Bubbles";
import Header from "../Header/Header";
import { AnimatePresence } from "framer-motion";
import useKeepArtistMetadataUpdatedWithClerk from "~/hooks/useKeepArtistMetadataUpdatedWithClerk";

interface GeneralLayout {
  children: ReactNode;
}

function GeneralLayout({ children }: GeneralLayout) {
  // reflects any updates made to username/profileImageUrl in Clerk to the ArtistMetadata
  useKeepArtistMetadataUpdatedWithClerk();

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
      {/* TODO: audio controls should prob go here */}
      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </div>
  );
}

export default GeneralLayout;
