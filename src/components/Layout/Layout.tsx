import type { ReactNode } from "react";
import Bubbles from "../Bubbles";
import Header from "../Header/Header";

interface Layout {
  children: ReactNode;
}

function Layout({ children }: Layout) {
  return (
    <div
      style={{
        background:
          "linear-gradient(315deg, #ff3721, #ff6196, #fba6ff) fixed center / cover",
      }}
      className="baseVertFlex min-h-[100vh] w-[100vw]"
    >
      {/* not sure why setting z-index 0 on Bubbles doesn't make everything else automatically
          interactable */}
      <Bubbles />
      <Header />
      {children}
    </div>
  );
}

export default Layout;
