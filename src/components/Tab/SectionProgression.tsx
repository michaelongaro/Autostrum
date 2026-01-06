import { useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { useState } from "react";
import { BsMusicNoteList } from "react-icons/bs";
import { motion } from "framer-motion";

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

  const { sectionProgression, setShowSectionProgressionModal } = useTabStore(
    (state) => ({
      sectionProgression: state.sectionProgression,
      setShowSectionProgressionModal: state.setShowSectionProgressionModal,
    }),
  );

  return (
    <div className="baseVertFlex relative w-1/2 min-w-[300px] max-w-[91.7%] !items-start gap-4 rounded-md bg-secondary text-secondary-foreground !shadow-primaryButton sm:min-w-[500px]">
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => {
          setAccordionValue(value);
        }}
        className="baseVertFlex w-full !items-start gap-2 rounded-md px-2 sm:px-0"
      >
        <AccordionItem value="opened" className="w-full">
          <AccordionTrigger className="w-full p-2 sm:p-4">
            <div className="baseFlex gap-2">
              <BsMusicNoteList className="size-4" />
              <span className="my-1 text-base font-bold xs:my-0 xs:text-lg">
                Section progression
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="w-full">
            <div className="baseVertFlex w-full !items-start gap-4 p-2 !pt-0 sm:p-4">
              <div
                className={`w-auto gap-2 ${sectionProgression.length > 0 ? "mt-4" : ""}`}
              >
                {sectionProgression.map((section) => (
                  <motion.div
                    key={section.id}
                    variants={opacityVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
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
                  </motion.div>
                ))}
              </div>

              <Button
                size={"sm"}
                className="mb-1"
                onClick={() => setShowSectionProgressionModal(true)}
              >
                {sectionProgression.length === 0 ? "Add section" : "Edit"}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default SectionProgression;
