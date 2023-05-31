import { useState } from "react";
import { Squash as Hamburger } from "hamburger-react";
import { SignUpButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "../ui/button";

function MobileHeader() {
  const [isOpen, setOpen] = useState(false);

  return (
    <div
      style={{
        height: isOpen ? "16rem" : "4rem",
      }}
      className="absolute flex h-full w-full items-start justify-between overflow-clip p-2 transition-all md:hidden"
    >
      <div className="bg-pink-500 pb-3 pl-4 pr-4 pt-2 text-white">
        Logo Here
      </div>
      <Hamburger toggled={isOpen} toggle={setOpen} color="#FFFFFF" rounded />

      {/* bg-pink-300 bg-opacity-40 bg-clip-padding shadow-lg backdrop-blur-lg backdrop-filter */}
      <div className="lightGlassmorphic absolute left-0 top-16 h-48 w-full overflow-hidden  transition-all">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <Button variant={"secondary"} size={"lg"}>
            <Link
              href={"/create"}
              // className="rounded-md border-2 border-pink-200 px-4 py-2 text-white"
            >
              Create
            </Link>
          </Button>

          <Button variant={"secondary"} size={"lg"}>
            <Link
              href={"/explore"}
              // className="rounded-md border-2 border-pink-200 px-4 py-2 text-white"
            >
              Explore
            </Link>
          </Button>

          <div className="baseFlex gap-4">
            <SignUpButton mode="modal">
              <Button size={"lg"}>Sign up</Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant={"secondary"}>Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileHeader;
