import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useState, useMemo, type ReactNode } from "react";
import { AiOutlineHeart } from "react-icons/ai";
import { BiErrorCircle } from "react-icons/bi";
import { FaGuitar } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface Layout {
  children: ReactNode;
}

function TopProfileNavigationLayout({ children }: Layout) {
  const { userId, isLoaded } = useAuth();
  const { asPath, push } = useRouter();

  const finalQueryOfUrl = useMemo(() => {
    if (asPath.includes("/tabs")) return "tabs";
    if (asPath.includes("/bookmarks")) return "bookmarks";
    if (asPath.includes("/preferences")) return "preferences";
    return "preferences";
  }, [asPath]);

  const [tabValue, setTabValue] = useState<
    "preferences" | "tabs" | "bookmarks"
  >(finalQueryOfUrl);

  function pushToNewUrl(tabValue: "preferences" | "tabs" | "bookmarks") {
    if (tabValue === "preferences") {
      void push(`/profile/preferences`);
    } else {
      void push(`/profile/${tabValue}/filters`);
    }
  }

  function getDynamicWidth() {
    if (finalQueryOfUrl === "preferences") {
      return "w-11/12 lg:w-[975px]";
    }

    return "w-11/12 md:w-3/4";
  }

  if (!isLoaded) {
    return null;
  }

  if (!userId) {
    return <UserIsNotAuthenticated />;
  }

  return (
    <motion.div
      key={"topProfileNavigationLayout"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <Tabs
        defaultValue={finalQueryOfUrl}
        value={tabValue}
        onValueChange={(value) => {
          setTabValue(value as "preferences" | "tabs" | "bookmarks");
          pushToNewUrl(value as "preferences" | "tabs" | "bookmarks");
        }}
        className="baseVertFlex my-12 w-full md:my-24"
      >
        <TabsList className="z-40 grid h-16 w-11/12 grid-cols-3 gap-2 md:h-10 md:w-[500px]">
          <TabsTrigger
            value="preferences"
            className="baseVertFlex w-full gap-2 md:!flex-row"
            onClick={() => {
              void push(`/profile/preferences`);
            }}
          >
            <IoSettingsOutline className="h-4 w-4 md:h-5 md:w-5" />
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value="tabs"
            className="baseVertFlex w-full gap-2 md:!flex-row"
          >
            <FaGuitar className="h-4 w-4 md:h-5 md:w-5" />
            Tabs
          </TabsTrigger>
          <TabsTrigger
            value="bookmarks"
            className="baseVertFlex w-full gap-2 md:!flex-row"
          >
            <AiOutlineHeart className="h-4 w-4 md:h-5 md:w-5" />
            Likes
          </TabsTrigger>
        </TabsList>
        <div className={`min-h-[100dvh] ${getDynamicWidth()}`}>
          <AnimatePresence mode="wait">{children}</AnimatePresence>
        </div>
      </Tabs>
    </motion.div>
  );
}

export default TopProfileNavigationLayout;

function UserIsNotAuthenticated() {
  return (
    <div className="lightGlassmorphic baseVertFlex w-10/12 gap-4 rounded-md p-4 md:w-[550px]">
      <div className="baseFlex gap-2">
        <BiErrorCircle className="h-8 w-8" />
        <h1 className="text-2xl font-bold">Access denied</h1>
      </div>
      <p className="text-center text-lg">
        You must be logged in to view this page.
      </p>
    </div>
  );
}
