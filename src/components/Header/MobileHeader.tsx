import { SignInButton, SignOutButton, useAuth, useUser } from "@clerk/nextjs";
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

///
import { IoCompassOutline } from "react-icons/io5";
import Binoculars from "~/components/ui/icons/Binoculars";
import ThemePicker from "~/components/Header/ThemePicker";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    transform: "translateY(0)",
  },
  closed: {
    opacity: 0.5,
    transform: "translateY(-100%)",
  },
};

function MobileHeader() {
  const [mobileHeaderIsOpen, setMobileHeaderIsOpen] = useState(false);

  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const { asPath } = useRouter();

  const localStorageTabData = useLocalStorageValue("autostrum-tabData");
  const localStorageRedirectRoute = useLocalStorageValue(
    "autostrum-redirectRoute",
  );

  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const { getStringifiedTabData, mobileHeaderModal, setMobileHeaderModal } =
    useTabStore((state) => ({
      getStringifiedTabData: state.getStringifiedTabData,
      mobileHeaderModal: state.mobileHeaderModal,
      setMobileHeaderModal: state.setMobileHeaderModal,
    }));

  useEffect(() => {
    if (!mobileHeaderModal.showing) {
      setMobileHeaderIsOpen(false);
    }
  }, [mobileHeaderModal]);

  return (
    <>
      <AnimatePresence mode="wait">
        {mobileHeaderIsOpen && (
          <motion.div
            key={"mobileHamburgerMenu"}
            variants={opacityAndScaleVariants}
            initial="closed"
            animate="expanded"
            exit="closed"
            transition={{ duration: 0.3 }}
            className="baseVertFlex fixed left-0 top-16 z-[49] max-h-[80dvh] w-full !justify-start overflow-y-auto rounded-b-xl bg-pink-400 shadow-lg"
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
                    className="baseFlex w-[165px] gap-2 text-[1.13rem]"
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
                    className="baseFlex w-[165px] gap-2 text-[1.13rem]"
                  >
                    <BsPlus className="size-6" />
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

              {!isSignedIn && (
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
              )}

              {isSignedIn && user && (
                <div className="baseVertFlex w-full max-w-[348px] !items-start gap-4">
                  <div className="baseFlex w-full !justify-between gap-4">
                    <Button
                      variant={"link"}
                      size={"lg"}
                      asChild
                      style={{
                        backgroundColor: asPath.includes(
                          `/profile/${user.username}`,
                        )
                          ? "#be185d"
                          : undefined,
                        color: asPath.includes(`/profile/${user.username}`)
                          ? "#fbcfe8"
                          : undefined,
                      }}
                    >
                      <Link
                        href={`
                        /profile/${user.username}
                        `}
                        className="baseFlex !h-10 gap-2 !px-0"
                      >
                        <Image
                          src={user.imageUrl}
                          alt="User profile image"
                          className="!size-8 rounded-full"
                          width={48}
                          height={48}
                        />
                        <p className="text-lg font-medium">{user.username}</p>
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
                        backgroundColor: asPath.includes("/profile/preferences")
                          ? "#be185d"
                          : undefined,
                        color: asPath.includes("/profile/preferences")
                          ? "#fbcfe8"
                          : undefined,
                      }}
                    >
                      <Link
                        href={`/profile/preferences`}
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
                        backgroundColor: asPath.includes("/profile/statistics")
                          ? "#be185d"
                          : undefined,
                        color: asPath.includes("/profile/statistics")
                          ? "#fbcfe8"
                          : undefined,
                      }}
                    >
                      <Link
                        href={`/profile/preferences`}
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
                        href={`/profile/tabs`}
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
                        href={`/profile/bookmarks`}
                        className="baseFlex w-[165px] gap-2 !px-0"
                      >
                        <IoBookmarkOutline className="size-4 shrink-0" />
                        Bookmarks
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="headerBackgroundGradient sticky left-0 top-0 z-[49] grid h-16 w-full grid-cols-1 grid-rows-1 shadow-md">
        <div className="absolute flex h-16 w-full items-start justify-between overflow-clip p-2 lg:hidden">
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
                className="baseVertFlex size-full max-h-[100dvh] max-w-[100vw] !justify-start bg-gradient-to-b from-pink-400 to-pink-500 p-0"
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
              color="#fdf2f8"
              rounded
              size={28}
            />
          </div>
        </div>
      </nav>
    </>
  );
}

export default MobileHeader;
