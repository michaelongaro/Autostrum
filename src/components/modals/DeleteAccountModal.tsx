import { useAuth } from "@clerk/nextjs";
import { FocusTrap } from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useState, type Dispatch, type SetStateAction } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";
import { IoWarningOutline } from "react-icons/io5";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import { IoClose } from "react-icons/io5";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

// FYI: this should surely be an <AlertDialog> right?

interface DeleteAccountModal {
  setShowDeleteAccountModal: Dispatch<SetStateAction<boolean>>;
}

function DeleteAccountModal({ setShowDeleteAccountModal }: DeleteAccountModal) {
  const { push, reload } = useRouter();
  const { userId } = useAuth();
  const ctx = api.useUtils();

  const [anonymizeUserTabs, setAnonymizeUserTabs] = useState(true);
  const [showDeleteCheckmark, setShowDeleteCheckmark] = useState(false);

  const { isLoadingARoute } = useTabStore((state) => ({
    isLoadingARoute: state.isLoadingARoute,
  }));

  useModalScrollbarHandling();

  const { mutate: deleteAccount, isLoading: isDeleting } =
    api.user.delete.useMutation({
      onSuccess: () => {
        setShowDeleteCheckmark(true);

        setTimeout(() => {
          void push(`/`).then(() => {
            void reload();
          });
        }, 1000);
      },
      onError: (e) => {
        console.error("Error deleting account:", e);
      },
      onSettled: () => {
        void ctx.user.getById.invalidate(userId!);
      },
    });

  return (
    <motion.div
      key={"DeleteAccountModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/60 backdrop-blur-sm"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
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
        <div
          tabIndex={-1}
          className="baseVertFlex w-[350px] gap-10 rounded-md bg-pink-400 p-4 shadow-sm sm:w-[500px]"
        >
          <div className="baseFlex w-full !justify-between gap-2">
            <div className="baseFlex gap-2">
              <IoWarningOutline className="size-6" />
              <span className="text-lg font-medium">Delete account</span>
            </div>

            <Button
              variant={"text"}
              className="!size-8 shrink-0 !p-0"
              onClick={() => {
                setShowDeleteAccountModal(false);
              }}
            >
              <IoClose className="size-5 text-pink-50" />
            </Button>
          </div>

          <div className="baseVertFlex gap-4 text-sm md:text-base">
            <div className="baseVertFlex">
              <p className="text-center font-medium">
                Are you sure you want to delete your account?
              </p>
              <p className="text-center font-medium">
                This action cannot be undone.
              </p>
            </div>

            <div className="lightestGlassmorphic baseFlex !items-start gap-4 rounded-md p-4">
              <Checkbox
                id="deleteTabs"
                checked={anonymizeUserTabs}
                onCheckedChange={(value) =>
                  setAnonymizeUserTabs(
                    value === "indeterminate" ? false : value,
                  )
                }
                className="mt-1 h-5 w-5"
              />
              <div className="baseVertFlex !items-start gap-2">
                <label htmlFor="deleteTabs">
                  Anonymize my tabs instead of deleting them
                </label>
                <p className="text-sm text-pink-200">
                  Checking this will preserve your tabs, and will display the
                  associated user who created them as &ldquo;Anonymous&rdquo;.
                </p>
              </div>
            </div>
          </div>

          <Button
            disabled={isDeleting || isLoadingARoute || showDeleteCheckmark}
            variant={"destructive"}
            className="baseFlex gap-2 self-end overflow-hidden"
            onClick={() => {
              if (!userId) return;

              deleteAccount({
                userId,
                anonymizeUserTabs,
              });
            }}
          >
            <AnimatePresence mode={"wait"} initial={false}>
              <motion.div
                key={
                  isDeleting
                    ? "deleting"
                    : showDeleteCheckmark
                      ? "checkmark"
                      : "default"
                }
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{
                  duration: 0.25,
                  opacity: {
                    duration: 0.15,
                  },
                }}
                className="baseFlex w-[200px] gap-2 overflow-hidden"
              >
                {!isDeleting && !showDeleteCheckmark && (
                  <>
                    <FaTrashAlt className="h-4 w-4" />
                    <span>Yes, delete my account</span>
                  </>
                )}

                {isDeleting && (
                  <>
                    <span>Deleting account</span>
                    <svg
                      className="size-4 animate-stableSpin rounded-full bg-inherit fill-none"
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
                    </svg>
                  </>
                )}

                {!isDeleting && showDeleteCheckmark && (
                  <>
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="size-5 text-pink-50"
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
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </Button>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default DeleteAccountModal;
