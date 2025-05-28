import Image from "next/image";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { Area, Point } from "react-easy-crop";
import { FiUpload } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { MdCrop } from "react-icons/md";
import { Drawer, DrawerContent, DrawerPortal } from "~/components/ui/drawer";
import EditImage from "~/components/Profile/EditImage";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { AnimatePresence, motion } from "framer-motion";
import type { LocalSettings } from "~/pages/profile/settings";

// Helper to read file as data URL
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file as data URL"));
        }
      },
      false,
    );
    reader.readAsDataURL(file);
  });
}

interface EditImageSelector {
  imageBeingEdited: string | null;
  setNewProfileImage: Dispatch<SetStateAction<string | null>>;
  setImageBeingEdited: Dispatch<SetStateAction<string | null>>;
  setShowEditImageModal: Dispatch<SetStateAction<boolean>>;
  crop: Point;
  setCrop: Dispatch<SetStateAction<Point>>;
  rotation: number;
  setRotation: Dispatch<SetStateAction<number>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  croppedAreaPixels: Area | null;
  setCroppedAreaPixels: Dispatch<SetStateAction<Area | null>>;
  newProfileImage: string | null;
  localSettings: LocalSettings | null;
}

function EditImageSelector({
  imageBeingEdited,
  setNewProfileImage,
  setImageBeingEdited,
  setShowEditImageModal,
  crop,
  setCrop,
  rotation,
  setRotation,
  zoom,
  setZoom,
  croppedAreaPixels,
  setCroppedAreaPixels,
  newProfileImage,
  localSettings,
}: EditImageSelector) {
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);
  const [drawerIsOpen, setDrawerIsOpen] = useState(false);

  // used to prevent accidental closing of the drawer when editing an image
  const [activelyEditingImage, setActivelyEditingImage] = useState(false);

  const isAboveLgViewport = useViewportWidthBreakpoint(1024);

  async function onFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    if (e.target.files && e.target.files.length > 0 && e.target.files[0]) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);

      if (isAboveLgViewport) {
        setShowEditImageModal(true);
      } else {
        setDrawerIsOpen(!isAboveLgViewport);
      }
      setImageBeingEdited(imageDataUrl);
    }
  }

  function resetImageEditStates() {
    setNewProfileImage(null);
    setImageBeingEdited(null);

    setCrop({ x: 0, y: 0 });
    setRotation(0);
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  return (
    <div className="baseVertFlex relative w-full !items-start gap-2 lg:!flex-row lg:!justify-between">
      <span className="text-xl font-medium !text-pink-50 lg:text-2xl">
        Profile image
      </span>

      <div className="baseFlex w-full !justify-between gap-8 lg:w-auto lg:!justify-center">
        <motion.div
          key={localSettings ? "loadedProfileImage" : "loadingProfileImage"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="baseFlex relative"
        >
          {localSettings ? (
            <>
              <Image
                src={newProfileImage ?? localSettings.profileImageUrl}
                alt="User's profile image"
                width={500}
                height={500}
                onLoad={() => {
                  setTimeout(() => {
                    setProfileImageLoaded(true);
                  }, 100); // unsure if this is necessary, but it felt too flickery without it
                }}
                style={{
                  opacity: profileImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
                }}
                className="size-16 rounded-full shadow-sm lg:size-32"
              />

              <AnimatePresence>
                {!profileImageLoaded && (
                  <motion.div
                    key={"loadingProfileImage-x2"}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pulseAnimation absolute inset-0 z-10 size-16 rounded-full bg-pink-300 lg:size-32"
                  ></motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="pulseAnimation size-16 rounded-full bg-pink-300 shadow-sm lg:size-32"></div>
          )}
        </motion.div>

        <div className="baseFlex gap-3 lg:!flex-col">
          {newProfileImage ? (
            <Button
              variant={"outline"}
              disabled={!localSettings || !profileImageLoaded}
              onClick={() => {
                resetImageEditStates();
              }}
              className="baseFlex w-28 gap-1"
            >
              <IoClose className="size-[19px]" />
              Discard
            </Button>
          ) : (
            <>
              <input
                type="file"
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
                id="file-upload"
              />
              <Button
                variant={"outline"}
                disabled={!localSettings || !profileImageLoaded}
                asChild
              >
                <label
                  htmlFor="file-upload"
                  className="baseFlex w-28 cursor-pointer gap-2"
                >
                  <FiUpload className="size-4" />
                  Upload
                </label>
              </Button>
            </>
          )}

          <Button
            variant={"outline"}
            disabled={!newProfileImage}
            onClick={() => {
              if (isAboveLgViewport) {
                setShowEditImageModal(true);
              } else {
                setDrawerIsOpen(true);
              }
            }}
            className="baseFlex w-28 gap-2"
          >
            <MdCrop className="size-4" />
            Edit
          </Button>
        </div>
      </div>

      {!isAboveLgViewport && (
        <Drawer
          open={drawerIsOpen}
          handleOnly={activelyEditingImage} // FYI: using this because "dismissable" prop wasn't fast enough in responding to user input
          onOpenChange={(open) => {
            setDrawerIsOpen(open);
          }}
        >
          <DrawerPortal>
            <DrawerContent
              style={{
                textShadow: "none",
              }}
              className="baseVertFlex fixed bottom-0 left-0 right-0 h-[75dvh] max-h-[500px] !items-start !justify-start rounded-t-2xl bg-pink-100 pt-4 text-pink-950"
            >
              <Separator className="mt-2 w-full bg-stone-400" />

              <EditImage
                imageBeingEdited={imageBeingEdited}
                setNewProfileImage={setNewProfileImage}
                setShowEditImageModal={setShowEditImageModal}
                crop={crop}
                setCrop={setCrop}
                rotation={rotation}
                setRotation={setRotation}
                zoom={zoom}
                setZoom={setZoom}
                croppedAreaPixels={croppedAreaPixels}
                setCroppedAreaPixels={setCroppedAreaPixels}
                setActivelyEditingImage={setActivelyEditingImage}
                setDrawerIsOpen={setDrawerIsOpen}
              />
            </DrawerContent>
          </DrawerPortal>
        </Drawer>
      )}
    </div>
  );
}

export default EditImageSelector;
