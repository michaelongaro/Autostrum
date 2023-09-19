import { useMemo, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { IoSettingsOutline } from "react-icons/io5";
import { FaGuitar } from "react-icons/fa";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import Link from "next/link";
import { api } from "~/utils/api";
import { motion } from "framer-motion";
import { BiErrorCircle } from "react-icons/bi";
import { useAuth } from "@clerk/nextjs";

interface Layout {
  children: ReactNode;
}

function TopProfileNavigationLayout({ children }: Layout) {
  const { userId } = useAuth();
  const { asPath, push, query } = useRouter();

  const usernameFromUrl = useMemo(() => {
    if (typeof query.username === "string") {
      return query.username;
    }
    return "";
  }, [query.username]);

  const finalQueryOfUrl = useMemo(() => {
    if (asPath.includes("/tabs")) return "tabs";
    if (asPath.includes("/likes")) return "likes";
    if (asPath.includes("/preferences")) return "preferences";
    return "preferences";
  }, [asPath]);

  function pushToTabsOrLikes(pushToTabs: boolean) {
    void push(`/profile/${pushToTabs ? "tabs" : "likes"}/filters`, undefined, {
      scroll: false, // defaults to true but try both
      shallow: true,
    });
  }

  function getDynamicWidth() {
    if (finalQueryOfUrl === "tabs") return "w-11/12 md:w-3/4";
    if (finalQueryOfUrl === "likes") return "w-11/12 md:w-3/4";
    if (finalQueryOfUrl === "preferences") return "w-11/12 lg:w-[975px]";
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
        className="baseVertFlex my-12 w-full md:my-24"
      >
        <TabsList className="z-40 grid h-full w-11/12 grid-cols-3 gap-2 md:w-[450px]">
          <TabsTrigger
            value="preferences"
            className="baseVertFlex gap-2 md:!flex-row"
            onClick={() => {
              void push(`/profile/preferences`);
            }}
          >
            <IoSettingsOutline className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value="tabs"
            className="baseVertFlex gap-2 md:!flex-row"
            onClick={() => {
              pushToTabsOrLikes(true);
            }}
          >
            <FaGuitar className="h-4 w-4" />
            Tabs
          </TabsTrigger>
          <TabsTrigger
            value="likes"
            className="baseVertFlex gap-2 md:!flex-row"
            onClick={() => {
              pushToTabsOrLikes(false);
            }}
          >
            <AiOutlineHeart className="h-4 w-4" />
            Likes
          </TabsTrigger>
        </TabsList>
        <div className={`min-h-[100dvh] ${getDynamicWidth()!}`}>
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
