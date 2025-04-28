import { useAuth } from "@clerk/nextjs";
import { FocusTrap } from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { AiOutlineWarning } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";
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
  const { push, reload } = useRouter();
  const ctx = api.useUtils();
  const { userId } = useAuth();

  const [deleteAllOfArtistsTabs, setDeleteAllOfArtistsTabs] = useState(true);
  const [showDeleteCheckmark, setShowDeleteCheckmark] = useState(false);

  const { isLoadingARoute, setShowDeleteAccountModal } = useTabStore(
    (state) => ({
      isLoadingARoute: state.isLoadingARoute,
      setShowDeleteAccountModal: state.setShowDeleteAccountModal,
    }),
  );

  useModalScrollbarHandling();

  const { mutate: deleteAccount, isLoading: isDeleting } =
    api.user.delete.useMutation({
      onSuccess: () => {
        setShowDeleteCheckmark(true);

        setTimeout(() => {
          void push(`/`).then(() => {
            void reload();
          });
        }, 250);

        setTimeout(() => {
          setShowDeleteCheckmark(false);
        }, 1500);
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
        void ctx.user.getByIdOrUsername.invalidate();
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
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowDeleteAccountModal(false);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
        }}
      >
        <div className="baseVertFlex w-[350px] gap-10 rounded-md bg-pink-400 p-2 shadow-sm sm:w-[700px] md:px-8 md:py-4">
          <div className="baseFlex lightestGlassmorphic gap-2 rounded-md p-2 px-8 text-pink-100">
            <AiOutlineWarning className="h-5 w-5" />
            <p className="text-lg font-semibold">Delete account</p>
          </div>

          <div className="baseVertFlex gap-4">
            <p className="text-center font-bold">
              Are you sure you want to delete your account? This action cannot
              be undone.
            </p>

            <div className="lightestGlassmorphic baseFlex !flex-nowrap !items-start gap-4 rounded-md p-4">
              <Checkbox
                id="deleteTabs"
                checked={deleteAllOfArtistsTabs}
                onCheckedChange={(value) =>
                  setDeleteAllOfArtistsTabs(
                    value === "indeterminate" ? false : value,
                  )
                }
                className="mt-1 h-5 w-5"
              />
              <div className="baseVertFlex !items-start">
                <label htmlFor="deleteTabs">
                  Delete all of my tabs along with my account.
                </label>
                <p className="text-sm text-pink-200">
                  Leaving this unchecked will preserve your tabs, and will
                  display the artist as &ldquo;Anonymous&rdquo;.
                </p>
              </div>
            </div>
          </div>

          <div className="baseFlex gap-4">
            <Button
              variant={"ghost"}
              onClick={() => {
                setShowDeleteAccountModal(false);
              }}
            >
              Cancel
            </Button>

            <Button
              disabled={isDeleting || isLoadingARoute || showDeleteCheckmark}
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
              {showDeleteCheckmark && !isDeleting
                ? "Deleted account"
                : isDeleting
                  ? "Deleting account"
                  : "Delete account"}
              <FaTrashAlt className="h-4 w-4" />

              <AnimatePresence mode="wait">
                {isDeleting && (
                  <motion.svg
                    key="deleteAccountLoadingSpinner"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "24px" }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.15,
                    }}
                    className="h-6 w-6 animate-stableSpin rounded-full bg-inherit fill-none"
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
                    key="deleteAccountSuccessCheckmark"
                    initial={{ opacity: 0, width: "20px" }}
                    animate={{ opacity: 1, width: "20px" }}
                    exit={{ opacity: 0, width: 0 }}
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
