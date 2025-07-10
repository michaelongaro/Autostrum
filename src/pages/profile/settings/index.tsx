import { useAuth, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { api } from "~/utils/api";
import dynamic from "next/dynamic";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { IoClose } from "react-icons/io5";
import { FaTrashAlt } from "react-icons/fa";
import { MdOutlineInfo } from "react-icons/md";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";
import { HiMiniComputerDesktop } from "react-icons/hi2";
import PinnedTabSelector from "~/components/Profile/PinnedTabSelector";
import type { Area, Point } from "react-easy-crop";
import { Check } from "lucide-react";
import EditImageSelector from "~/components/Profile/EditImageSelector";
import Ellipsis from "~/components/ui/icons/Ellipsis";

const EditImageModal = dynamic(
  () => import("~/components/modals/EditImageModal"),
);
const PinnedTabModal = dynamic(
  () => import("~/components/modals/PinnedTabModal"),
);
const DeleteAccountModal = dynamic(
  () => import("~/components/modals/DeleteAccountModal"),
);

export interface LocalSettings {
  emailAddress: string;
  username: string;
  passwordEnabled: boolean;
  profileImageUrl: string;
  pinnedTabId: number | null;
  theme: string; // TODO: add user email + theme to user model
}

function UserSettings() {
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();
  const ctx = api.useUtils();

  const [localSettings, setLocalSettings] = useState<LocalSettings | null>(
    null,
  );

  // separate so that we can just pass this specifically to the PinnedTabSelector
  const [localPinnedTabId, setLocalPinnedTabId] = useState<number | null>(null);
  const [usernameInputHasReceivedFocus, setUsernameInputHasReceivedFocus] =
    useState(false);
  const [saveButtonText, setSaveButtonText] = useState("Save");

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  const { mutate: updateUser } = api.user.update.useMutation({
    onSuccess: async () => {
      await ctx.user.getById.invalidate(userId!);

      setTimeout(() => {
        setSaveButtonText("");
        setUsernameInputHasReceivedFocus(false);
        setNewProfileImage(null);
        setEditingPassword(false);
      }, 2000);

      setTimeout(() => {
        setSaveButtonText("Save");
      }, 4000);
    },
    onError: (e) => {
      console.error(e);
    },
  });

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [imageBeingEdited, setImageBeingEdited] = useState<string | null>(null);
  // final image to be uploaded, stored in base64
  const [newProfileImage, setNewProfileImage] = useState<string | null>(null);

  // declaring here so that you can re-edit the image if needed
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [showPinnedTabModal, setShowPinnedTabModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const [showExtraSettingsPopover, setShowExtraSettingsPopover] =
    useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const newPasswordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  // initialize the localSettings state with the currentUser settings
  useEffect(() => {
    if (localSettings !== null || !clerkUser || !currentUser) return;

    setLocalSettings({
      emailAddress: clerkUser.emailAddresses[0]?.emailAddress || "",
      username: currentUser.username,
      passwordEnabled: clerkUser.passwordEnabled,
      profileImageUrl: currentUser.profileImageUrl,
      pinnedTabId: currentUser.pinnedTabId,
      theme: "Rose", //currentUser.theme, TODO: add user email + theme to user model
    });

    setLocalPinnedTabId(currentUser.pinnedTabId);
  }, [clerkUser, currentUser, localSettings]);

  return (
    <motion.div
      key={"userSettings"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full max-w-[1400px] !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>{`${localSettings?.username ? `${localSettings.username}` : "Tabs"} | Autostrum`}</title>
        <meta
          name="description"
          content={`Check out ${
            localSettings?.username
              ? `${localSettings.username}'s songs`
              : "this localSettings"
          } on Autostrum.`}
        />
        <meta
          property="og:title"
          content={`${localSettings?.username ? `${localSettings.username}` : "Artist"} | Autostrum`}
        ></meta>
        <meta
          property="og:url"
          content={`www.autostrum.com/localSettings/${localSettings?.username}`}
        />
        <meta
          property="og:description"
          content={`Check out ${
            localSettings?.username
              ? `${localSettings.username}'s songs`
              : "this currentUser"
          } on Autostrum.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/artistProfile.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-between px-4 lg:px-0">
          <span className="text-3xl font-semibold tracking-tight !text-foreground md:text-4xl lg:hidden">
            Settings
          </span>

          <div className="baseFlex !hidden gap-4 lg:!flex">
            <Button variant={"text"} asChild>
              <Link
                prefetch={false}
                href={"/profile/settings"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground hover:!text-foreground active:!text-foreground/75 lg:!text-4xl"
              >
                Settings
              </Link>
            </Button>
            <Button variant={"text"} asChild>
              <Link
                prefetch={false}
                href={"/profile/statistics"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:text-foreground/75 lg:!text-4xl"
              >
                Statistics
              </Link>
            </Button>
            <Button variant={"text"} asChild>
              <Link
                prefetch={false}
                href={"/profile/tabs/filters"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 lg:!text-4xl"
              >
                Tabs
              </Link>
            </Button>
            <Button variant={"text"} asChild>
              <Link
                prefetch={false}
                href={"/profile/bookmarks/filters"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 lg:!text-4xl"
              >
                Bookmarks
              </Link>
            </Button>
          </div>

          <Popover
            open={showExtraSettingsPopover}
            onOpenChange={setShowExtraSettingsPopover}
          >
            <PopoverTrigger asChild>
              <Button variant={"text"} className="!p-0">
                <Ellipsis className="size-[18px] text-foreground lg:size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side={"bottom"} align="end" className="w-fit">
              <Button
                variant={"destructive"}
                disabled={!localSettings}
                onClick={() => {
                  setShowExtraSettingsPopover(false);
                  setShowDeleteAccountModal(true);
                }}
                className="baseFlex gap-2 p-4"
              >
                <FaTrashAlt className="size-4" />
                Delete account
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        <AnimatePresence mode="popLayout">
          <div className="baseVertFlex w-full !items-start gap-4 border bg-muted p-4 py-6 shadow-lg md:rounded-lg md:p-8 lg:!flex-row lg:gap-12">
            <div className="baseVertFlex w-full !items-start gap-4 lg:gap-12">
              {/* email */}
              <div className="baseVertFlex w-full !items-start gap-2 lg:!flex-row lg:!items-center lg:!justify-between">
                <span className="text-xl font-medium !text-foreground lg:text-2xl">
                  Email
                </span>

                <motion.div
                  key={localSettings ? "loadedEmail" : "loadingEmail"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="baseFlex"
                >
                  {localSettings ? (
                    <span className="font-medium italic !text-foreground/75 lg:text-xl">
                      {localSettings.emailAddress}
                    </span>
                  ) : (
                    <div className="pulseAnimation h-6 w-48 rounded-md bg-pink-300 lg:h-7"></div>
                  )}
                </motion.div>
              </div>

              <Separator
                orientation="horizontal"
                className="h-[1px] w-full bg-foreground/50"
              />

              {/* username */}
              <div className="baseVertFlex w-full !items-start gap-2 lg:!flex-row lg:!justify-between">
                <Label
                  htmlFor={"username"}
                  className="text-xl font-medium !text-foreground lg:text-2xl"
                >
                  Username
                </Label>

                <div className="baseVertFlex !items-start">
                  <motion.div
                    key={localSettings ? "loadedUsername" : "loadingUsername"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="baseFlex"
                  >
                    {localSettings ? (
                      <Input
                        id="username"
                        type="text"
                        value={localSettings?.username}
                        placeholder="Enter your username"
                        className="w-[275px] !text-foreground"
                        onFocus={() => setUsernameInputHasReceivedFocus(true)}
                        onChange={(e) => {
                          setLocalSettings((prev) => ({
                            ...prev!,
                            username: e.target.value,
                          }));
                        }}
                      />
                    ) : (
                      <div className="pulseAnimation h-10 w-[275px] rounded-md bg-pink-300 lg:h-7"></div>
                    )}
                  </motion.div>

                  <AnimatePresence>
                    {usernameInputHasReceivedFocus && (
                      <motion.div
                        key={"usernameCriteria"}
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{
                          opacity: 1,
                          height: "14px",
                          marginTop: "0.5rem",
                          transition: {
                            opacity: {
                              duration: 0.15,
                              delay: 0.15,
                            },
                          },
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          marginTop: 0,
                          transition: {
                            opacity: {
                              duration: 0.15,
                            },
                          },
                        }}
                        transition={{ duration: 0.35 }}
                        className="baseFlex gap-2 text-nowrap text-sm font-medium !text-foreground/75"
                      >
                        {localSettings &&
                        (localSettings.username.length < 1 ||
                          localSettings.username.length > 20) ? (
                          <motion.div
                            key={"usernameErrorIcon"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="rounded-full bg-red-500 p-0.5"
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
                        Must be between 1 - 20 characters
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <Separator
                orientation="horizontal"
                className="h-[1px] w-full bg-foreground/50"
              />

              {/* password */}
              <div className="baseVertFlex relative w-full !items-start gap-2 lg:!flex-row lg:!items-start lg:!justify-between">
                <span className="text-xl font-medium !text-foreground lg:text-2xl">
                  Password
                </span>

                <div
                  className={`baseVertFlex !items-end ${editingPassword ? "gap-8" : "gap-2"}`}
                >
                  {editingPassword ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="baseVertFlex !items-start gap-2"
                    >
                      <Label
                        htmlFor={"newPassword"}
                        className="font-medium !text-foreground"
                      >
                        New password
                      </Label>

                      <div className="baseVertFlex relative !items-start gap-2">
                        <Input
                          id="newPassword"
                          type={showPasswords ? "text" : "password"}
                          maxLength={128}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter your new password"
                          className="w-full max-w-[275px] !text-foreground lg:w-[275px]"
                        />

                        <Button
                          variant={"text"}
                          className="absolute right-3 top-[14px] !size-4 !p-0"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          <motion.div
                            key={
                              showPasswords
                                ? "showNewPasswordIcon"
                                : "hideNewPasswordIcon"
                            }
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            {showPasswords ? (
                              <FaRegEyeSlash className="size-5 text-foreground" />
                            ) : (
                              <FaRegEye className="size-5 text-foreground" />
                            )}
                          </motion.div>
                        </Button>

                        <div className="baseFlex gap-2 text-sm font-medium !text-foreground/75">
                          {newPassword.length < 8 ? (
                            <motion.div
                              key={"newPasswordErrorIcon"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="rounded-full bg-red-500 p-0.5"
                            >
                              <IoClose className="size-3 text-foreground" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key={"newPasswordCheckIcon"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="rounded-full bg-green-600 p-0.5"
                            >
                              <Check className="size-3 text-foreground" />
                            </motion.div>
                          )}
                          Must be greater than 8 characters
                        </div>
                      </div>

                      <Label
                        htmlFor={"confirmPassword"}
                        className="mt-2 font-medium !text-foreground"
                      >
                        Confirm password
                      </Label>

                      <div className="baseVertFlex relative !items-start gap-2">
                        <Input
                          id="confirmPassword"
                          type={showPasswords ? "text" : "password"}
                          value={confirmPassword}
                          placeholder="Confirm your new password"
                          maxLength={128}
                          className="w-full max-w-[275px] !text-foreground lg:w-[275px]"
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <Button
                          variant={"text"}
                          className="absolute right-3 top-[14px] !size-4 !p-0"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          <motion.div
                            key={
                              showPasswords
                                ? "showConfirmPasswordIcon"
                                : "hideConfirmPasswordIcon"
                            }
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            {showPasswords ? (
                              <FaRegEyeSlash className="size-5 text-foreground" />
                            ) : (
                              <FaRegEye className="size-5 text-foreground" />
                            )}
                          </motion.div>
                        </Button>

                        <div className="baseFlex gap-2 text-sm font-medium !text-foreground/75">
                          {confirmPassword.length < 8 ? (
                            <motion.div
                              key={"confirmPasswordLengthErrorIcon"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="rounded-full bg-red-500 p-0.5"
                            >
                              <IoClose className="size-3 text-foreground" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key={"confirmPasswordLengthCheckIcon"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="rounded-full bg-green-600 p-0.5"
                            >
                              <Check className="size-3 text-foreground" />
                            </motion.div>
                          )}
                          Must be greater than 8 characters
                        </div>
                        <div className="baseFlex gap-2 text-sm font-medium !text-foreground/75">
                          {newPassword !== confirmPassword ? (
                            <motion.div
                              key={"confirmPasswordEqualityErrorIcon"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="rounded-full bg-red-500 p-0.5"
                            >
                              <IoClose className="size-3 text-foreground" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key={"confirmPasswordEqualityCheckIcon"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="rounded-full bg-green-600 p-0.5"
                            >
                              <Check className="size-3 text-foreground" />
                            </motion.div>
                          )}
                          Passwords must match
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={localSettings ? "loadedPassword" : "loadingPassword"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="baseFlex"
                    >
                      {localSettings ? (
                        <span
                          className={`font-medium ${localSettings.passwordEnabled ? "!text-foreground lg:text-2xl" : "italic !text-foreground/75 lg:text-xl"} lg:text-xl`}
                        >
                          {localSettings.passwordEnabled
                            ? "********"
                            : "Controlled by attached Google account"}
                        </span>
                      ) : (
                        <div className="pulseAnimation h-6 w-64 rounded-md bg-pink-300 lg:h-7"></div>
                      )}
                    </motion.div>
                  )}

                  {localSettings?.passwordEnabled && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute right-0 top-0 lg:relative lg:right-auto lg:top-auto"
                    >
                      <Button
                        variant={"outline"}
                        onClick={() => {
                          setEditingPassword((prev) => !prev);
                          if (editingPassword) {
                            setNewPassword("");
                            setConfirmPassword("");
                          }
                        }}
                      >
                        {editingPassword ? "Cancel" : "Edit"}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              <Separator
                orientation="horizontal"
                className="h-[1px] w-full bg-foreground/50"
              />

              {/* profile image */}
              <EditImageSelector
                imageBeingEdited={imageBeingEdited}
                setNewProfileImage={setNewProfileImage}
                setImageBeingEdited={setImageBeingEdited}
                setShowEditImageModal={setShowEditImageModal}
                crop={crop}
                setCrop={setCrop}
                rotation={rotation}
                setRotation={setRotation}
                zoom={zoom}
                setZoom={setZoom}
                croppedAreaPixels={croppedAreaPixels}
                setCroppedAreaPixels={setCroppedAreaPixels}
                newProfileImage={newProfileImage}
                localSettings={localSettings}
              />

              <Separator
                orientation="horizontal"
                className="h-[1px] w-full bg-foreground/50 lg:hidden"
              />
            </div>

            <Separator
              orientation="vertical"
              className="hidden h-[550px] w-[1px] bg-foreground/50 lg:block"
            />

            <div className="baseVertFlex w-full !items-start gap-4 lg:gap-10">
              {/* pinned tab */}
              <PinnedTabSelector
                userId={userId!}
                localPinnedTabId={localPinnedTabId}
                setLocalPinnedTabId={setLocalPinnedTabId}
                setShowPinnedTabModal={setShowPinnedTabModal}
                localSettings={localSettings}
              />

              <Separator
                orientation="horizontal"
                className="h-[1px] w-full bg-foreground/50"
              />

              {/* color selector */}
              <div className="baseVertFlex relative w-full !items-start gap-2 lg:!flex-row lg:!justify-between">
                <span className="text-xl font-medium !text-foreground lg:text-2xl">
                  Color
                </span>

                <div className="grid w-full max-w-[450px] grid-cols-3 grid-rows-3 gap-4 self-center">
                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-pink-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium">Peony</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-rose-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Quartz</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-red-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Crimson</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-amber-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Saffron</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-lime-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Pistachio</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-green-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Verdant</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-cyan-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Aqua</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-blue-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Azure</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full bg-violet-600 !p-0"
                    ></Button>
                    <p className="text-sm font-medium opacity-50">Amethyst</p>
                  </div>
                </div>
              </div>

              <Separator
                orientation="horizontal"
                className="h-[1px] w-full bg-foreground/50"
              />

              {/* theme selector */}
              <div className="baseVertFlex relative w-full !items-start gap-2 lg:!flex-row lg:!justify-between">
                <div className="baseFlex gap-1 text-xl font-medium !text-foreground lg:gap-2 lg:text-2xl">
                  Theme
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="!size-7 !rounded-full !p-0 lg:!size-8"
                      >
                        <MdOutlineInfo className="size-[17px] lg:size-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="baseVertFlex p-2 text-center"
                      side="bottom"
                    >
                      Chosen theme is tied to your device, not your account.
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid w-full max-w-[450px] grid-cols-3 grid-rows-1 gap-4 self-center">
                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full !p-0"
                    >
                      <IoSunnyOutline className="size-6" />
                    </Button>
                    <p className="text-sm font-medium">Light</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full !p-0"
                    >
                      <IoMoonOutline className="size-6" />
                    </Button>
                    <p className="text-sm font-medium opacity-50">Dark</p>
                  </div>

                  <div className="baseVertFlex w-full gap-1">
                    <Button
                      variant={"outline"}
                      onClick={() => {
                        // document.documentElement.setAttribute("data-theme", "light");
                      }}
                      className="!size-12 !rounded-full !p-0"
                    >
                      <HiMiniComputerDesktop className="size-6" />
                    </Button>
                    <p className="text-sm font-medium opacity-50">System</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* delete account + save */}
          <div className="baseFlex w-full sm:!justify-end">
            <Button
              disabled={
                !localSettings ||
                saveButtonText !== "Save" ||
                (localSettings.username === currentUser?.username &&
                  newPassword === "" &&
                  confirmPassword === "" &&
                  newProfileImage === null &&
                  localPinnedTabId === currentUser?.pinnedTabId)
              }
              onClick={() => {
                if (!localSettings || !userId) return;

                if (
                  localSettings.username.length < 1 ||
                  localSettings.username.length > 20
                ) {
                  usernameInputRef.current?.focus();
                  return;
                } else if (editingPassword) {
                  if (
                    newPassword.length < 8 ||
                    newPassword.length > 128 ||
                    newPassword !== confirmPassword
                  ) {
                    newPasswordInputRef.current?.focus();
                    return;
                  } else if (
                    confirmPassword.length < 8 ||
                    confirmPassword.length > 128
                  ) {
                    confirmPasswordInputRef.current?.focus();
                    return;
                  }
                }

                setSaveButtonText("Saving");

                updateUser({
                  userId: userId,
                  username: localSettings.username,
                  newPassword: editingPassword ? newPassword : undefined,
                  confirmPassword: editingPassword
                    ? confirmPassword
                    : undefined,
                  newProfileImage: newProfileImage ?? undefined,
                  pinnedTabId: localPinnedTabId,
                  // theme: localSettings?.theme,
                });
              }}
              className="baseFlex mr-3 gap-2 overflow-hidden lg:mr-0"
            >
              <AnimatePresence mode={"wait"} initial={false}>
                <motion.div
                  key={
                    saveButtonText === ""
                      ? "saveButtonText-empty"
                      : saveButtonText
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
                      className="inline-block size-4 animate-spin rounded-full border-[2px] border-pink-50 border-t-transparent text-foreground"
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
                      className="size-5 text-foreground"
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
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showEditImageModal && (
          <EditImageModal
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
        )}
        {showPinnedTabModal && (
          <PinnedTabModal
            userId={userId!}
            localPinnedTabId={localPinnedTabId}
            setLocalPinnedTabId={setLocalPinnedTabId}
            setShowPinnedTabModal={setShowPinnedTabModal}
          />
        )}
        {showDeleteAccountModal && (
          <DeleteAccountModal
            setShowDeleteAccountModal={setShowDeleteAccountModal}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default UserSettings;
