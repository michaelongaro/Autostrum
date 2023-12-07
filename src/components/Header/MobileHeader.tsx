import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { Squash as Hamburger } from "hamburger-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FaGuitar } from "react-icons/fa";
import { IoTelescopeOutline } from "react-icons/io5";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    transform: "translateY(0)",
  },
  closed: {
    opacity: 0,
    transform: "translateY(-100%)",
  },
};

function MobileHeader() {
  const [mobileHeaderIsOpen, setMobileHeaderIsOpen] = useState(false);

  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const { asPath } = useRouter();

  const localStorageTabData = useLocalStorageValue("tabData");
  const localStorageRedirectRoute = useLocalStorageValue("redirectRoute");

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
            className="fixed left-0 top-16 z-[49] h-48 w-full bg-pink-400 shadow-lg"
          >
            <div className="baseVertFlex h-full items-center justify-center gap-4 shadow-md">
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
                <Link href={"/explore"} className="baseFlex w-40 gap-2 text-lg">
                  <IoTelescopeOutline className="h-6 w-6" />
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
                <Link href={"/create"} className="baseFlex w-40 gap-2 text-lg">
                  <FaGuitar className="h-6 w-6" />
                  Create
                </Link>
              </Button>

              {/* opting for double "&&" instead of ternary for better readability */}
              {!isSignedIn && (
                <div className="baseFlex gap-4">
                  <SignUpButton
                    mode="modal"
                    afterSignUpUrl={`${
                      process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                    }/postSignUpRegistration`}
                    afterSignInUrl={`${
                      process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                    }${asPath}`}
                  >
                    <Button
                      className="h-10 px-6"
                      onClick={() => {
                        if (asPath.includes("/create")) {
                          localStorageTabData.set(getStringifiedTabData());
                        }

                        // technically can sign in from signup page and vice versa
                        if (!userId) localStorageRedirectRoute.set(asPath);
                        // ^^ but technically could just append it onto the postSignupRegistration route right?
                      }}
                    >
                      Sign up
                    </Button>
                  </SignUpButton>
                  <SignInButton
                    mode="modal"
                    afterSignUpUrl={`${
                      process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                    }/postSignUpRegistration`}
                    afterSignInUrl={`${
                      process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                    }${asPath}`}
                  >
                    <Button
                      variant={"secondary"}
                      className="h-10"
                      onClick={() => {
                        if (asPath.includes("/create")) {
                          localStorageTabData.set(getStringifiedTabData());
                        }

                        // technically can sign in from signup page and vice versa
                        if (!userId) localStorageRedirectRoute.set(asPath);
                        // ^^ but technically could just append it onto the postSignupRegistration route right?
                      }}
                    >
                      Sign in
                    </Button>
                  </SignInButton>
                </div>
              )}

              {isSignedIn && (
                <div className="baseFlex">
                  <Button variant={"ghost"} asChild className="px-4 py-0">
                    <Link
                      href={`/profile/preferences`}
                      className="baseFlex gap-4 p-0 text-xl"
                    >
                      {user?.username}
                      <UserButton
                        afterSignOutUrl={`${
                          process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                        }/`}
                      />
                    </Link>
                  </Button>
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
            className="baseFlex h-12 pl-2 hover:brightness-[1.05] active:brightness-[0.95]"
          >
            <Image
              src="/logoWithTitle.svg"
              alt="Autostrum header logo"
              style={{
                filter: "drop-shadow(0px 1px 0px hsla(336, 84%, 17%, 0.25))",
              }}
              width={150}
              height={50}
              priority
            />
          </Link>
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
      </nav>
    </>
  );
}

export default MobileHeader;
