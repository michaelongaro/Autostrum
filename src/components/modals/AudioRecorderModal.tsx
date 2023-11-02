import FocusTrap from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { BsStopFill } from "react-icons/bs";
import { FaMicrophoneAlt, FaTrashAlt } from "react-icons/fa";
import { BiErrorCircle } from "react-icons/bi";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { shallow } from "zustand/shallow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { isDesktop } from "react-device-detect";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

function AudioRecorderModal() {
  const [microphoneAccessHasBeenDenied, setMicrophoneAccessHasBeenDenied] =
    useState(false);
  const [showPostRecordingOptions, setShowPostRecordingOptions] =
    useState(false);
  const [localHasRecordedAudio, setLocalHasRecordedAudio] = useState(false);
  const [localRecordedAudioFile, setLocalRecordedAudioFile] =
    useState<Blob | null>(null);
  const [hasInitializedWithStoreValues, setHasInitializedWithStoreValues] =
    useState(false);

  const [
    localRecordingDiffersFromStoreValue,
    setLocalRecordingDiffersFromStoreValue,
  ] = useState(false);

  const blockSaveRecordingRef = useRef(false);

  const {
    isRecording,
    startRecording,
    stopRecording,
    recordingTime,
    recordingBlob,
    togglePauseResume,
  } = useAudioRecorder(
    {
      // ideally would want to enable these all the time, but at the very least
      // mobile android chrome absolutely ruins the audio quality with these enabled
      echoCancellation: isDesktop,
      noiseSuppression: isDesktop,
      autoGainControl: isDesktop, // currently not supported in Safari - 08/31/2023
    },
    () => {
      // called when getUserMedia promise is rejected
      setMicrophoneAccessHasBeenDenied(true);
    }
  );

  const {
    id,
    setShowAudioRecorderModal,
    hasRecordedAudio,
    setHasRecordedAudio,
    recordedAudioFile,
    setRecordedAudioFile,
    setShouldUpdateInS3,
    setPreventFramerLayoutShift,
    setRecordedAudioBuffer,
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
  } = useTabStore(
    (state) => ({
      id: state.id,
      setShowAudioRecorderModal: state.setShowAudioRecorderModal,
      hasRecordedAudio: state.hasRecordedAudio,
      setHasRecordedAudio: state.setHasRecordedAudio,
      recordedAudioFile: state.recordedAudioFile,
      setRecordedAudioFile: state.setRecordedAudioFile,
      setShouldUpdateInS3: state.setShouldUpdateInS3,
      setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
      setRecordedAudioBuffer: state.setRecordedAudioBuffer,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      setCurrentChordIndex: state.setCurrentChordIndex,
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

  useEffect(() => {
    if (hasInitializedWithStoreValues) return;

    setHasInitializedWithStoreValues(true);
    setLocalHasRecordedAudio(hasRecordedAudio);
    setLocalRecordedAudioFile(recordedAudioFile);
  }, [hasInitializedWithStoreValues, hasRecordedAudio, recordedAudioFile]);

  useEffect(() => {
    if (!recordingBlob) return;
    // after 'stopRecording' has been called, recordingBlob will have the recorded audio blob

    if (blockSaveRecordingRef.current) {
      blockSaveRecordingRef.current = false;
      return;
    }

    setLocalHasRecordedAudio(true);
    setLocalRecordedAudioFile(recordingBlob);
    setLocalRecordingDiffersFromStoreValue(true);
  }, [recordingBlob, id]);

  useEffect(() => {
    if (recordingTime === 300) {
      togglePauseResume();
      setShowPostRecordingOptions(true);
    }
    // hopefully togglePauseResume is referentially stable...
  }, [togglePauseResume, recordingTime]);

  function handleSaveRecording() {
    setRecordedAudioBuffer(null); // always want to flush this out

    if (!localHasRecordedAudio) {
      setAudioMetadata({
        ...audioMetadata,
        location: null,
        type: "Generated",
        playing: false,
      });
      setCurrentChordIndex(0);
    }

    setHasRecordedAudio(localHasRecordedAudio);
    setRecordedAudioFile(localRecordedAudioFile);
    setShouldUpdateInS3(true);
    setShowAudioRecorderModal(false);
  }

  return (
    <motion.div
      key={"AudioRecorderModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget && isDesktop) {
          if (isRecording) {
            togglePauseResume();
          }
          setShowAudioRecorderModal(false);
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
          className="baseVertFlex min-h-[350px] w-[350px] gap-10 rounded-md bg-pink-400 p-2 shadow-sm sm:w-[400px] md:p-4"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (isRecording) {
                togglePauseResume();
              }
              setShowAudioRecorderModal(false);
            }
          }}
        >
          <div className="baseFlex lightGlassmorphic gap-2 rounded-md p-2 px-8 text-pink-100">
            <p className="text-lg font-semibold">Record tab</p>
            <FaMicrophoneAlt className="h-4 w-4" />
          </div>

          <div className="baseVertFlex lightestGlassmorphic max-w-[23rem] gap-2 rounded-md p-2 text-sm">
            <HiOutlineInformationCircle className="h-5 w-5" />
            <p className="text-center">
              Thank you for creating an official recording of your tab to play
              along with! Make sure your microphone is closeby and has a clear
              pickup of your guitar.
            </p>
          </div>

          {/* microphone access denied message */}
          {microphoneAccessHasBeenDenied && (
            <div className="baseVertFlex max-w-[23rem] gap-2 rounded-md bg-red-700 p-2 text-sm">
              <div className="baseFlex gap-2">
                <BiErrorCircle className="h-5 w-5" />
                <p className="font-semibold">Microphone access denied</p>
              </div>
              <p className="text-center">
                This site does not have access to your microphone. Please allow
                access in your browser&apos;s settings and refresh your page
                afterwords to record your tab.
              </p>
            </div>
          )}

          {/* current progress visualizer  */}
          <div className="baseFlex w-full gap-2 px-4 text-lg">
            <div
              className={`relative mr-1 h-4 w-4 rounded-full transition-colors
                            ${
                              isRecording && !showPostRecordingOptions
                                ? "bg-red-600"
                                : "bg-red-600/50"
                            }`}
            >
              <div
                className={`absolute left-0 top-0 h-4 w-4 rounded-full bg-red-600 transition-colors
                            ${
                              isRecording && !showPostRecordingOptions
                                ? "animate-ping "
                                : "bg-transparent"
                            }
                          `}
              ></div>
            </div>
            <p>{formatSecondsToMinutes(recordingTime)}</p>
            <Progress
              value={(recordingTime / 300) * 100}
              max={300}
              className="w-1/2"
            />
            <p>5:00</p>
          </div>

          <div className="baseVertFlex gap-3">
            {/* start/stop recording button */}
            <Popover open={showPostRecordingOptions}>
              <PopoverTrigger asChild>
                <Button
                  variant={"recording"}
                  disabled={
                    showPostRecordingOptions || microphoneAccessHasBeenDenied
                  }
                  onClick={() => {
                    if (isRecording) {
                      togglePauseResume();
                      setShowPostRecordingOptions(true);
                    } else {
                      startRecording();
                    }
                  }}
                  className="baseFlex gap-2"
                >
                  {!isRecording ? (
                    <>
                      Start recording
                      <FaMicrophoneAlt className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Stop recording
                      <BsStopFill className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="baseVertFlex !flex-nowrap gap-4 p-2"
                side="bottom"
              >
                <p className="w-auto">
                  {localHasRecordedAudio
                    ? "Replace current recording?"
                    : "Save recording?"}
                </p>

                <div className="baseFlex gap-2">
                  <Button
                    variant={"outline"}
                    onClick={() => {
                      blockSaveRecordingRef.current = true;
                      stopRecording();
                      setShowPostRecordingOptions(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      stopRecording();
                      setShowPostRecordingOptions(false);
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* delete current recording button */}
            <AnimatePresence mode="wait">
              {localHasRecordedAudio && (
                <motion.div
                  key={"DeleteRecordingButton"}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    duration: 0.15,
                  }}
                >
                  <Button
                    variant={"destructive"}
                    disabled={isRecording}
                    onClick={() => {
                      setLocalHasRecordedAudio(false);
                      setLocalRecordedAudioFile(null);

                      if (hasRecordedAudio) {
                        setLocalRecordingDiffersFromStoreValue(true);
                      } else {
                        setLocalRecordingDiffersFromStoreValue(false);
                      }
                    }}
                    className="baseFlex gap-2"
                  >
                    Delete current recording
                    <FaTrashAlt className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* prob want to stop any recording if it's going when close/save is hit? */}
          <div className="baseFlex gap-4">
            <Button
              variant={"secondary"}
              onClick={() => {
                if (isRecording) {
                  togglePauseResume();
                }
                setShowAudioRecorderModal(false);
              }}
            >
              Close
            </Button>
            <Button
              disabled={!localRecordingDiffersFromStoreValue}
              onClick={handleSaveRecording}
            >
              Save
            </Button>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default AudioRecorderModal;
