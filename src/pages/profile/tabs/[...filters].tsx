import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import SearchResults from "~/components/Search/SearchResults";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

function UserTabs() {
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
        <title>{`${currentUser?.username ? `${currentUser.username}` : "Tabs"} | Autostrum`}</title>
        <meta
          name="description"
          content={`Check out ${
            currentUser?.username
              ? `${currentUser.username}'s songs`
              : "this currentUser"
          } on Autostrum.`}
        />
        <meta
          property="og:title"
          content={`${currentUser?.username ? `${currentUser.username}` : "Artist"} | Autostrum`}
        ></meta>
        <meta
          property="og:url"
          content={`www.autostrum.com/currentUser/${currentUser?.username}`}
        />
        <meta
          property="og:description"
          content={`Check out ${
            currentUser?.username
              ? `${currentUser.username}'s songs`
              : "this currentUser"
          } on Autostrum.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/artistProfile.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-start md:!hidden">
          <span className="ml-4 text-3xl font-semibold tracking-tight !text-pink-50 md:text-4xl">
            Tabs
          </span>
        </div>

        <div className="baseFlex !hidden w-full !justify-start gap-4 md:!flex">
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/settings"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50/50 hover:!text-pink-50 active:!text-pink-50/75 lg:!text-4xl"
            >
              Settings
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/statistics"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50/50 hover:!text-pink-50 active:text-pink-50/75 lg:!text-4xl"
            >
              Statistics
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/tabs/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50 hover:!text-pink-50 active:!text-pink-50/75 lg:!text-4xl"
            >
              Tabs
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/bookmarks/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50/50 hover:!text-pink-50 active:!text-pink-50/75 lg:!text-4xl"
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

export default UserTabs;
