import { useState } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Button } from "../ui/button";
import { BsArrowRightShort } from "react-icons/bs";

function SectionProgression() {
  const [showEditorModal, setShowEditorModal] = useState(false);

  const { editing, tabData, sectionProgression, setSectionProgression } =
    useTabStore(
      (state) => ({
        editing: state.editing,
        tabData: state.tabData,
        sectionProgression: state.sectionProgression,
        setSectionProgression: state.setSectionProgression,
      }),
      shallow
    );

  // look up proper way to do modals in framer motion

  return (
    <div className="lightGlassmorphic baseVertFlex gap-2 rounded-md p-2 md:min-w-[500px] md:p-4">
      <p className="text-lg  text-pink-50">Section progression</p>

      <div className="baseVertFlex md:baseFlex gap-2">
        {sectionProgression.map((section, index) => (
          <div key={index} className="baseFlex gap-2">
            <p>{section[0]}</p>
            <p>x{section[1]}</p>

            {index !== sectionProgression.length - 1 && (
              <BsArrowRightShort className="text-pink-50" />
            )}
          </div>
        ))}
      </div>

      <Button
        className="block md:hidden"
        onClick={() => setShowEditorModal(true)}
      >
        Edit
      </Button>

      <Button
        className="absolute right-4 top-4 hidden md:block"
        onClick={() => setShowEditorModal(true)}
      >
        Edit
      </Button>
    </div>
  );
}

export default SectionProgression;
