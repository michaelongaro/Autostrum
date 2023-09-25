import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaGuitar } from "react-icons/fa";
import { IoTelescopeOutline } from "react-icons/io5";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";
import classes from "./DesktopHeader.module.css";

function DesktopHeader() {
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
          className="baseFlex w-fit !flex-nowrap gap-4 text-xl"
        >
          <IoTelescopeOutline className="h-8 w-8" />
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
          className="baseFlex w-fit !flex-nowrap gap-4 text-xl"
        >
          <FaGuitar className="h-8 w-8" />
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
        <div className={`${classes.authentication ?? ""} baseFlex`}>
          <Button variant={"ghost"} asChild className="px-4 py-0">
            <Link
              href={`/profile/preferences`}
              className="baseFlex  gap-4  p-0 text-xl"
            >
              <p className="max-w-[150px] truncate xl:max-w-[250px]">
                {user?.username}
              </p>
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
