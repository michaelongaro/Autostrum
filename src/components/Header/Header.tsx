import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";

function Header() {
  return (
    <nav className="headerBackgroundGradient sticky left-0 top-0 z-[49] grid h-16 w-full grid-cols-1 grid-rows-1 shadow-sm">
      <DesktopHeader />
      <MobileHeader />
    </nav>
  );
}

export default Header;
