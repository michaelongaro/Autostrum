import { useEffect } from "react";
import type { Tab } from "@prisma/client";
import { useClerk, useAuth } from "@clerk/nextjs";
import TabMetadata from "./TabMetadata";
import TabSection from "./TabSection";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { AnimatePresence } from "framer-motion";

import SectionProgression from "./SectionProgression";
import SectionProgressionModal from "../modals/SectionProgressionModal";

// not sure of best way to avoid having the same name for interface and component
export interface ITabSection {
  title: string;
  data: string[][];
}

function Tab({ tab }: { tab: Tab | undefined | null }) {
  const { user, loaded } = useClerk();
  const { userId, isLoaded } = useAuth();

  const {
    setCreatedById,
    setTitle,
    setDescription,
    setGenre,
    setTuning,
    setBPM,
    setTimeSignature,
    tabData,
    setTabData,
    editing,
    setEditing,
    showSectionProgressionModal,
  } = useTabStore(
    (state) => ({
      setCreatedById: state.setCreatedById,
      setTitle: state.setTitle,
      setDescription: state.setDescription,
      setGenre: state.setGenre,
      setTuning: state.setTuning,
      setBPM: state.setBPM,
      setTimeSignature: state.setTimeSignature,
      tabData: state.tabData,
      setTabData: state.setTabData,
      editing: state.editing,
      setEditing: state.setEditing,
      showSectionProgressionModal: state.showSectionProgressionModal,
    }),
    shallow
  );

  useEffect(() => {
    if (!tab) return;

    setCreatedById(tab.createdById);
    setTitle(tab.title);
    setDescription(tab.description ?? "");
    setGenre(""); // TODO: set genre implementation
    setTuning(tab.tuning);
    setBPM(tab.bpm);
    setTimeSignature(tab.timeSignature);

    // @ts-expect-error asdf
    setTabData(tab.tabData);
  }, [
    tab,
    setCreatedById,
    setBPM,
    setDescription,
    setGenre,
    setTabData,
    setTimeSignature,
    setTitle,
    setTuning,
  ]);

  // const [editing, setEditing] = useState(true);

  // const [title, setTitle] = useState(tab?.title ?? "");
  // const [description, setDescription] = useState(tab?.description ?? "");

  // // these two will need some more coddling to get working
  // const [genre, setGenre] = useState(tab?.genreId ?? 0);
  // const [tuning, setTuning] = useState(tab?.tuning ?? "EADGBE"); // not sure how we want to handle this yet

  // const [BPM, setBPM] = useState(tab?.bpm ?? 75);
  // const [timeSignature, setTimeSignature] = useState(
  //   tab?.timeSignature ?? "4/4"
  // );
  // const [tabData, setTabData] = useState<ITabSection[]>(
  //   // @ts-expect-error asdf
  //   tab?.tabData ?? [
  //     {
  //       title: "Intro",
  //       data: [
  //         ["", "", "", "", "", "", "2", ""],
  //         ["", "", "", "", "", "", "", ""],
  //         ["", "", "", "", "", "", "2", ""],
  //         ["", "", "", "", "", "", "", ""],
  //         ["", "", "", "", "", "", "2", ""],
  //         ["", "", "", "", "", "", "", ""],
  //         ["", "", "", "1", "", "", "", ""],
  //         ["", "", "", "", "", "", "", ""],
  //       ],
  //     },
  //   ]
  // );

  // TODO: validation + sanitization for inputs and also note effects for both mobile and desktop

  // edit/save buttons prob right at the top of this markup below
  return (
    <>
      <div className="baseVertFlex lightGlassmorphic relative mt-24 w-11/12 gap-4 rounded-md p-4 md:w-8/12">
        <TabMetadata />

        <SectionProgression />

        {/* Actual tab below */}
        {tabData.map((section, index) => (
          <TabSection
            key={index}
            sectionData={{
              title: section.title,
              data: section.data,
            }}
            sectionIndex={index}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {showSectionProgressionModal && <SectionProgressionModal />}
      </AnimatePresence>
    </>
  );
}

export default Tab;
