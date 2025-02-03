import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { useState } from "react";

const opacityVariants = {
  closed: {
    opacity: 0,
  },
  open: {
    opacity: 1,
  },
};

function SectionProgression() {
  const [accordionValue, setAccordionValue] = useState("closed");
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { editing, sectionProgression, setShowSectionProgressionModal } =
    useTabStore((state) => ({
      editing: state.editing,
      sectionProgression: state.sectionProgression,
      setShowSectionProgressionModal: state.setShowSectionProgressionModal,
    }));

  return (
    <div
      style={{
        display: editing
          ? "flex"
          : sectionProgression.length === 0
            ? "none"
            : "flex",
        minWidth: aboveMediumViewportWidth ? "500px" : "300px",
      }}
      className="lightestGlassmorphic baseVertFlex w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 !shadow-lighterGlassmorphic md:p-4"
    >
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => {
          setAccordionValue(value);
        }}
        className="baseVertFlex w-full !items-start gap-2 rounded-md"
      >
        <AccordionItem value="opened" className="w-full">
          <AccordionTrigger className="w-full">
            <p
              style={{
                textShadow: "0 1px 2px hsla(336, 84%, 17%, 0.25)",
              }}
              className="text-lg font-bold"
            >
              Section progression
            </p>
          </AccordionTrigger>
          <AccordionContent>
            {editing ? (
              <motion.div
                variants={opacityVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="baseVertFlex w-full !items-start"
              >
                <div className="mt-4 w-auto gap-2">
                  {sectionProgression.map((section) => (
                    <div
                      key={section.id}
                      className="grid w-full grid-cols-2 !place-items-start gap-2"
                    >
                      <div className="baseFlex gap-2">
                        <p className="text-stone-400">
                          {formatSecondsToMinutes(section.startSeconds)}
                        </p>
                        <span className="text-stone-400">-</span>
                        <p className="text-stone-400">
                          {formatSecondsToMinutes(section.endSeconds)}
                        </p>
                      </div>

                      <div className="baseFlex gap-2">
                        <p className="text-nowrap font-semibold">
                          {section.title}
                        </p>
                        {section.repetitions > 1 && (
                          <p>(x{section.repetitions})</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  size={"sm"}
                  className={`${sectionProgression.length > 0 ? "mt-4" : ""} mb-1`}
                  onClick={() => setShowSectionProgressionModal(true)}
                >
                  {sectionProgression.length === 0 ? "Add one" : "Edit"}
                </Button>
              </motion.div>
            ) : (
              <div className="baseFlex w-full !justify-start">
                {sectionProgression.length === 0 ? (
                  <p className="text-stone-400">
                    No section progression specified
                  </p>
                ) : (
                  <div className="baseVertFlex mt-4 gap-2">
                    {sectionProgression.map((section) => (
                      <motion.div
                        key={section.id}
                        variants={opacityVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="baseFlex w-full !justify-start gap-2"
                      >
                        <div className="baseFlex w-24 gap-2">
                          <p className="text-stone-400">
                            {formatSecondsToMinutes(section.startSeconds)}
                          </p>
                          <span className="text-stone-400">-</span>
                          <p className="text-stone-400">
                            {formatSecondsToMinutes(section.endSeconds)}
                          </p>
                        </div>

                        <div className="baseFlex gap-2">
                          <p className="text-nowrap font-semibold">
                            {section.title}
                          </p>
                          {section.repetitions > 1 && (
                            <p>(x{section.repetitions})</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default SectionProgression;
