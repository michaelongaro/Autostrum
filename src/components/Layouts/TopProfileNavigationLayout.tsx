import { useMemo, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "~/utils/api";

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

  const user = api.user.getUserByIdOrUsername.useQuery({
    username: usernameFromUrl ?? "",
  });

  return (
    <div className="baseVertFlex w-full">
      <Tabs
        defaultValue={finalQueryOfUrl} // optimize later to show correct even if reloading page
        onValueChange={(value) =>
          void push(`/user/${user.data?.username ?? ""}/${value}`)
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
    </div>
  );
}

export default TopProfileNavigationLayout;
