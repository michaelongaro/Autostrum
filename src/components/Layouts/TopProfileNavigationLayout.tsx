import { useMemo, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
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
    const query = asPath.split("/").pop();
    if (query === "tabs" || query === "likes" || query === "preferences") {
      return query;
    }
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
          (value) => void push(`/user/${artist?.username ?? ""}/${value}`) // should probably include default params for search too right?
        }
        className="baseVertFlex my-24"
      >
        <TabsList className="grid w-full max-w-[500px] grid-cols-3">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="tabs">Tabs</TabsTrigger>
          <TabsTrigger value="likes">Likes</TabsTrigger>
        </TabsList>
        <div className="min-h-[100dvh] w-full">
          <AnimatePresence mode="wait">{children}</AnimatePresence>
        </div>
      </Tabs>
    </motion.div>
  );
}

export default TopProfileNavigationLayout;
