import { useAuth } from "@clerk/nextjs";
import FocusTrap from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AiOutlineWarning } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import { shallow } from "zustand/shallow";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

function DeleteAccountModal() {
  const { push } = useRouter();
  const ctx = api.useContext();
  const { userId } = useAuth();

  const [deleteAllOfArtistsTabs, setDeleteAllOfArtistsTabs] = useState(false);
  const [showDeleteCheckmark, setShowDeleteCheckmark] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const { setShowDeleteAccountModal } = useTabStore(
    (state) => ({
      setShowDeleteAccountModal: state.setShowDeleteAccountModal,
    }),
    shallow
  );

  const { mutate: deleteAccount, isLoading: isDeleting } =
    api.artist.deleteArtist.useMutation({
      onSuccess: () => {
        setShowDeleteCheckmark(true);

        setTimeout(() => {
          void push(`/`);
        }, 500);
      },
      onError: (e) => {
        //  const errorMessage = e.data?.zodError?.fieldErrors.content;
        //  if (errorMessage && errorMessage[0]) {
        //    toast.error(errorMessage[0]);
        //  } else {
        //    toast.error("Failed to post! Please try again later.");
        //  }
      },
      onSettled: () => {
        void ctx.artist.getByIdOrUsername.invalidate();
      },
    });

  return (
    <motion.div
      key={"DeleteAccountModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      // choosing to not allow click outside to close modal
      // as a way to emphasize the importance of this action
    >
      <FocusTrap>
        <div
          tabIndex={-1}
          className="baseVertFlex w-[350px] gap-10 rounded-md bg-pink-400 p-2 shadow-sm sm:w-[675px] md:px-8 md:py-4"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowDeleteAccountModal(false);
            }
          }}
        >
          <div className="baseFlex lightGlassmorphic gap-2 rounded-md p-2 px-8 text-pink-100">
            <AiOutlineWarning className="h-5 w-5" />
            <p className="text-lg font-semibold">Delete account</p>
          </div>

          <div className="baseVertFlex gap-4">
            <p className="text-center font-semibold">
              Are you sure you want to delete your account? This action cannot
              be undone.
            </p>

            <div className="baseFlex !flex-nowrap !items-start gap-2">
              <Checkbox
                id="deleteTabs"
                checked={deleteAllOfArtistsTabs}
                onCheckedChange={(value) =>
                  setDeleteAllOfArtistsTabs(
                    value === "indeterminate" ? false : value
                  )
                }
                className="ml-4 mt-1 h-5 w-5"
              />
              <div className="baseVertFlex !items-start">
                <label htmlFor="deleteTabs">
                  Delete all of my tabs along with my account.
                </label>
                <p className="text-sm text-pink-200">
                  Leaving this unchecked will preserve your tabs, while
                  displaying the artist as &ldquo;Anonymous&rdquo;.
                </p>
              </div>
            </div>
          </div>

          <div className="baseFlex gap-4">
            <Button
              variant={"secondary"}
              onClick={() => {
                setShowDeleteAccountModal(false);
              }}
            >
              Cancel
            </Button>

            <Button
              variant={"destructive"}
              className="baseFlex gap-2"
              onClick={() => {
                if (!userId) return;

                deleteAccount({
                  userId,
                  deleteAllOfArtistsTabs,
                });
              }}
            >
              {isDeleting || showDeleteCheckmark
                ? "Deleting account"
                : "Delete account"}
              <FaTrashAlt className="h-4 w-4" />

              <AnimatePresence mode="wait">
                {isDeleting && (
                  <motion.svg
                    key="postingLoadingSpinner"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "24px" }}
                    transition={{
                      duration: 0.15,
                    }}
                    className="h-6 w-6 animate-spin rounded-full bg-inherit fill-none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </motion.svg>
                )}

                {showDeleteCheckmark && (
                  <motion.div
                    key="postingSuccessCheckmark"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.25,
                    }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default DeleteAccountModal;
