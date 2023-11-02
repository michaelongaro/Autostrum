import { BsArrowRightShort } from "react-icons/bs";
import { shallow } from "zustand/shallow";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";

function SectionProgression() {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { editing, sectionProgression, setShowSectionProgressionModal } =
    useTabStore(
      (state) => ({
        editing: state.editing,
        sectionProgression: state.sectionProgression,
        setShowSectionProgressionModal: state.setShowSectionProgressionModal,
      }),
      shallow
    );

  return (
    <div
      style={{
        display: editing
          ? "flex"
          : sectionProgression.length === 0
          ? "none"
          : "flex",
        minWidth: aboveMediumViewportWidth
          ? sectionProgression.length === 0
            ? "450px"
            : "500px"
          : "300px",
      }}
      className="lightestGlassmorphic baseVertFlex w-1/2 max-w-[91.7%]
        !items-start gap-4 rounded-md p-2 md:p-4"
    >
      <p className="text-lg font-bold text-pink-50">
        {sectionProgression.length === 0
          ? "No section progression specified"
          : "Section progression"}
      </p>

      {sectionProgression.length > 0 && (
        <div className="baseVertFlex !items-start !justify-start gap-2 md:flex-row">
          {sectionProgression.map((section, index) => (
            <div key={section.id} className="baseFlex gap-2">
              <p className="font-semibold">{section.title}</p>
              {section.repetitions > 1 && <p>x{section.repetitions}</p>}

              {index !== sectionProgression.length - 1 && (
                <BsArrowRightShort className="h-6 w-8 text-pink-50" />
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Button
          size={"sm"}
          className="block md:hidden"
          onClick={() => setShowSectionProgressionModal(true)}
        >
          {sectionProgression.length === 0 ? "Add one" : "Edit"}
        </Button>
      )}

      {editing && (
        <Button
          size={"sm"}
          className="absolute right-3 top-3 hidden md:block"
          onClick={() => setShowSectionProgressionModal(true)}
        >
          {sectionProgression.length === 0 ? "Add one" : "Edit"}
        </Button>
      )}
    </div>
  );
}

export default SectionProgression;
