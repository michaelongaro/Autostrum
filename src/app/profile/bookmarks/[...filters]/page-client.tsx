"use client";

import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import SearchResults from "~/components/Search/SearchResults";
import styles from "~/components/Search/SearchResults.module.css";
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
      className={`${styles.pageShell} baseVertFlex my-12 min-h-[650px] !justify-start md:my-24 md:p-0`}
    >
      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-start md:!hidden">
          <span className="ml-4 text-3xl font-semibold tracking-tight !text-foreground md:text-4xl">
            Bookmarks
          </span>
        </div>

        <div className="baseFlex !hidden w-full !justify-start gap-4 md:!flex">
          <Button
            role="link"
            variant={"text"}
            nativeButton={false}
            render={
              <Link
                prefetch={false}
                href={"/profile/settings"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
              >
                Settings
              </Link>
            }
          />
          <Button
            role="link"
            variant={"text"}
            nativeButton={false}
            render={
              <Link
                prefetch={false}
                href={"/profile/statistics"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
              >
                Statistics
              </Link>
            }
          />
          <Button
            role="link"
            variant={"text"}
            nativeButton={false}
            render={
              <Link
                prefetch={false}
                href={"/profile/tabs/filters"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
              >
                Tabs
              </Link>
            }
          />
          <Button
            role="link"
            variant={"text"}
            nativeButton={false}
            render={
              <Link
                prefetch={false}
                href={"/profile/bookmarks/filters"}
                className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground hover:!text-foreground active:!text-foreground/75 md:!text-4xl"
              >
                Bookmarks
              </Link>
            }
          />
        </div>

        <SearchResults />
      </div>
    </motion.div>
  );
}

export default UserBookmarks;
