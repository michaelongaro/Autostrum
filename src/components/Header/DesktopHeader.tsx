import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";
import Link from "next/link";
import { FaGuitar } from "react-icons/fa";
import { IoTelescopeOutline } from "react-icons/io5";
import { Button } from "../ui/button";

import classes from "./DesktopHeader.module.css";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Image from "next/image";

function DesktopHeader() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const { asPath } = useRouter();

  return (
    <div className={classes.desktopHeader}>
      <Link href={"/"} className={`${classes.logo ?? ""}`}>
        <Image
          src="/logoWithTitle.svg"
          alt="Autostrum header logo"
          width={175}
          height={100}
          priority
        />
      </Link>

      <Button
        variant={"navigation"}
        size={"lg"}
        asChild
        style={{
          backgroundColor: asPath.includes("/explore") ? "#be185d" : undefined,
          color: asPath.includes("/explore") ? "#fbcfe8" : undefined,
        }}
        className={classes.explore}
      >
        <Link
          href={"/explore"}
          className="baseFlex gap-2 text-base lg:text-xl xl:gap-4"
        >
          <IoTelescopeOutline className="h-4 w-4 xl:h-8 xl:w-8" />
          Explore
        </Link>
      </Button>

      <Button
        variant={"navigation"}
        size={"lg"}
        asChild
        style={{
          backgroundColor: asPath.includes("/create") ? "#be185d" : undefined,
          color: asPath.includes("/create") ? "#fbcfe8" : undefined,
        }}
        className={classes.create}
      >
        <Link
          href={"/create"}
          className="baseFlex gap-2 text-base lg:text-xl xl:gap-4"
        >
          <FaGuitar className="h-4 w-4 xl:h-8 xl:w-8" />
          Create
        </Link>
      </Button>

      {/* opting for double "&&" instead of ternary for better readability */}
      {!isSignedIn && (
        <div className={`${classes.authentication ?? ""} baseFlex gap-4`}>
          {/* how to maybe get colors to match theme + also have an option to specify username? */}
          <SignUpButton
            mode="modal"
            afterSignUpUrl={`${
              process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
            }/postSignUpRegistration`}
          >
            <Button size={"lg"} className="hidden lg:block">
              Sign up
            </Button>
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
        <div className={`${classes.authentication ?? ""} baseFlex`}>
          <Button variant={"ghost"} asChild className="px-4 py-0">
            <Link
              href={`/profile/preferences`}
              className="baseFlex gap-4 p-0 text-xl"
            >
              {user?.username}
              {/* will need to be based on env url */}
              <UserButton
                afterSignOutUrl={`${process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""}/`}
              />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default DesktopHeader;
