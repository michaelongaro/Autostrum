import { getProfileImageSrc } from "~/utils/profileImage";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

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
import { IoMdSettings } from "react-icons/io";
import { IoBookmark, IoStatsChart } from "react-icons/io5";
import { PiMetronome } from "react-icons/pi";
import { IoColorPalette } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { Button } from "~/components/ui/button";
import classes from "./DesktopHeader.module.css";
import TuningFork from "~/components/ui/icons/TuningFork";
import SearchInput from "~/components/Search/SearchInput";
import ThemePicker from "~/components/Header/ThemePicker";
import HeaderLogo from "~/components/Header/HeaderLogo";
import { getTabDocument } from "~/utils/drafts/tabDraftState";
import { saveTabForSignIn } from "~/utils/tabSignInHandoff";
import { api } from "~/utils/api";
import Logo from "~/components/ui/icons/Logo";
import { isThemeTransitionPointerEvent } from "~/utils/updateCSSThemeVars";
import { CiCompass1 } from "react-icons/ci";

function DesktopHeader({ prefetchSearch }: { prefetchSearch: boolean }) {
  const { userId, isSignedIn } = useAuth();
  const asPath = usePathname();

  const { data: currentUser, isInitialLoading: isLoadingCurrentUser } =
    api.user.getById.useQuery(userId!, {
      enabled: !!userId,
    });

  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [loadedProfileImage, setLoadedProfileImage] = useState<string>();
  const profileImage = currentUser
    ? getProfileImageSrc(currentUser.profileImageUrl)
    : "";
  const showProfileImage = loadedProfileImage === profileImage;

  return (
    <nav
      id={"desktopHeader"}
      className="sticky left-0 top-0 z-[49] hidden h-16 w-full items-center justify-center bg-header shadow-sm shadow-primary/20 lg:flex"
    >
      <div className={classes.desktopHeader}>
        <Link
          href={"/"}
          className={`${classes.logo} baseFlex shrink-0 rounded-md p-1 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70`}
        >
          <HeaderLogo width={175} height={28} />
        </Link>

        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  role="link"
                  variant={"headerNavigation"}
                  size={"lg"}
                  style={{
                    backgroundColor: asPath.includes("/tools")
                      ? "hsl(var(--accent))"
                      : undefined,
                    color: asPath.includes("/tools")
                      ? "hsl(var(--accent-foreground))"
                      : undefined,
                  }}
                  className={classes.tools}
                  nativeButton={false}
                  render={
                    <Link
                      prefetch={false}
                      href={"/tools"}
                      aria-label="Tools"
                      className="baseFlex !size-12 !rounded-full !p-0"
                    >
                      <PiMetronome className="size-6" />
                    </Link>
                  }
                />
              }
            />
            <TooltipContent side={"bottom"}>
              <p>Tools</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  role="link"
                  variant={"headerNavigation"}
                  size={"lg"}
                  style={{
                    backgroundColor: asPath.includes("/tuner")
                      ? "hsl(var(--accent))"
                      : undefined,
                    color: asPath.includes("/tuner")
                      ? "hsl(var(--accent-foreground))"
                      : undefined,
                  }}
                  className={classes.tuner}
                  nativeButton={false}
                  render={
                    <Link
                      prefetch={false}
                      href={"/tuner"}
                      aria-label="Tuner"
                      className="baseFlex !size-12 !rounded-full !p-0"
                    >
                      <TuningFork className="size-5" />
                    </Link>
                  }
                />
              }
            />
            <TooltipContent side={"bottom"}>
              <p>Tuner</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div
          className={`${classes.search} baseFlex !w-full min-w-[350px] max-w-[450px]`}
        >
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="h-[46px] w-[98%] rounded-md border bg-background"
              />
            }
          >
            <SearchInput prefetchSuggestions={prefetchSearch} />
          </Suspense>
        </div>

        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  role="link"
                  variant={"headerNavigation"}
                  size={"lg"}
                  style={{
                    backgroundColor: asPath.includes("/explore")
                      ? "hsl(var(--accent))"
                      : undefined,
                    color: asPath.includes("/explore")
                      ? "hsl(var(--accent-foreground))"
                      : undefined,
                  }}
                  className={classes.explore}
                  nativeButton={false}
                  render={
                    <Link
                      prefetch={false}
                      href={"/explore"}
                      aria-label="Explore"
                      className="baseFlex !size-12 !rounded-full !p-0"
                    >
                      <CiCompass1 className="size-6 stroke-[0.5px]" />
                    </Link>
                  }
                />
              }
            />
            <TooltipContent side={"bottom"}>
              <p>Explore</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  role="link"
                  variant={"headerNavigation"}
                  size={"lg"}
                  style={{
                    backgroundColor: asPath.includes("/create")
                      ? "hsl(var(--accent))"
                      : undefined,
                    color: asPath.includes("/create")
                      ? "hsl(var(--accent-foreground))"
                      : undefined,
                  }}
                  className={classes.create}
                  nativeButton={false}
                  render={
                    <Link
                      prefetch={false}
                      href={"/create"}
                      aria-label="Create a tab"
                      className="baseFlex !size-12 !rounded-full !p-0"
                    >
                      <BsPlus className="size-8" />
                    </Link>
                  }
                />
              }
            />
            <TooltipContent side={"bottom"}>
              <p>Create</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Popover
          onOpenChange={(_open, details) => {
            if (
              details.reason === "outside-press" &&
              isThemeTransitionPointerEvent(details.event)
            ) {
              details.cancel();
            }
          }}
        >
          <TooltipProvider delay={150}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <PopoverTrigger
                    render={
                      <Button
                        aria-label="Choose color and theme"
                        variant={"headerNavigation"}
                        size={"lg"}
                        className={`${classes.theme} baseFlex !size-12 !rounded-full !p-0`}
                      >
                        <IoColorPalette className="size-6" />
                      </Button>
                    }
                  />
                }
              />
              <TooltipContent side={"bottom"}>Theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <PopoverContent side={"bottom"} className="baseFlex max-w-[275px]">
            <ThemePicker />
          </PopoverContent>
        </Popover>

        <div className={classes.authentication}>
          {(isSignedIn === undefined || isLoadingCurrentUser) && (
            <span
              aria-hidden="true"
              className="baseFlex size-12 rounded-full bg-secondary text-secondary-foreground shadow-primaryButton"
            >
              <FaUser className="size-5" />
            </span>
          )}

          {isSignedIn === false && (
            <div className="baseFlex size-12">
              <TooltipProvider delay={150}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <SignInButton mode="modal">
                        <Button
                          aria-label="Sign in"
                          variant={"headerNavigation"}
                          size="lg"
                          className="!size-12 !rounded-full !p-0"
                          onClick={() => {
                            if (asPath.split("?")[0] === "/create")
                              saveTabForSignIn(getTabDocument());
                          }}
                        >
                          <FaUser className="size-5" />
                        </Button>
                      </SignInButton>
                    }
                  />
                  <TooltipContent side={"bottom"}>
                    <p>Sign in</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {isSignedIn && currentUser && (
            <div className="baseFlex size-12">
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      aria-label="Account menu"
                      variant={showProfileImage ? "ghost" : "headerNavigation"}
                      size="lg"
                      className="baseFlex relative !size-12 shrink-0 !rounded-full !p-0"
                    >
                      {!showProfileImage && (
                        <FaUser
                          aria-hidden="true"
                          className="absolute size-5"
                        />
                      )}
                      {profileImage && (
                        <Image
                          unoptimized
                          src={profileImage}
                          alt={`${currentUser.username}'s profile picture`}
                          width={300}
                          height={300}
                          onLoad={() => setLoadedProfileImage(profileImage)}
                          style={{
                            visibility: showProfileImage ? "visible" : "hidden",
                          }}
                          className="size-10 rounded-full object-cover object-center"
                        />
                      )}
                    </Button>
                  }
                />
                <PopoverContent
                  side={"bottom"}
                  className="baseVertFlex w-[388px] !items-start gap-4"
                >
                  <div className="baseFlex w-full !justify-between gap-4 px-1">
                    <Button
                      role="link"
                      variant={"link"}
                      size={"lg"}
                      nativeButton={false}
                      render={
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
                            unoptimized
                            src={profileImage}
                            alt="User profile image"
                            className="!size-8 rounded-full object-cover object-center"
                            width={300}
                            height={300}
                          />
                          <p className="text-lg font-medium">
                            {currentUser.username}
                          </p>
                        </Link>
                      }
                    />

                    <SignOutButton>
                      <Button
                        role="link"
                        variant={"link"}
                        nativeButton={false}
                        render={
                          <Link
                            prefetch={false}
                            href={`/`}
                            onClick={() => {
                              setUserPopoverOpen(false);
                            }}
                            className="baseFlex !p-0"
                          >
                            Sign out
                          </Link>
                        }
                      />
                    </SignOutButton>
                  </div>

                  <div className="baseFlex w-full gap-4">
                    <Button
                      role="link"
                      variant={"headerNavigation"}
                      size={"lg"}
                      style={{
                        backgroundColor: asPath.includes("/profile/settings")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/settings")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                      nativeButton={false}
                      render={
                        <Link
                          prefetch={false}
                          href={`/profile/settings`}
                          onClick={() => {
                            setUserPopoverOpen(false);
                          }}
                          className="baseFlex w-[165px] gap-2"
                        >
                          <IoMdSettings className="size-[18px]" />
                          Settings
                        </Link>
                      }
                    />

                    <Button
                      role="link"
                      variant={"headerNavigation"}
                      size={"lg"}
                      style={{
                        backgroundColor: asPath.includes("/profile/statistics")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/statistics")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                      nativeButton={false}
                      render={
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
                      }
                    />
                  </div>

                  <div className="baseFlex w-full gap-4">
                    <Button
                      role="link"
                      variant={"headerNavigation"}
                      size={"lg"}
                      style={{
                        backgroundColor: asPath.includes("/profile/tabs")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/tabs")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                      nativeButton={false}
                      render={
                        <Link
                          prefetch={false}
                          href={`/profile/tabs/filters`}
                          onClick={() => {
                            setUserPopoverOpen(false);
                          }}
                          className="baseFlex w-[165px] gap-2"
                        >
                          <Logo className="size-3.5" />
                          Tabs
                        </Link>
                      }
                    />

                    <Button
                      role="link"
                      variant={"headerNavigation"}
                      size={"lg"}
                      style={{
                        backgroundColor: asPath.includes("/profile/bookmarks")
                          ? "hsl(var(--accent))"
                          : undefined,
                        color: asPath.includes("/profile/bookmarks")
                          ? "hsl(var(--accent-foreground))"
                          : undefined,
                      }}
                      nativeButton={false}
                      render={
                        <Link
                          prefetch={false}
                          href={`/profile/bookmarks/filters`}
                          onClick={() => {
                            setUserPopoverOpen(false);
                          }}
                          className="baseFlex w-[165px] gap-2 !px-0"
                        >
                          <IoBookmark className="size-4 shrink-0" />
                          Bookmarks
                        </Link>
                      }
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default DesktopHeader;
