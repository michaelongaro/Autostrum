import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

import { UserProfile } from "@clerk/nextjs";
import { Separator } from "~/components/ui/separator";
import Link from "next/link";
import formatDate from "~/utils/formatDate";
import TopProfileNavigationLayout from "~/components/Layouts/TopProfileNavigationLayout";
import { TabsContent } from "~/components/ui/tabs";

function UserTabs() {
  const router = useRouter();
  const { push, asPath } = useRouter();

  // fair to have these here rather than store because (so far) we don't have to navigate around
  // "relative" classes on any parent elems in this component
  const [showPinnedTabModal, setShowPinnedTabModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // const { pinne } = useTabStore(
  //   (state) => ({
  //     originalTabData: state.originalTabData,
  //   }),
  //   shallow
  // );

  const usernameFromUrl = useMemo(() => {
    if (typeof router.query.username === "string") {
      return router.query.username;
    }
    return "";
  }, [router.query.username]);

  const user = api.user.getUserByIdOrUsername.useQuery({
    username: usernameFromUrl ?? "",
  });

  const { mutate: deleteAccount, isLoading: isDeleting } =
    api.user.deleteUser.useMutation({
      onSuccess: async () => {
        await push(`/`);
      },
      onError: (e) => {
        //  const errorMessage = e.data?.zodError?.fieldErrors.content;
        //  if (errorMessage && errorMessage[0]) {
        //    toast.error(errorMessage[0]);
        //  } else {
        //    toast.error("Failed to post! Please try again later.");
        //  }
      },
    });

  // const { mutate: update, isLoading: isLiking } =
  //   api.like.toggleLike.useMutation({
  //     onMutate: async () => {
  //       // optimistic update
  //       await ctx.like.getLikeId.cancel();

  //       ctx.like.getLikeId.setData(
  //         {
  //           tabId: id,
  //           userId: userId ?? "",
  //         },
  //         (prev) => {
  //           if (typeof prev === "number") return null;
  //           // most likely can't get away with random number like this
  //           // but I'm not sure how to set it with "proper" new id when it hasn't
  //           // even been created in db yet...
  //           return 100;
  //         }
  //       );
  //     },
  //     onError: (e) => {
  //       console.error(e);
  //     },
  //     onSettled: () => {
  //       void ctx.like.getLikeId.invalidate();
  //     },
  //   });

  return (
    <motion.div
      key={"UserTabs"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // remove z-50 if possible, I think <Bubbles /> is messing it up
      className="baseVertFlex z-50 w-full"
    >
      <TabsContent value="tabs">
        <div>hi</div>
      </TabsContent>
    </motion.div>
  );
}

UserTabs.PageLayout = TopProfileNavigationLayout;

export default UserTabs;
