import { useState } from "react";
import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { BsPlus } from "react-icons/bs";
import { IoSettingsOutline, IoStatsChart } from "react-icons/io5";
import { TbGuitarPick } from "react-icons/tb";
import { IoBookmarkOutline } from "react-icons/io5";
import { useTabStore } from "~/stores/TabStore";
import { PiMetronome } from "react-icons/pi";
import { IoColorPalette } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { Button } from "~/components/ui/button";
import classes from "./DesktopHeader.module.css";
import TuningFork from "~/components/ui/icons/TuningFork";
import SearchInput from "~/components/Search/SearchInput";
import ThemePicker from "~/components/Header/ThemePicker";
import { api } from "~/utils/api";
import { AnimatePresence, motion } from "framer-motion";
import Binoculars from "~/components/ui/icons/Binoculars";
import { LOGO_PATHS_WITH_TITLE } from "~/utils/logoPaths";

function DesktopHeader() {
  const { userId, isSignedIn } = useAuth();
  const { asPath } = useRouter();

  const { getStringifiedTabData, color } = useTabStore((state) => ({
    getStringifiedTabData: state.getStringifiedTabData,
    color: state.color,
  }));

  const { data: currentUser, isInitialLoading: isLoadingCurrentUser } =
    api.user.getById.useQuery(userId!, {
      enabled: !!userId,
    });

  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [userProfileImageLoaded, setUserProfileImageLoaded] = useState(false);

  const localStorageTabData = useLocalStorageValue("autostrum-tabData");
  const localStorageRedirectRoute = useLocalStorageValue(
    "autostrum-redirect-route",
  );

  return (
    <nav
      id={"desktopHeader"}
      className="headerAndFooterBackgroundGradient baseFlex sticky left-0 top-0 z-[49] h-16 w-full shadow-md shadow-primary/10"
    >
      <div className={classes.desktopHeader}>
        <Link href={"/"} className={`${classes.logo} shrink-0`}>
          <Image
            src={LOGO_PATHS_WITH_TITLE[color]}
            alt="Autostrum header logo"
            style={{
              filter: "drop-shadow(0px 1px 0.5px hsla(336, 84%, 17%, 0.25))",
            }}
            width={175}
            height={100}
            priority
          />
        </Link>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"secondary"}
                size={"lg"}
                asChild
                style={{
                  backgroundColor: asPath.includes("/metronome")
                    ? "hsl(var(--accent))"
                    : undefined,
                  color: asPath.includes("/metronome")
                    ? "hsl(var(--accent-foreground))"
                    : undefined,
                }}
                className={classes.metronome}
              >
                <Link
                  prefetch={false}
                  href={"/metronome"}
                  className="baseFlex !size-12 !rounded-full !p-0"
                >
                  <PiMetronome className="size-6" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"bottom"}>
              <p>Metronome</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"secondary"}
                size={"lg"}
                asChild
                style={{
                  backgroundColor: asPath.includes("/tuner")
                    ? "hsl(var(--accent))"
                    : undefined,
                  color: asPath.includes("/tuner")
                    ? "hsl(var(--accent-foreground))"
                    : undefined,
                }}
                className={classes.tuner}
              >
                <Link
                  prefetch={false}
                  href={"/tuner"}
                  className="baseFlex !size-12 !rounded-full !p-0"
                >
                  <TuningFork className="size-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"bottom"}>
              <p>Tuner</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div
          className={`${classes.search} baseFlex !w-full min-w-[350px] max-w-[450px]`}
        >
          <SearchInput />
        </div>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"secondary"}
                size={"lg"}
                asChild
                style={{
                  backgroundColor: asPath.includes("/explore")
                    ? "hsl(var(--accent))"
                    : undefined,
                  color: asPath.includes("/explore")
                    ? "hsl(var(--accent-foreground))"
                    : undefined,
                }}
                className={classes.explore}
              >
                <Link
                  prefetch={false}
                  href={"/explore"}
                  className="baseFlex !size-12 !rounded-full !p-0"
                >
                  <Binoculars className="size-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"bottom"}>
              <p>Explore</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"secondary"}
                size={"lg"}
                asChild
                style={{
                  backgroundColor: asPath.includes("/create")
                    ? "hsl(var(--accent))"
                    : undefined,
                  color: asPath.includes("/create")
                    ? "hsl(var(--accent-foreground))"
                    : undefined,
                }}
                className={classes.create}
              >
                <Link
                  prefetch={false}
                  href={"/create"}
                  className="baseFlex !size-12 !rounded-full !p-0"
                >
                  <BsPlus className="size-8" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={"bottom"}>
              <p>Create</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Popover>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"lg"}
                    className={`${classes.theme} baseFlex !size-12 !rounded-full !p-0`}
                  >
                    <IoColorPalette className="size-6" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side={"bottom"}>Theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <PopoverContent side={"bottom"} className="baseFlex max-w-[275px]">
            <ThemePicker />
          </PopoverContent>
        </Popover>

        <AnimatePresence mode="popLayout">
          {(isSignedIn === undefined || isLoadingCurrentUser) && (
            <motion.div
              key={"loadingAuth"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.1, ease: "easeInOut" },
              }}
              className={`${classes.authentication} pulseAnimation baseFlex size-12 shrink-0 rounded-full bg-foreground/50`}
            >
              <div className="pulseAnimation size-10 shrink-0 rounded-full bg-foreground/50"></div>
            </motion.div>
          )}

          {isSignedIn === false && (
            <motion.div
              key="notSignedIn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.1, ease: "easeInOut" },
              }}
              className={`${classes.authentication} baseFlex shrink-0`}
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SignInButton
                      mode="modal"
                      // afterSignUpUrl={`${
                      //   process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                      // }/postSignUpRegistration`}
                      // afterSignInUrl={`${
                      //   process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                      // }${asPath}`}
                    >
                      <Button
                        variant={"secondary"}
                        className="!size-12 !rounded-full !p-0"
                        onClick={() => {
                          if (asPath.includes("/create")) {
                            localStorageTabData.set(getStringifiedTabData());
                          }

                          // technically can sign in from signup page and vice versa
                          if (!userId) localStorageRedirectRoute.set(asPath);
                          // ^^ but technically could just append it onto the postSignupRegistration route right?
                        }}
                      >
                        <FaUser className="size-5" />
                      </Button>
                    </SignInButton>
                  </TooltipTrigger>
                  <TooltipContent side={"bottom"}>
                    <p>Sign in</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}

          {isSignedIn && currentUser && (
            <motion.div
              key="signedIn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.1, ease: "easeInOut" },
              }}
              className={`${classes.authentication} baseFlex shrink-0`}
            >
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    className={`${classes.authentication} baseFlex shrink-0`}
                  >
                    <Button
                      variant={"ghost"}
                      className="!size-12 !rounded-full !p-0"
                    >
                      <div className="grid shrink-0 grid-cols-1 grid-rows-1">
                        <Image
                          src={currentUser.profileImageUrl}
                          alt={`${currentUser.username}'s profile picture`}
                          width={300}
                          height={300}
                          onLoad={() => {
                            setTimeout(() => {
                              setUserProfileImageLoaded(true);
                            }, 100); // unsure if this is necessary, but it felt too flickery without it
                          }}
                          style={{
                            opacity: userProfileImageLoaded ? 1 : 0,
                            transition: "opacity 0.3s ease-in-out",
                          }}
                          className="col-start-1 col-end-2 row-start-1 row-end-2 !size-10 rounded-full object-cover object-center"
                        />

                        <AnimatePresence>
                          {!userProfileImageLoaded && (
                            <motion.div
                              key={"gridTabCardSkeletonImageLoader-lg"}
                              initial={{ opacity: 1 }}
                              animate={{ opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="pulseAnimation z-10 col-start-1 col-end-2 row-start-1 row-end-2 size-10 rounded-full bg-foreground/50"
                            ></motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Button>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  side={"bottom"}
                  className="baseVertFlex w-[388px] !items-start gap-4"
                >
                  <div className="baseFlex w-full !justify-between gap-4 px-1">
                    <Button variant={"link"} size={"lg"} asChild>
                      <Link
                        prefetch={false}
                        href={`
                      /user/${currentUser.username}/filters
                      `}
                        onClick={() => {
                          setUserPopoverOpen(false);
                        }}
                        className="baseFlex !h-10 gap-2 !px-0"
                      >
                        <Image
                          src={currentUser.profileImageUrl}
                          alt="User profile image"
                          className="!size-8 rounded-full object-cover object-center"
                          width={300}
                          height={300}
                        />
                        <p className="text-lg font-medium">
                          {currentUser.username}
                        </p>
                      </Link>
                    </Button>

                    <SignOutButton
                    // afterSignOutUrl={`${
                    //   process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                    // }/`}
                    // onSignOut={() => {
                    //   localStorageTabData.set(getStringifiedTabData());
                    //   localStorageRedirectRoute.set(asPath);
                    // }}
                    >
                      <Button variant={"link"} asChild>
                        <Link
                          prefetch={false}
                          href={`/`}
                          onClick={() => {
                            setUserPopoverOpen(false);
                          }}
                          className="baseFlex !p-0 underline"
                        >
                          Sign out
                        </Link>
                      </Button>
                    </SignOutButton>
                  </div>

                  <div className="baseFlex w-full gap-4">
                    <Button
                      variant={"secondary"}
                      size={"lg"}
                      asChild
                      style={{
                        backgroundColor: asPath.includes("/profile/settings")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/settings")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                    >
                      <Link
                        prefetch={false}
                        href={`/profile/settings`}
                        onClick={() => {
                          setUserPopoverOpen(false);
                        }}
                        className="baseFlex w-[165px] gap-2"
                      >
                        <IoSettingsOutline className="size-4" />
                        Settings
                      </Link>
                    </Button>

                    <Button
                      variant={"secondary"}
                      size={"lg"}
                      asChild
                      style={{
                        backgroundColor: asPath.includes("/profile/statistics")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/statistics")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                    >
                      <Link
                        prefetch={false}
                        href={`/profile/statistics`}
                        onClick={() => {
                          setUserPopoverOpen(false);
                        }}
                        className="baseFlex w-[165px] gap-2"
                      >
                        <IoStatsChart className="size-4" />
                        Statistics
                      </Link>
                    </Button>
                  </div>

                  <div className="baseFlex w-full gap-4">
                    <Button
                      variant={"secondary"}
                      size={"lg"}
                      asChild
                      style={{
                        backgroundColor: asPath.includes("/profile/tabs")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/tabs")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                    >
                      <Link
                        prefetch={false}
                        href={`/profile/tabs/filters`}
                        onClick={() => {
                          setUserPopoverOpen(false);
                        }}
                        className="baseFlex w-[165px] gap-2"
                      >
                        <TbGuitarPick className="size-4" />
                        Tabs
                      </Link>
                    </Button>

                    <Button
                      variant={"secondary"}
                      size={"lg"}
                      asChild
                      style={{
                        backgroundColor: asPath.includes("/profile/bookmarks")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/bookmarks")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                    >
                      <Link
                        prefetch={false}
                        href={`/profile/bookmarks/filters`}
                        onClick={() => {
                          setUserPopoverOpen(false);
                        }}
                        className="baseFlex w-[165px] gap-2 !px-0"
                      >
                        <IoBookmarkOutline className="size-4 shrink-0" />
                        Bookmarks
                      </Link>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

export default DesktopHeader;
