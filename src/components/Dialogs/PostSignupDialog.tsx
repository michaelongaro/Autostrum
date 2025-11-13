import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { FaUser } from "react-icons/fa";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "~/utils/api";
import { useTabStore } from "~/stores/TabStore";
import { IoClose } from "react-icons/io5";
import { Check } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import debounce from "lodash.debounce";
import ThemePicker from "~/components/Header/ThemePicker";

function PostSignupDialog() {
  const { user } = useClerk();
  const { isSignedIn } = useAuth();
  // const { push } = useRouter();
  const ctx = api.useUtils();

  const { color } = useTabStore((state) => ({
    color: state.color,
  }));

  const { data: userIsRegistered, isLoading: isLoadingUserRegistrationStatus } =
    api.user.isUserRegistered.useQuery(undefined, {
      enabled: isSignedIn,
    });

  // const localStorageRedirectRoute = useLocalStorageValue(
  //   "autostrum-redirect-route",
  // );

  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [usernameInputHasReceivedFocus, setUsernameInputHasReceivedFocus] =
    useState(false);

  const debouncedSetUsername = useMemo(
    () =>
      debounce((username: string) => {
        setDebouncedUsername(username);
      }, 500),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSetUsername.cancel(); // Cancel any pending executions
    };
  }, [debouncedSetUsername]);

  const [saveButtonText, setSaveButtonText] = useState("Save");

  const { mutate: createUser } = api.user.create.useMutation({
    onSettled: async () => {
      // if (localStorageRedirectRoute.value) {
      //   void push(localStorageRedirectRoute.value as string);
      //   localStorageRedirectRoute.remove();

      //   // should invalidate the user registration status query
      // } else {
      //   void push("/");
      // }

      // show checkmark for a second
      setTimeout(() => {
        setSaveButtonText("");
      }, 1000);

      setTimeout(() => {
        void ctx.user.isUserRegistered.invalidate();
        void ctx.user.getById.invalidate(user?.id);
      }, 2000);
    },
  });

  const { data: usernameIsAvailable } = api.user.isUsernameAvailable.useQuery(
    debouncedUsername,
    {
      enabled: debouncedUsername.length > 0,
    },
  );

  return (
    <AlertDialog open={userIsRegistered === false && isSignedIn}>
      <VisuallyHidden>
        <AlertDialogTitle>Finish setting up your account</AlertDialogTitle>
        <AlertDialogDescription>
          You&apos;re almost there! Please finish setting up your account by
          entering a username and selecting a theme color.
        </AlertDialogDescription>
      </VisuallyHidden>

      <AlertDialogContent className="baseVertFlex max-h-[90dvh] max-w-[350px] !justify-start gap-8 overflow-y-auto rounded-lg sm:max-w-[500px]">
        <div className="baseFlex w-full !justify-start gap-2 text-lg font-semibold">
          <FaUser className="size-5" />
          Finish setting up your account
        </div>

        {/* username input + availability checker */}
        <div className="baseVertFlex w-full !items-start gap-2">
          <Label
            htmlFor="username"
            className="text-lg font-medium !text-foreground"
          >
            Username
          </Label>

          <div className="baseVertFlex relative mb-2 !items-start">
            <Input
              id="username"
              type="text"
              value={username}
              placeholder="Enter your username"
              className="w-[275px] !text-foreground"
              onBlur={() => setUsernameInputHasReceivedFocus(true)}
              onChange={(e) => {
                const username = e.target.value;
                setUsername(username);

                const trimmedUsername = username.trim();
                debouncedSetUsername(trimmedUsername);
              }}
            />

            <AnimatePresence>
              {usernameInputHasReceivedFocus &&
                (username.length === 0 ||
                  usernameIsAvailable !== undefined) && (
                  <motion.div
                    key={"usernameCriteria"}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      transition: {
                        opacity: {
                          duration: 0.15,
                          delay: 0.15,
                        },
                      },
                    }}
                    exit={{
                      opacity: 0,
                      transition: {
                        opacity: {
                          duration: 0.15,
                        },
                      },
                    }}
                    transition={{ duration: 0.35 }}
                    className="baseFlex absolute left-0 top-12 h-[14px] gap-2 text-nowrap text-sm font-medium !text-foreground/75"
                  >
                    {username.length === 0 || !usernameIsAvailable ? (
                      <motion.div
                        key={"usernameErrorIcon"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-full bg-destructive p-0.5"
                      >
                        <IoClose className="size-3 text-primary-foreground" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={"usernameCheckIcon"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-full bg-green-600 p-0.5"
                      >
                        <Check className="size-3 text-primary-foreground" />
                      </motion.div>
                    )}

                    {username.length === 0 || !usernameIsAvailable ? (
                      <motion.span
                        key={
                          username.length === 0
                            ? "usernameEmptyText"
                            : "usernameNotAvailableText"
                        }
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {username.length === 0
                          ? "Please enter a username"
                          : "Username is not available"}
                      </motion.span>
                    ) : (
                      <motion.span
                        key={"usernameAvailableText"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        Username is available
                      </motion.span>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
        </div>

        <ThemePicker allowUpdateOfDBColor={false} />

        <Button
          disabled={
            username === "" ||
            !usernameIsAvailable ||
            isLoadingUserRegistrationStatus ||
            saveButtonText !== "Save"
          }
          onClick={() => {
            if (!user) return;

            setSaveButtonText("Saving");

            createUser({
              profileImageUrl: user.imageUrl,
              username,
              color,
            });
          }}
          className="baseFlex gap-2 self-end overflow-hidden"
        >
          <AnimatePresence mode={"wait"} initial={false}>
            <motion.div
              key={
                saveButtonText === "" ? "saveButtonText-empty" : saveButtonText
              }
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                duration: 0.25,
              }}
              className="baseFlex w-[122.75px] gap-2 overflow-hidden"
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
                  className="size-5"
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
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default PostSignupDialog;
