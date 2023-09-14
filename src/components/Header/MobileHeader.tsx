import { useState } from "react";
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
import { FaGuitar } from "react-icons/fa";
import { IoTelescopeOutline } from "react-icons/io5";
import Image from "next/image";

function MobileHeader() {
  const [isOpen, setOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const { asPath } = useRouter();

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
      <Link
        href={"/"}
        onClick={() => setOpen(false)}
        className="baseFlex h-12 pl-2"
      >
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
          >
            <Link href={"/create"} className="baseFlex gap-2 text-lg">
              <FaGuitar className="h-6 w-6" />
              Create
            </Link>
          </Button>

          {/* opting for double "&&" instead of ternary for better readability */}
          {!isSignedIn && (
            <div className="baseFlex gap-4">
              {/* how to maybe get colors to match theme + also have an option to specify username? */}
              <SignUpButton
                mode="modal"
                afterSignUpUrl={`${
                  process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                }/postSignUpRegistration`}
              >
                <Button size={"lg"}>Sign up</Button>
              </SignUpButton>
              <SignInButton
                mode="modal"
                afterSignUpUrl={`${
                  process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                }/postSignUpRegistration`}
              >
                <Button variant={"secondary"} className="h-11">
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
                  onClick={() => setOpen(false)}
                >
                  {user?.username}
                  {/* will need to be based on env url */}
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
