import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import { IoSettingsOutline } from "react-icons/io5";
import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { BiSearchAlt2 } from "react-icons/bi";
import { Squash as Hamburger } from "hamburger-react";
import { TbGuitarPick } from "react-icons/tb";
import { IoColorPalette } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BsPlus } from "react-icons/bs";
import { IoBookmarkOutline } from "react-icons/io5";
import { PiMetronome } from "react-icons/pi";
import { useTabStore } from "~/stores/TabStore";
import { IoStatsChart } from "react-icons/io5";
import { Button } from "~/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Separator } from "~/components/ui/separator";
import TuningFork from "~/components/ui/icons/TuningFork";
import SearchInput from "~/components/Search/SearchInput";
import { api } from "~/utils/api";
import Binoculars from "~/components/ui/icons/Binoculars";
import ThemePicker from "~/components/Header/ThemePicker";
import { LOGO_PATHS_WITH_TITLE } from "~/utils/logoPaths";
import Spinner from "~/components/ui/Spinner";

function MobileHeader() {
  const { userId, isSignedIn } = useAuth();
  const { asPath } = useRouter();
  const router = useRouter();

  const {
    getStringifiedTabData,
    mobileHeaderModal,
    setMobileHeaderModal,
    color,
    theme,
  } = useTabStore((state) => ({
    getStringifiedTabData: state.getStringifiedTabData,
    mobileHeaderModal: state.mobileHeaderModal,
    setMobileHeaderModal: state.setMobileHeaderModal,
    color: state.color,
    theme: state.theme,
  }));

  const { data: currentUser, isInitialLoading: isLoadingCurrentUser } =
    api.user.getById.useQuery(userId!, {
      enabled: !!userId,
    });

  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileHeaderIsOpen, setMobileHeaderIsOpen] = useState(false);
  const [userProfileImageLoaded, setUserProfileImageLoaded] = useState(false);

  const localStorageTabData = useLocalStorageValue("autostrum-tabData");
  const localStorageRedirectRoute = useLocalStorageValue(
    "autostrum-redirect-route",
  );

  // closes the mobile header when the user taps outside of it
  useEffect(() => {
    if (!mobileHeaderModal.showing) {
      setMobileHeaderIsOpen(false);
    }
  }, [mobileHeaderModal.showing]);

  useEffect(() => {
    function handleRouteChange() {
      setShowMobileSearch(false);
      setMobileHeaderIsOpen(false);
      setMobileHeaderModal({
        showing: false,
        zIndex: 48,
      });
    }

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router.events]);

  return (
    <nav className="baseFlex sticky left-0 top-0 z-[49] h-16 w-full">
      <div className="absolute z-[49] flex h-16 w-full items-start justify-between overflow-clip bg-header p-2 shadow-md shadow-primary/10 lg:hidden">
        <Link
          prefetch={false}
          href={"/"}
          className="baseFlex h-12 pl-2 transition-[filter] hover:brightness-[1.05] active:brightness-[0.95]"
        >
          <Image
            src={LOGO_PATHS_WITH_TITLE[color]}
            alt="Autostrum header logo"
            style={{
              filter: "drop-shadow(0px 1px 0.5px hsla(336, 84%, 17%, 0.25))",
            }}
            width={150}
            height={50}
            priority
          />
        </Link>

        <div className="baseFlex gap-3">
          <Dialog
            open={showMobileSearch}
            onOpenChange={setShowMobileSearch}
            modal={true}
          >
            <DialogTrigger asChild>
              <Button
                variant="text"
                onClick={() => setShowMobileSearch(true)}
                className="!px-0"
              >
                <BiSearchAlt2 className="size-[26px]" />
              </Button>
            </DialogTrigger>

            <VisuallyHidden>
              <DialogTitle>Search</DialogTitle>
              <DialogDescription>
                Search for your favorite songs and artists here.
              </DialogDescription>
            </VisuallyHidden>

            <DialogContent
              renderCloseButton={false}
              className="baseVertFlex size-full max-h-[100dvh] max-w-[100vw] !justify-start !rounded-none border-none p-0"
            >
              <SearchInput setShowMobileSearch={setShowMobileSearch} />
            </DialogContent>
          </Dialog>

          <Hamburger
            toggled={mobileHeaderIsOpen}
            onToggle={(open) => {
              setMobileHeaderIsOpen(open);
              setMobileHeaderModal({
                showing: open,
                zIndex: 48,
              });
            }}
            easing="ease-in-out"
            rounded
            size={28}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mobileHeaderIsOpen && (
          <motion.div
            key={"mobileHamburgerMenu"}
            initial={{
              opacity: 0,
              transform: "translateY(-100%)",
              transition: {
                opacity: { duration: 0.2, ease: "easeInOut" },
                transform: { duration: 0.35, ease: "easeInOut" },
              },
            }}
            animate={{
              opacity: 1,
              transform: "translateY(0%)",
              transition: {
                opacity: { duration: 0.2, ease: "easeInOut" },
                transform: { duration: 0.35, ease: "easeInOut" },
              },
            }}
            exit={{
              opacity: 0,
              transition: {
                opacity: { duration: 0.2, ease: "easeInOut" },
              },
            }}
            className="baseVertFlex modalGradient fixed top-16 z-[-1] max-h-[80dvh] w-full max-w-lg !justify-start overflow-y-auto rounded-b-xl border-t border-foreground shadow-lg"
          >
            <div className="baseVertFlex my-4 h-full max-w-[348px] gap-4">
              <div className="baseFlex w-full gap-4">
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
                >
                  <Link
                    prefetch={false}
                    href={"/explore"}
                    className="baseFlex w-[165px] gap-2.5 text-[1.13rem]"
                  >
                    <Binoculars className="size-[18px]" />
                    Explore
                  </Link>
                </Button>

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
                >
                  <Link
                    prefetch={false}
                    href={"/create"}
                    className="baseFlex w-[165px] gap-[0.14rem] text-[1.13rem]"
                  >
                    <BsPlus className="size-7" />
                    Create
                  </Link>
                </Button>
              </div>

              <div className="baseVertFlex w-full max-w-[348px] gap-2">
                <div className="baseFlex w-full gap-4">
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
                  >
                    <Link
                      prefetch={false}
                      href={"/metronome"}
                      className="baseFlex w-[165px] gap-2"
                    >
                      <PiMetronome className="size-5 shrink-0" />
                      Metronome
                    </Link>
                  </Button>
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
                  >
                    <Link
                      prefetch={false}
                      href={"/tuner"}
                      className="baseFlex w-[165px] gap-2"
                    >
                      <TuningFork className="size-4" />
                      Tuner
                    </Link>
                  </Button>
                </div>
              </div>

              <Separator className="h-[1px] w-full bg-foreground/75" />

              <Accordion
                type="single"
                collapsible
                className="w-full max-w-[348px]"
              >
                <AccordionItem
                  value="opened"
                  className="baseVertFlex relative w-full"
                >
                  <AccordionTrigger className="baseFlex w-full !justify-start gap-2">
                    <IoColorPalette className="size-5 !rotate-0" />

                    <span>
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </span>

                    <Separator
                      orientation="vertical"
                      className="h-[100%] w-[1px] bg-foreground/50"
                    />

                    <span>
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </span>
                  </AccordionTrigger>

                  <AccordionContent animated={true} className="w-full">
                    <ThemePicker />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator className="h-[1px] w-full bg-foreground/75" />

              <AnimatePresence mode="popLayout">
                {(isSignedIn === undefined || isLoadingCurrentUser) && (
                  <motion.div
                    key="loadingAuth"
                    initial={{
                      opacity: 0,
                      transition: {
                        opacity: {
                          duration: 0.2,
                          delay: 0.1,
                          ease: "easeInOut",
                        },
                      },
                    }}
                    animate={{
                      opacity: 1,
                      transition: {
                        opacity: {
                          duration: 0.2,
                          delay: 0.1,
                          ease: "easeInOut",
                        },
                      },
                    }}
                    exit={{
                      opacity: 0,
                      transition: {
                        opacity: {
                          duration: 0.2,
                          ease: "easeInOut",
                        },
                      },
                    }}
                    className="baseFlex h-[50px] w-full"
                  >
                    <Spinner className="size-5" />
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
                    className="baseFlex h-[50px] w-full"
                  >
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
                        className="baseFlex h-10 gap-2 px-8"
                        onClick={() => {
                          if (asPath.includes("/create")) {
                            localStorageTabData.set(getStringifiedTabData());
                          }

                          // technically can sign in from signup page and vice versa
                          if (!userId) localStorageRedirectRoute.set(asPath);
                          // ^^ but technically could just append it onto the postSignupRegistration route right?
                        }}
                      >
                        <FaUser className="size-4" />
                        Sign in
                      </Button>
                    </SignInButton>
                  </motion.div>
                )}

                {isSignedIn && currentUser && (
                  <motion.div
                    key="signedIn"
                    initial={{
                      opacity: 0,
                      height: "50px",
                      transition: {
                        opacity: {
                          duration: 0.2,
                          delay: 0.1,
                          ease: "easeInOut",
                        },
                        height: {
                          duration: 0.2,
                          ease: "easeInOut",
                        },
                      },
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                      transition: {
                        opacity: {
                          duration: 0.2,
                          delay: 0.1,
                          ease: "easeInOut",
                        },
                        height: {
                          duration: 0.2,
                          ease: "easeInOut",
                        },
                      },
                    }}
                    exit={{
                      opacity: 0,
                      height: "50px",
                      transition: {
                        opacity: {
                          duration: 0.2,
                          ease: "easeInOut",
                        },
                        height: {
                          duration: 0.2,
                          delay: 0.1,
                          ease: "easeInOut",
                        },
                      },
                    }}
                    className="baseVertFlex w-full max-w-[348px] !items-start gap-4"
                  >
                    <div className="baseFlex w-full !justify-between gap-4">
                      <Button variant={"link"} size={"lg"} asChild>
                        <Link
                          prefetch={false}
                          href={`
                /user/${currentUser.username}/filters
                `}
                          className="baseFlex !h-10 gap-2 !px-0"
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
                              className="col-start-1 col-end-2 row-start-1 row-end-2 !size-8 rounded-full object-cover object-center"
                            />

                            <AnimatePresence>
                              {!userProfileImageLoaded && (
                                <motion.div
                                  key={"gridTabCardSkeletonImageLoader-lg"}
                                  initial={{ opacity: 1 }}
                                  animate={{ opacity: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="pulseAnimation z-10 col-start-1 col-end-2 row-start-1 row-end-2 size-8 rounded-full bg-foreground/50"
                                ></motion.div>
                              )}
                            </AnimatePresence>
                          </div>

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
                          backgroundColor: asPath.includes(
                            "/profile/statistics",
                          )
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
                          className="baseFlex w-[165px] gap-2 !px-0"
                        >
                          <IoBookmarkOutline className="size-4 shrink-0" />
                          Bookmarks
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default MobileHeader;
