import FocusTrap from "focus-trap-react";
import { motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { FaBook } from "react-icons/fa";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { HiOutlineWrench } from "react-icons/hi2";
import { shallow } from "zustand/shallow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface CustomTuningModal {
  customTuning: string;
  setCustomTuning: React.Dispatch<React.SetStateAction<string>>;
}

function CustomTuningModal({
  customTuning,
  setCustomTuning,
}: CustomTuningModal) {
  const [accordionValue, setAccordionValue] = useState(
    isMobile ? "" : "opened"
  );
  const [customInputValues, setCustomInputValues] = useState<string[]>(
    customTuning.length === 0
      ? ["", "", "", "", "", ""]
      : customTuning.split(" ")
  );

  const [showInvalidInputPerIndex, setShowInvalidInputPerIndex] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  const placeholderNotes = ["e2", "a2", "d3", "g3", "b3", "e4"];

  const { setTuning, setPreventFramerLayoutShift, setShowCustomTuningModal } =
    useTabStore(
      (state) => ({
        setTuning: state.setTuning,
        setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
        setShowCustomTuningModal: state.setShowCustomTuningModal,
      }),
      shallow
    );

  useEffect(() => {
    setPreventFramerLayoutShift(true);

    setTimeout(() => {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");
    }, 50);

    return () => {
      setPreventFramerLayoutShift(false);

      setTimeout(() => {
        const offsetY = Math.abs(
          parseInt(`${document.body.style.top || 0}`, 10)
        );
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, offsetY || 0);
      }, 50);
    };
  }, [setPreventFramerLayoutShift]);

  function getInvalidInputIndicies() {
    const invalidInputs: boolean[] = [];

    const validNotationRegex =
      /^(A[0-7]|A#[0-7]|B[0-7]|C[1-8]|C#[1-8]|D[1-7]|D#[1-7]|E[1-7]|F[1-7]|F#[1-7]|G[1-7]|G#[1-7])$/;

    customInputValues.forEach((value) => {
      invalidInputs.push(!validNotationRegex.test(value.toUpperCase()));
    });

    return invalidInputs;
  }

  function handleSaveCustomTuning() {
    const invalidInputIndicies = getInvalidInputIndicies();

    if (invalidInputIndicies.includes(true)) {
      setShowInvalidInputPerIndex(invalidInputIndicies);

      setTimeout(() => {
        setShowInvalidInputPerIndex([false, false, false, false, false, false]);
      }, 500);

      return;
    }

    const sanitizedTuning = customInputValues.join(" ");
    setCustomTuning(sanitizedTuning);
    setTuning(sanitizedTuning);
    setShowCustomTuningModal(false);
  }

  return (
    <motion.div
      key={"CustomTuningModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget && isDesktop) {
          setShowCustomTuningModal(false);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div
          tabIndex={-1}
          className="baseVertFlex min-w-[300px] max-w-[91vw] gap-8 rounded-md bg-pink-400 p-2 shadow-sm md:p-4 xl:max-w-[50vw]"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowCustomTuningModal(false);
            }
          }}
        >
          <div className="baseFlex lightGlassmorphic gap-2 rounded-md p-2 px-8 text-pink-100">
            <HiOutlineWrench className="h-5 w-5" />
            <p className="text-lg font-semibold">Custom tuning editor</p>
          </div>

          <div className="baseVertFlex lightestGlassmorphic max-w-[23rem] gap-2 rounded-md p-2 text-sm">
            <HiOutlineInformationCircle className="h-6 w-6" />
            <p className="text-center">
              Tuning notes must be written in Scientific Pitch Notation, you can
              find the formula below.
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            value={accordionValue}
            onValueChange={(value) => {
              setAccordionValue(value);
            }}
            className="baseVertFlex lightestGlassmorphic w-full gap-2 rounded-md px-2 py-0 text-sm"
          >
            <AccordionItem value="opened">
              <AccordionTrigger extraPadding className="w-[300px]">
                <div className="baseFlex w-full gap-2 font-semibold">
                  <FaBook className="h-4 w-4" />
                  Valid notation formula
                </div>
              </AccordionTrigger>
              <AccordionContent extraPaddingBottom>
                <div className="baseFlex mt-2 gap-2 sm:gap-6">
                  <div className="baseVertFlex gap-2">
                    <div className="grid w-full grid-cols-3 place-items-center text-sm">
                      <span>A-G</span>
                      <span>(x)</span>
                      <span>0-7/1-8</span>
                    </div>
                    <div className="grid w-full grid-cols-3 place-items-center text-xs">
                      <span>Root note</span>
                      <span className="baseFlex gap-1">
                        Optional sharp
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger>*</TooltipTrigger>
                            <TooltipContent side={"bottom"}>
                              <p>B and E notes cannot have sharps</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <span className="baseFlex gap-1">
                        Octave
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger>*</TooltipTrigger>
                            <TooltipContent side={"bottom"}>
                              <div className="baseVertFlex z-50 gap-2">
                                <p>While 0-7 applies to all notes,</p>
                                <p>1-8 only applies to the note C</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="baseFlex !flex-nowrap gap-2">
            {customInputValues.map((value, index) => (
              <Input
                key={index}
                placeholder={placeholderNotes[index]}
                value={value}
                showingErrorShakeAnimation={showInvalidInputPerIndex[index]}
                smallErrorShakeAnimation={true}
                className="w-12 p-2 text-center"
                onChange={(e) => {
                  if (e.target.value.length > 3) return;

                  const newCustomInputValues = [...customInputValues];
                  newCustomInputValues[index] = e.target.value.toLowerCase();
                  setCustomInputValues(newCustomInputValues);
                }}
              />
            ))}
          </div>

          <div className="baseFlex gap-4">
            <Button
              variant={"secondary"}
              onClick={() => {
                setShowCustomTuningModal(false);
              }}
            >
              Close
            </Button>
            <Button
              disabled={
                customInputValues.some(
                  (customInputValue) => customInputValue === ""
                ) || isEqual(customTuning, customInputValues.join(" "))
              }
              onClick={handleSaveCustomTuning}
            >
              Save
            </Button>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default CustomTuningModal;
