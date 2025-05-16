import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { FaEye } from "react-icons/fa";
import { GiMusicalScore } from "react-icons/gi";
import SearchResults from "~/components/Search/SearchResults";
import { Separator } from "~/components/ui/separator";
import { api } from "~/utils/api";

interface UserProfile {
  uniqueKey: string;
}

function UserProfile({ uniqueKey }: UserProfile) {
  const { query } = useRouter();

  const [userHasBeenFound, setUserHasBeenFound] = useState(false);

  const { data: userId, isFetching: isFetchingUserId } =
    api.user.getByUsername.useQuery(query.username as string, {
      enabled: query.username !== undefined && !userHasBeenFound, // do not want to refetch upon history.replaceState() below
    });

  const { data: user, isFetching: isFetchingUser } = api.user.getById.useQuery(
    userId!,
    {
      enabled: userId !== null && !userHasBeenFound, // do not want to refetch upon history.replaceState() below
    },
  );

  useEffect(() => {
    setUserHasBeenFound(Boolean(user));
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const currentUrl = new URL(window.location.href);

    // if the userId is not present in the url, add it after the name parameter
    // (used to limit search results to this specific user)
    if (query.username && !query.id) {
      currentUrl.pathname = `/user/${query.username as string}/${user?.id}/filters`;
      window.history.replaceState({}, "", currentUrl);
    }
  }, [user, query]);

  return (
    <motion.div
      key={uniqueKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full max-w-[1400px] !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>{`${user?.username ? `${user.username}` : "User"} | Autostrum`}</title>
        <meta
          name="description"
          content={`Check out ${
            user?.username ? `${user.username}'s songs` : "this user"
          } on Autostrum.`}
        />
        <meta
          property="og:title"
          content={`${user?.username ? `${user.username}` : "User"} | Autostrum`}
        ></meta>
        <meta
          property="og:url"
          content={`www.autostrum.com/user/${user?.username}`}
        />
        <meta
          property="og:description"
          content={`Check out ${
            user?.username ? `${user.username}'s songs` : "this user"
          } on Autostrum.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/userProfile.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <AnimatePresence mode="popLayout">
          {isFetchingUser && (
            <motion.div
              key={"userMetadataLoading"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="baseVertFlex w-full !items-start gap-4 px-2 md:!flex-row md:!items-center md:!justify-between md:px-0"
            >
              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-1">User</div>

                <div className="pulseAnimation h-[38px] w-36 rounded-md bg-pink-300"></div>
              </div>

              <div className="baseVertFlex !items-start gap-4 md:!flex-row md:!items-center">
                <div className="baseFlex gap-2">
                  <GiMusicalScore className="size-4" />
                  <span className="font-medium">Songs</span>
                  <div className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"></div>
                </div>

                <div className="baseFlex gap-2">
                  <FaEye className="size-4" />
                  <span className="font-medium">Views</span>
                  <div className="pulseAnimation h-5 w-10 rounded-md bg-pink-300"></div>
                </div>
              </div>
            </motion.div>
          )}

          {user && (
            <motion.div
              key={"userMetadataLoaded"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="baseVertFlex w-full !items-start gap-4 px-2 md:!flex-row md:!items-end md:!justify-between md:px-0"
            >
              <div className="baseVertFlex !items-start gap-2">
                User
                <h1
                  style={
                    {
                      // computed font size based on length of user name
                    }
                  }
                  className="baseFlex text-3xl font-semibold tracking-tight text-pink-50 md:left-8 md:top-14 md:text-4xl"
                >
                  {user.username}
                </h1>
              </div>

              <div className="baseFlex gap-4 font-medium sm:text-lg">
                <div className="baseFlex gap-2">
                  <BsMusicNoteBeamed className="size-4 sm:size-5" />
                  <span>{user.totalTabs}</span>
                  <span>{user.totalTabs === 1 ? "Song" : "Songs"}</span>
                </div>

                <Separator orientation="vertical" className="h-6 w-[1px]" />

                <div className="baseFlex gap-2">
                  <FaEye className="size-4 sm:size-5" />
                  <span>{user.totalTabViews}</span>
                  <span>{user.totalTabViews === 1 ? "View" : "Views"}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SearchResults isFetchingUserId={isFetchingUser} />
      </div>
    </motion.div>
  );
}

export default UserProfile;
