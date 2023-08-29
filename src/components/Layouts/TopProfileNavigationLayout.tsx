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

interface Layout {
  children: ReactNode;
}

function TopProfileNavigationLayout({ children }: Layout) {
  const router = useRouter();
  const { push, asPath } = useRouter();

  const usernameFromUrl = useMemo(() => {
    if (typeof router.query.username === "string") {
      return router.query.username;
    }
    return "";
  }, [router.query.username]);

  const finalQueryOfUrl = useMemo(() => {
    if (asPath.includes("/tabs")) return "tabs";
    if (asPath.includes("/likes")) return "likes";
    if (asPath.includes("/preferences")) return "preferences";
    return "preferences";
  }, [asPath]);

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      username: usernameFromUrl,
    },
    {
      enabled: usernameFromUrl !== "",
    }
  );

  function getDynamicWidth() {
    if (finalQueryOfUrl === "tabs") return "w-10/12 md:w-3/4";
    if (finalQueryOfUrl === "likes") return "w-10/12 md:w-3/4";
    if (finalQueryOfUrl === "preferences") return "w-11/12 md:max-w-[500px]";
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
        onValueChange={
          (value) => void push(`/profile/${value}`) // should probably include default params for search too right?
        }
        className="baseVertFlex my-24"
      >
        <TabsList className="grid h-full w-11/12 grid-cols-3 gap-2 md:w-[450px]">
          {/* TODO: make this tabs container's width constant no matter which tab is selected */}
          <TabsTrigger
            value="preferences"
            className="baseVertFlex gap-2 md:!flex-row"
          >
            <IoSettingsOutline className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="tabs" className="baseVertFlex gap-2 md:!flex-row">
            <FaGuitar className="h-4 w-4" />
            Tabs
          </TabsTrigger>
          <TabsTrigger
            value="likes"
            className="baseVertFlex gap-2 md:!flex-row"
          >
            <AiOutlineHeart className="h-4 w-4" />
            Likes
          </TabsTrigger>
        </TabsList>
        <div
          style={{
            width: getDynamicWidth(),
          }}
          className="min-h-[100dvh]"
        >
          <AnimatePresence mode="wait">{children}</AnimatePresence>
        </div>
      </Tabs>
    </motion.div>
  );
}

export default TopProfileNavigationLayout;
