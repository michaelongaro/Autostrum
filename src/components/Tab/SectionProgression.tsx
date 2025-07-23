import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
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

  const { sectionProgression, setShowSectionProgressionModal } = useTabStore(
    (state) => ({
      sectionProgression: state.sectionProgression,
      setShowSectionProgressionModal: state.setShowSectionProgressionModal,
    }),
  );

  return (
    <div
      style={{
        minWidth: aboveMediumViewportWidth ? "500px" : "300px",
      }}
      className="baseVertFlex relative w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md bg-secondary text-secondary-foreground !shadow-primaryButton transition-all hover:bg-secondary-hover hover:text-secondary-foreground"
    >
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => {
          setAccordionValue(value);
        }}
        className="baseVertFlex w-full !items-start gap-2 rounded-md px-2 xs:px-0"
      >
        <AccordionItem value="opened" className="w-full">
          <AccordionTrigger className="w-full p-2 md:p-4">
            <span className="text-lg font-bold">Section progression</span>
          </AccordionTrigger>
          <AccordionContent>
            <motion.div
              variants={opacityVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="baseVertFlex w-full !items-start p-2 !pt-0 md:p-4"
            >
              {sectionProgression.length > 0 && (
                <div className="mt-4 w-auto gap-2">
                  {sectionProgression.map((section) => (
                    <div
                      key={section.id}
                      className="grid w-full grid-cols-2 !place-items-start gap-2"
                    >
                      <div className="baseFlex gap-2 text-gray">
                        <p>{formatSecondsToMinutes(section.startSeconds)}</p>
                        <span>-</span>
                        <p>{formatSecondsToMinutes(section.endSeconds)}</p>
                      </div>

                      <div className="baseFlex gap-2 text-foreground">
                        <span className="text-nowrap font-semibold">
                          {section.title}
                        </span>
                        {section.repetitions > 1 && (
                          <span>({section.repetitions}x)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                size={"sm"}
                className={`${sectionProgression.length > 0 ? "mt-4" : ""} mb-1`}
                onClick={() => setShowSectionProgressionModal(true)}
              >
                {sectionProgression.length === 0 ? "Add one" : "Edit"}
              </Button>
            </motion.div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default SectionProgression;
