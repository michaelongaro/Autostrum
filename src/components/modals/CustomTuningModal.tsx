import FocusTrap from "focus-trap-react";
import { motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { HiOutlineWrench } from "react-icons/hi2";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BsFillPlayFill } from "react-icons/bs";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface CustomTuningModal {
  customTuning: string | null;
  setCustomTuning: React.Dispatch<React.SetStateAction<string | null>>;
}

function CustomTuningModal({
  customTuning,
  setCustomTuning,
}: CustomTuningModal) {
  const [customInputValues, setCustomInputValues] = useState<string[]>(
    customTuning && customTuning.length > 0
      ? customTuning.split(" ")
      : ["", "", "", "", "", ""],
  );

  const [showInvalidInputPerIndex, setShowInvalidInputPerIndex] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  const [highlightedNoteInputIndex, setHighlightedNoteInputIndex] = useState<
    number | null
  >(null);

  const placeholderNotes = ["E2", "A2", "D3", "G3", "B3", "E4"];

  const {
    previewMetadata,
    playPreview,
    setTuning,
    setPreventFramerLayoutShift,
    setShowCustomTuningModal,
  } = useTabStore((state) => ({
    previewMetadata: state.previewMetadata,
    playPreview: state.playPreview,
    setTuning: state.setTuning,
    setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
    setShowCustomTuningModal: state.setShowCustomTuningModal,
  }));

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
          parseInt(`${document.body.style.top || 0}`, 10),
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
            <div className="baseFlex mt-2 gap-2 sm:gap-6">
              <div className="baseVertFlex gap-2">
                <div className="grid w-full grid-cols-3 place-items-center text-sm font-semibold">
                  <span>A-G</span>
                  <span>(#)</span>
                  <span>0-7 or 1-8</span>
                </div>
                <div className="grid w-full grid-cols-3 place-items-center text-xs">
                  <span>Root note</span>
                  <span className="baseFlex">
                    Optional sharp
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger>*</TooltipTrigger>
                        <TooltipContent side={"bottom"}>
                          <p>B and E notes cannot have sharps.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <span className="baseFlex">
                    Octave
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger>*</TooltipTrigger>
                        <TooltipContent side={"bottom"}>
                          <div className="baseVertFlex z-50 gap-0">
                            <p>Octaves 0-7 apply to all notes,</p>
                            <p>but 1-8 apply only to the note C.</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="baseFlex !flex-nowrap gap-2">
            {customInputValues.map((value, index) => (
              <Input
                key={index}
                placeholder={placeholderNotes[index]}
                value={value.toUpperCase()}
                showingErrorShakeAnimation={showInvalidInputPerIndex[index]}
                smallErrorShakeAnimation={true}
                style={{
                  color:
                    highlightedNoteInputIndex === index
                      ? "hsl(335, 78%, 42%)"
                      : "hsl(324, 77%, 95%)",
                }}
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

          <div className="baseFlex w-full !justify-between">
            <Button
              disabled={
                (previewMetadata.playing && previewMetadata.type === "chord") ||
                customInputValues.some(
                  (customInputValue) => customInputValue === "",
                )
              }
              variant={"playPause"}
              className="baseFlex gap-4"
              onClick={() => {
                void playPreview({
                  data: ["0", "0", "0", "0", "0", "0"],
                  index: -1,
                  type: "chord",
                  customTuning: customInputValues.join(" "),
                  customBpm: 40,
                });

                setHighlightedNoteInputIndex(0);

                setTimeout(() => {
                  setHighlightedNoteInputIndex(1);

                  setTimeout(() => {
                    setHighlightedNoteInputIndex(2);

                    setTimeout(() => {
                      setHighlightedNoteInputIndex(3);

                      setTimeout(() => {
                        setHighlightedNoteInputIndex(4);

                        setTimeout(() => {
                          setHighlightedNoteInputIndex(5);

                          setTimeout(() => {
                            setHighlightedNoteInputIndex(null);
                          }, 345);
                        }, 345);
                      }, 345);
                    }, 345);
                  }, 345);
                }, 345);
              }}
            >
              <BsFillPlayFill className="h-6 w-6" />
              Preview notes
            </Button>

            <div className="baseFlex gap-4">
              <Button
                variant={"ghost"}
                onClick={() => {
                  setShowCustomTuningModal(false);
                }}
              >
                Close
              </Button>
              <Button
                disabled={
                  customInputValues.some(
                    (customInputValue) => customInputValue === "",
                  ) || isEqual(customTuning, customInputValues.join(" "))
                }
                onClick={handleSaveCustomTuning}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default CustomTuningModal;
