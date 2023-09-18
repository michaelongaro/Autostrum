import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";

interface Header {
  offscreen: boolean;
}

function Header({ offscreen }: Header) {
  return (
    <nav
      style={{
        top: offscreen ? "-4rem" : "0",
        transition: "top 0.3s cubic-bezier(0.34, 1, 0.64, 1)",
      }}
      className="headerBackgroundGradient sticky left-0 z-[49] grid h-16 w-full grid-cols-1 grid-rows-1 shadow-sm"
    >
      <DesktopHeader />
      <MobileHeader />
    </nav>
  );
}

export default Header;
