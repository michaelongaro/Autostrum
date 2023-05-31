import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { FaGuitar } from "react-icons/fa";
import { IoTelescopeOutline } from "react-icons/io5";
import { Button } from "../ui/button";

import classes from "./DesktopHeader.module.css";

function DesktopHeader() {
  const { userId, isLoaded, isSignedIn } = useAuth();

  return (
    <div className={classes.desktopHeader}>
      <div
        className={`${
          classes.logo ?? ""
        } rounded-md bg-pink-800 px-12 py-2 text-2xl`}
      >
        Tabsly
      </div>

      <Button variant={"secondary"} size={"lg"} className={classes.explore}>
        <Link
          href={"/explore"}
          className="baseFlex gap-2 text-base lg:text-xl xl:gap-4"
        >
          <IoTelescopeOutline className="h-4 w-4 xl:h-8 xl:w-8" />
          Explore
        </Link>
      </Button>

      <Button variant={"secondary"} size={"lg"} className={classes.create}>
        <Link
          href={"/create"}
          className="baseFlex gap-2 text-base lg:text-xl xl:gap-4"
        >
          <FaGuitar className="h-4 w-4 xl:h-8 xl:w-8" />
          Create
        </Link>
      </Button>

      {!isSignedIn && (
        <div
          className={`${classes.authentication ?? ""} baseFlex gap-2 lg:gap-4`}
        >
          {/* how to maybe get colors to match theme + also have an option to specify username? */}
          <SignUpButton mode="modal">
            <Button size={"lg"} className="hidden lg:block">
              Register
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button variant={"secondary"}>Sign in</Button>
          </SignInButton>
        </div>
      )}

      {isSignedIn && (
        <div
          className={`${classes.authentication ?? ""} baseFlex gap-2 lg:gap-4`}
        >
          <Link href={`/profile`}>
            {/* get username + profile picture from trpc route above */}
          </Link>
        </div>
      )}
    </div>
  );
}

export default DesktopHeader;
