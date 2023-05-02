import React from "react";
import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";

function Header() {
  return (
    <nav className="heavyGlassmorphic absolute left-0 top-0 z-10 grid h-16 w-full grid-cols-1 grid-rows-1 ">
      <DesktopHeader />
      <MobileHeader />
    </nav>
  );
}

export default Header;
