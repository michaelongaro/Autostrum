import { useState, useEffect } from "react";
import { Squash as Hamburger } from "hamburger-react";
import {
  SignUpButton,
  SignInButton,
  useAuth,
  useUser,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "../ui/button";
import { useRouter } from "next/router";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { FaGuitar } from "react-icons/fa";
import { IoTelescopeOutline } from "react-icons/io5";
import Image from "next/image";
import { useLocalStorageValue } from "@react-hookz/web";

function MobileHeader() {
  const [isOpen, setOpen] = useState(false);
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();

  const { asPath } = useRouter();

  const localStorageTabData = useLocalStorageValue("tabData");
  const localStorageRedirectRoute = useLocalStorageValue("redirectRoute");

  const { getStringifiedTabData } = useTabStore(
    (state) => ({
      getStringifiedTabData: state.getStringifiedTabData,
    }),
    shallow
  );

  useEffect(() => {
    setOpen(false);
  }, [asPath]);

  return (
    <div
      style={{
        height: isOpen ? "15.75rem" : "4rem",
        boxShadow: isOpen
          ? // these are roughly tailwind shadow-md values
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
          : "0 4px 6px -1px transparent, 0 2px 4px -2px transparent",
      }}
      className="absolute flex h-full w-full items-start justify-between overflow-clip p-2 transition-all md:hidden"
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
        toggled={isOpen}
        toggle={setOpen}
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
                  size={"lg"}
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
                  className="h-11"
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
