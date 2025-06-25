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

function MobileHeader() {
  const { userId, isSignedIn } = useAuth();
  const { asPath } = useRouter();
  const router = useRouter();

  const { getStringifiedTabData, mobileHeaderModal, setMobileHeaderModal } =
    useTabStore((state) => ({
      getStringifiedTabData: state.getStringifiedTabData,
      mobileHeaderModal: state.mobileHeaderModal,
      setMobileHeaderModal: state.setMobileHeaderModal,
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
    "autostrum-redirectRoute",
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
      <div className="headerBackgroundGradient absolute z-[49] flex h-16 w-full items-start justify-between overflow-clip p-2 shadow-md lg:hidden">
        <Link
          href={"/"}
          className="baseFlex h-12 pl-2 transition-[filter] hover:brightness-[1.05] active:brightness-[0.95]"
        >
          <Image
            src="/logoWithTitle.svg"
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
                variant="link"
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
              className="baseVertFlex size-full max-h-[100dvh] max-w-[100vw] !justify-start !rounded-none bg-gradient-to-b from-pink-400 to-pink-500 p-0"
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
            color="#fdf2f8"
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
            className="baseVertFlex fixed top-16 z-[-1] max-h-[80dvh] w-full max-w-lg !justify-start overflow-y-auto rounded-b-xl bg-pink-400 shadow-lg"
          >
            <div className="baseVertFlex my-4 h-full max-w-[348px] gap-4">
              <div className="baseFlex w-full gap-4">
                <Button
                  variant={"navigation"}
                  size={"lg"}
                  asChild
                  style={{
                    backgroundColor: asPath.includes("/explore")
                      ? "#be185d"
                      : undefined,
                    color: asPath.includes("/explore") ? "#fbcfe8" : undefined,
                  }}
                >
                  <Link
                    href={"/explore"}
                    className="baseFlex w-[165px] gap-2.5 text-[1.13rem]"
                  >
                    <Binoculars className="size-[18px]" />
                    Explore
                  </Link>
                </Button>

                <Button
                  variant={"navigation"}
                  size={"lg"}
                  asChild
                  style={{
                    backgroundColor: asPath.includes("/create")
                      ? "#be185d"
                      : undefined,
                    color: asPath.includes("/create") ? "#fbcfe8" : undefined,
                  }}
                >
                  <Link
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
                    variant={"navigation"}
                    size={"lg"}
                    asChild
                    style={{
                      backgroundColor: asPath.includes("/metronome")
                        ? "#be185d"
                        : undefined,
                      color: asPath.includes("/metronome")
                        ? "#fbcfe8"
                        : undefined,
                    }}
                  >
                    <Link
                      href={"/metronome"}
                      className="baseFlex w-[165px] gap-2"
                    >
                      <PiMetronome className="size-5 shrink-0" />
                      Metronome
                    </Link>
                  </Button>
                  <Button
                    variant={"navigation"}
                    size={"lg"}
                    asChild
                    style={{
                      backgroundColor: asPath.includes("/tuner")
                        ? "#be185d"
                        : undefined,
                      color: asPath.includes("/tuner") ? "#fbcfe8" : undefined,
                    }}
                  >
                    <Link href={"/tuner"} className="baseFlex w-[165px] gap-2">
                      <TuningFork className="size-4" />
                      Tuner
                    </Link>
                  </Button>
                </div>
              </div>

              <Separator className="h-[1px] w-full" />

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
                    Peony | Light
                  </AccordionTrigger>

                  <AccordionContent animated={true} className="w-full">
                    <ThemePicker />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator className="h-[1px] w-full" />

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
                    <svg
                      className="size-5 animate-stableSpin rounded-full bg-inherit fill-none"
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
                                  className="pulseAnimation z-10 col-start-1 col-end-2 row-start-1 row-end-2 size-8 rounded-full bg-pink-300"
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
                          <Link href={`/`} className="baseFlex !p-0 underline">
                            Sign out
                          </Link>
                        </Button>
                      </SignOutButton>
                    </div>

                    <div className="baseFlex w-full gap-4">
                      <Button
                        variant={"navigation"}
                        size={"lg"}
                        asChild
                        style={{
                          backgroundColor: asPath.includes("/profile/settings")
                            ? "#be185d"
                            : undefined,
                          color: asPath.includes("/profile/settings")
                            ? "#fbcfe8"
                            : undefined,
                        }}
                      >
                        <Link
                          href={`/profile/settings`}
                          className="baseFlex w-[165px] gap-2"
                        >
                          <IoSettingsOutline className="size-4" />
                          Settings
                        </Link>
                      </Button>

                      <Button
                        variant={"navigation"}
                        size={"lg"}
                        asChild
                        style={{
                          backgroundColor: asPath.includes(
                            "/profile/statistics",
                          )
                            ? "#be185d"
                            : undefined,
                          color: asPath.includes("/profile/statistics")
                            ? "#fbcfe8"
                            : undefined,
                        }}
                      >
                        <Link
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
                        variant={"navigation"}
                        size={"lg"}
                        asChild
                        style={{
                          backgroundColor: asPath.includes("/profile/tabs")
                            ? "#be185d"
                            : undefined,
                          color: asPath.includes("/profile/tabs")
                            ? "#fbcfe8"
                            : undefined,
                        }}
                      >
                        <Link
                          href={`/profile/tabs/filters`}
                          className="baseFlex w-[165px] gap-2"
                        >
                          <TbGuitarPick className="size-4" />
                          Tabs
                        </Link>
                      </Button>

                      <Button
                        variant={"navigation"}
                        size={"lg"}
                        asChild
                        style={{
                          backgroundColor: asPath.includes("/profile/bookmarks")
                            ? "#be185d"
                            : undefined,
                          color: asPath.includes("/profile/bookmarks")
                            ? "#fbcfe8"
                            : undefined,
                        }}
                      >
                        <Link
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
