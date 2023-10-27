import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import { Squash as Hamburger } from "hamburger-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { FaGuitar } from "react-icons/fa";
import { IoTelescopeOutline } from "react-icons/io5";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";

function MobileHeader() {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();

  const { asPath } = useRouter();

  const localStorageTabData = useLocalStorageValue("tabData");
  const localStorageRedirectRoute = useLocalStorageValue("redirectRoute");

  const {
    getStringifiedTabData,
    showMobileHeaderModal,
    setShowMobileHeaderModal,
  } = useTabStore(
    (state) => ({
      getStringifiedTabData: state.getStringifiedTabData,
      showMobileHeaderModal: state.showMobileHeaderModal,
      setShowMobileHeaderModal: state.setShowMobileHeaderModal,
    }),
    shallow
  );

  return (
    <div
      style={{
        height: showMobileHeaderModal ? "15.75rem" : "4rem",
        boxShadow: showMobileHeaderModal
          ? // these are roughly tailwind shadow-md values
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
          : "0 4px 6px -1px transparent, 0 2px 4px -2px transparent",
      }}
      className="absolute flex h-full w-full items-start justify-between overflow-clip p-2 transition-all lg:hidden"
    >
      <Link href={"/"} className="baseFlex h-12 pl-2">
        <Image
          src="/logoWithTitle.svg"
          alt="Autostrum header logo"
          width={150}
          height={50}
          priority
        />
      </Link>
      <Hamburger
        toggled={showMobileHeaderModal}
        onToggle={(open) => {
          setShowMobileHeaderModal(open);
        }}
        color="#fdf2f8"
        rounded
        size={28}
      />

      <div className="mobileNavbarGlassmorphic absolute left-0 top-16 h-48 w-full transition-all">
        <div className="baseVertFlex h-full items-center justify-center gap-4">
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
            <Link href={"/explore"} className="baseFlex gap-2 text-lg">
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
            <Link href={"/create"} className="baseFlex gap-2 text-lg">
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
      </div>
    </div>
  );
}

export default MobileHeader;
