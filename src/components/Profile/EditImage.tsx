import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { MdCrop } from "react-icons/md";
import { Button } from "~/components/ui/button";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { X } from "lucide-react";

// Helper to create an image element from a URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (event) => {
      // Wrap the event in an Error object
      const errorMsg =
        event instanceof ErrorEvent ? event.message : "Image load error";
      reject(new Error(errorMsg));
    });
    // Ensure crossOrigin is set for images from other domains to prevent canvas tainting
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

// Helper to convert degrees to radians
function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

// Helper to calculate the bounding box of a rotated rectangle
function rotateSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const rotRad = getRadianAngle(rotation);

  // 1. Calculate the bounding box of the entire image if it were rotated
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.naturalWidth,
    image.naturalHeight,
    rotation,
  );

  // 2. Set the temporary canvas size to this bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // 3. Translate canvas context to its center, rotate, and translate back
  //    by half of the original image's dimensions. This rotates the image
  //    around its own center.
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);

  // 4. Draw the entire original image, now rotated, onto the temporary canvas
  ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

  // 5. Extract the cropped image data from this canvas.
  //    `pixelCrop.x` and `pixelCrop.y` are coordinates relative to the top-left
  //    of the rotated image view that `react-easy-crop` displays.
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  );

  // 6. Set the final canvas size to the actual crop dimensions
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 7. Paste the extracted ImageData onto the final canvas
  ctx.putImageData(data, 0, 0);

  // 8. Convert to base64.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty after cropping"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read blob as data URL"));
          }
        };
        reader.onerror = (event) => {
          // Wrap the ProgressEvent in an Error object
          console.error("FileReader error:", event);
          reject(new Error("FileReader failed to read blob."));
        };
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.9,
    );
  });
}

interface EditImage {
  imageBeingEdited: string | null;
  setNewProfileImage: Dispatch<SetStateAction<string | null>>;
  setShowEditImageModal: Dispatch<SetStateAction<boolean>>;
  // passing these in so that you can re-edit the image if needed
  crop: Point;
  setCrop: Dispatch<SetStateAction<Point>>;
  rotation: number;
  setRotation: Dispatch<SetStateAction<number>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  croppedAreaPixels: Area | null;
  setCroppedAreaPixels: Dispatch<SetStateAction<Area | null>>;
  setActivelyEditingImage?: Dispatch<SetStateAction<boolean>>;
  setDrawerIsOpen?: Dispatch<SetStateAction<boolean>>;
}

function EditImage({
  imageBeingEdited,
  setNewProfileImage,
  setShowEditImageModal,
  crop,
  setCrop,
  rotation,
  setRotation,
  zoom,
  setZoom,
  croppedAreaPixels,
  setCroppedAreaPixels,
  setActivelyEditingImage,
  setDrawerIsOpen,
}: EditImage) {
  const [localCrop, setLocalCrop] = useState<Point>(crop);
  const [localRotation, setLocalRotation] = useState<number>(rotation);
  const [localZoom, setLocalZoom] = useState<number>(zoom);
  const [localCroppedAreaPixels, setLocalCroppedAreaPixels] =
    useState<Area | null>(croppedAreaPixels);

  const [saveButtonText, setSaveButtonText] = useState("Save");

  const cropperRef = useRef<HTMLDivElement>(null);

  const isAboveLgViewport = useViewportWidthBreakpoint(1024);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setLocalCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function handleSave(): Promise<void> {
    if (!localCroppedAreaPixels || !imageBeingEdited) return;

    setSaveButtonText("Saving");

    try {
      const croppedImageBase64 = await getCroppedImg(
        imageBeingEdited,
        localCroppedAreaPixels,
        localRotation,
      );

      setTimeout(() => {
        setSaveButtonText("");
      }, 2000);

      setTimeout(() => {
        // FYI: no need to reset saveButtonText since the drawer/modal will close
        // and this component will unmount

        // update the parent state with local crop, rotation, and zoom
        setCrop(localCrop);
        setRotation(localRotation);
        setZoom(localZoom);
        setCroppedAreaPixels(localCroppedAreaPixels);

        // Set the new profile image
        setNewProfileImage(croppedImageBase64);

        // Close the drawer / modal
        if (isAboveLgViewport) {
          setShowEditImageModal(false);
        } else {
          setDrawerIsOpen?.(false);
        }
      }, 4000);
    } catch (e) {
      console.error("Error saving image:", e);
      alert("Error saving image. Please try again.");
    }
  }

  function resetCrop() {
    setLocalCrop({ x: 0, y: 0 });
    setLocalRotation(0);
    setLocalZoom(1);
  }

  useEffect(() => {
    const container = cropperRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        // You can adjust the sensitivity here
        setLocalRotation((prev) => {
          let next = prev + e.deltaY * 0.1;
          // Clamp between 0 and 360
          if (next < 0) next += 360;
          if (next >= 360) next -= 360;
          return Math.round(next);
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [imageBeingEdited]);

  return (
    <div className="baseVertFlex size-full gap-2 p-4 md:gap-0 lg:gap-4 lg:p-0">
      <div className="baseFlex w-full !justify-start gap-2 lg:!justify-between">
        <div className="baseFlex gap-2">
          <MdCrop className="size-4 lg:size-5" />
          <span className="lg:text-lg">Edit image</span>
        </div>

        <Button
          variant={"modalClose"}
          className="!hidden shrink-0 lg:!flex"
          onClick={() => {
            setShowEditImageModal(false);
          }}
        >
          <X className="size-5" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {imageBeingEdited && (
        <>
          <div className="baseFlex w-full !justify-between gap-2 text-sm text-foreground/75">
            <div>
              <span className="font-semibold">Crop size:</span>{" "}
              {Math.round(
                localCroppedAreaPixels ? localCroppedAreaPixels.width : 0,
              )}{" "}
              x{" "}
              {Math.round(
                localCroppedAreaPixels ? localCroppedAreaPixels.height : 0,
              )}{" "}
              px
              <AnimatePresence>
                {Math.round(
                  localCroppedAreaPixels ? localCroppedAreaPixels.width : 0,
                ) < 500 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    {"≥"} 500px dimensions are preferred.
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div
            ref={cropperRef}
            className="baseFlex bg-gray-800 relative h-[70%] w-full overflow-hidden rounded-lg lg:h-[300px]"
          >
            <Cropper
              image={imageBeingEdited}
              crop={localCrop}
              rotation={localRotation}
              zoom={localZoom}
              aspect={1}
              cropShape="round"
              showGrid={true}
              onCropChange={setLocalCrop}
              onRotationChange={setLocalRotation}
              onZoomChange={setLocalZoom}
              onCropComplete={onCropComplete}
              onInteractionStart={() => {
                setActivelyEditingImage?.(true);
              }}
              onInteractionEnd={() => {
                setActivelyEditingImage?.(false);
              }}
            />
          </div>

          <div className="baseFlex !hidden w-full !justify-between text-sm text-foreground/75 lg:!flex">
            <div className="baseFlex gap-2">
              <span className="font-semibold">Pan:</span>
              <span>Click + drag</span>
            </div>
            <div className="baseFlex gap-2">
              <span className="font-semibold">Zoom:</span>
              <span>Scroll wheel</span>
            </div>
            <div className="baseFlex gap-2">
              <span className="font-semibold">Rotate:</span>
              <span>Ctrl + Scroll wheel</span>
            </div>
          </div>

          <div className="baseFlex mt-8 w-full !justify-between gap-4 px-8 lg:mt-0 lg:px-0">
            <Button
              variant={"outline"}
              className="w-32 lg:w-auto"
              onClick={resetCrop}
            >
              Reset
            </Button>

            <Button
              onClick={handleSave}
              disabled={saveButtonText !== "Save" || !localCroppedAreaPixels}
              className="overflow-hidden px-8"
            >
              <AnimatePresence mode={"wait"} initial={false}>
                <motion.div
                  key={saveButtonText}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{
                    duration: 0.25,
                    opacity: {
                      duration: 0.15,
                    },
                  }}
                  className="baseFlex w-24 gap-2 overflow-hidden"
                >
                  {saveButtonText}
                  {saveButtonText === "Saving" && (
                    <div
                      className="inline-block size-4 animate-spin rounded-full border-[2px] border-primary-foreground border-t-transparent text-primary-foreground"
                      role="status"
                      aria-label="loading"
                    >
                      <span className="sr-only">Loading...</span>
                    </div>
                  )}
                  {saveButtonText === "" && (
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="size-5 text-primary-foreground"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          delay: 0.2,
                          type: "tween",
                          ease: "easeOut",
                          duration: 0.3,
                        }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </motion.div>
              </AnimatePresence>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default EditImage;
