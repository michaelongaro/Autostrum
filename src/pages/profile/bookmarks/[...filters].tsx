import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import SearchResults from "~/components/Search/SearchResults";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

function UserBookmarks() {
  const { userId } = useAuth();

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  return (
    <motion.div
      key={"userTabs"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full max-w-[1400px] !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>My bookmarks | Autostrum</title>
        <meta
          name="description"
          content="View and sort through all of your bookmarked tabs."
        />
        <meta property="og:title" content="My bookmarks | Autostrum"></meta>
        <meta
          property="og:url"
          content="https://www.autostrum.com/profile/bookmarks"
        />
        <meta
          property="og:description"
          content="View and sort through all of your bookmarked tabs."
        />
        <meta property="og:site_name" content="Autostrum" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-start md:!hidden">
          <span className="ml-4 text-3xl font-semibold tracking-tight !text-foreground md:text-4xl">
            Bookmarks
          </span>
        </div>

        <div className="baseFlex !hidden w-full !justify-start gap-4 md:!flex">
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/settings"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
            >
              Settings
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/statistics"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
            >
              Statistics
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/tabs/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
            >
              Tabs
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/bookmarks/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
            >
              Bookmarks
            </Link>
          </Button>
        </div>

        <SearchResults />
      </div>
    </motion.div>
  );
}

export default UserBookmarks;
