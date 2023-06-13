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

function DesktopHeader() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const { asPath } = useRouter();

  return (
    <div className={classes.desktopHeader}>
      <Link
        href={"/"}
        className={`${
          classes.logo ?? ""
        } rounded-md bg-pink-800 px-12 py-2 text-2xl`}
      >
        Tabsly
      </Link>

      <Button
        variant={"navigation"}
        size={"lg"}
        style={{
          backgroundColor: asPath.includes("/explore") ? "#831843" : undefined,
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
        style={{
          backgroundColor: asPath.includes("/create") ? "#831843" : undefined,
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
        <div
          className={`${classes.authentication ?? ""} baseFlex gap-2 lg:gap-4`}
        >
          {/* how to maybe get colors to match theme + also have an option to specify username? */}
          <SignUpButton
            mode="modal"
            afterSignUpUrl="http://localhost:3000/postSignUpRegistration"
          >
            <Button size={"lg"} className="hidden lg:block">
              Sign up
            </Button>
          </SignUpButton>
          <SignInButton
            mode="modal"
            afterSignUpUrl="http://localhost:3000/postSignUpRegistration"
          >
            <Button variant={"secondary"} className="h-11">
              Sign in
            </Button>
          </SignInButton>
        </div>
      )}

      {isSignedIn && (
        <div
          className={`${classes.authentication ?? ""} baseFlex gap-2 lg:gap-4`}
        >
          <Button variant={"ghost"}>
            <Link
              href={`/user/${user?.username ?? ""}/preferences`}
              className="baseFlex gap-4 text-lg"
            >
              {user?.username}
              {/* will need to be based on env url */}
              <UserButton afterSignOutUrl="http://localhost:3000" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default DesktopHeader;
