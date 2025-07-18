import { motion } from "framer-motion";
import { type Dispatch, type SetStateAction } from "react";
import { type Area, type Point } from "react-easy-crop";
import FocusLock from "react-focus-lock";
import EditImage from "~/components/Profile/EditImage";

interface EditImageModal {
  imageBeingEdited: string | null;
  setNewProfileImage: Dispatch<SetStateAction<string | null>>;
  setShowEditImageModal: Dispatch<SetStateAction<boolean>>;
  crop: Point;
  setCrop: Dispatch<SetStateAction<Point>>;
  rotation: number;
  setRotation: Dispatch<SetStateAction<number>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  croppedAreaPixels: Area | null;
  setCroppedAreaPixels: Dispatch<SetStateAction<Area | null>>;
}

function EditImageModal({
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
}: EditImageModal) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/60 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowEditImageModal(false);
        }
      }}
    >
      <FocusLock autoFocus={false} returnFocus={true} persistentFocus={true}>
        <div
          tabIndex={-1}
          className="baseVertFlex modalGradient relative size-[500px] gap-4 rounded-lg border p-4 shadow-sm"
        >
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
          />
        </div>
      </FocusLock>
    </motion.div>
  );
}

export default EditImageModal;
