import { useState, useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Button } from "../ui/button";
import { BsArrowRightShort } from "react-icons/bs";

function SectionProgression() {
  const [aboveMediumViewportWidth, setAboveMediumViewportWidth] =
    useState(false);

  const {
    editing,
    tabData,
    sectionProgression,
    setSectionProgression,
    setShowSectionProgressionModal,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      setShowSectionProgressionModal: state.setShowSectionProgressionModal,
    }),
    shallow
  );

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setAboveMediumViewportWidth(true);
      } else {
        setAboveMediumViewportWidth(false);
      }
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <div
        style={{
          minWidth: aboveMediumViewportWidth
            ? sectionProgression.length === 0
              ? "450px"
              : "500px"
            : "auto",
        }}
        className={`lightGlassmorphic baseVertFlex gap-4 rounded-md
        p-4 md:!items-start`}
      >
        <p className="text-lg font-semibold text-pink-50">
          {sectionProgression.length === 0
            ? "No section progression specified"
            : "Section progression"}
        </p>

        {sectionProgression.length > 0 && (
          <div className="baseVertFlex gap-2 md:flex-row">
            {sectionProgression.map((section) => (
              <div key={section.id} className="baseFlex gap-2">
                <p className="font-semibold">{section.title}</p>
                <p>x{section.repetitions}</p>

                {section.index !== sectionProgression.length - 1 && (
                  <BsArrowRightShort className="text-pink-50" />
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          size={"sm"}
          className="block md:hidden"
          onClick={() => setShowSectionProgressionModal(true)}
        >
          {sectionProgression.length === 0 ? "Add one" : "Edit"}
        </Button>

        <Button
          size={"sm"}
          className="absolute right-3 top-3 hidden md:block"
          onClick={() => setShowSectionProgressionModal(true)}
        >
          {sectionProgression.length === 0 ? "Add one" : "Edit"}
        </Button>
      </div>
    </>
  );
}

export default SectionProgression;
