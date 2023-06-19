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

// centered danger button for deleting account (onClick calls trpc/api route to delete account and bring you back to homepage)
//      (we are opting to make the user anonymous instead of deleting their tabs/comments)
//                (to do this, I think the best way would be just to automatically default back to default profile pic + name "Anonymous" and not allow clicking on their name/profile since
//                 they wouldn't have a profile to display. Should be fine to go to their old profile since it would just default back to "This user doesn't exist" page)

// figure out how to do proper nested layout where only the inner contents crossfade,
// not the sticky navigation
// ^^^^^^^^

function Preferences() {
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

  const user = api.artist.getByIdOrUsername.useQuery({
    username: usernameFromUrl ?? "",
  });

  const { mutate: deleteAccount, isLoading: isDeleting } =
    api.artist.deleteArtist.useMutation({
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
      key={"preferences"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // remove z-50 if possible, I think <Bubbles /> is messing it up
      className="baseVertFlex z-50 w-full"
    >
      <TabsContent value="preferences">
        <div className="baseVertFlex gap-2 md:gap-4">
          {/* start of actual preferences component */}
          <div className="baseVertFlex lightGlassmorphic my-4 w-full gap-12 rounded-2xl px-1 py-4 transition-all md:my-8 md:p-8 md:px-4">
            <UserProfile />

            <div className="baseVertFlex w-full gap-4 md:flex-row">
              <div className="baseVertFlex w-full !items-start gap-2 md:w-1/3 md:gap-4">
                <div className="font-semibold">Pinned tab</div>
                <div className="baseVertFlex lightestGlassmorphic min-h-[128px] w-full gap-2 rounded-md md:w-4/5 md:gap-4">
                  {/* if pinned tab, show card with tab info */}
                  {user.data?.publicMetadata.pinnedTab ? (
                    // pinned tab card here
                    <div></div>
                  ) : (
                    <Button
                      onClick={() => {
                        // open pinned tab modal
                        setShowPinnedTabModal(true);
                        // refer to SectionProgressionModal for structure of modal jsx
                      }}
                    >
                      Add tab
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="h-[1px] w-full md:h-48 md:w-[1px]" />

              <div className="baseVertFlex w-full gap-4 md:w-1/3">
                <Button>
                  <Link href={`/user/${user.data?.username ?? ""}`}>
                    View profile
                  </Link>
                </Button>
                <Button
                  variant={"destructive"}
                  onClick={() => {
                    // confirmation modal into trpc mutation to delete account
                    setShowDeleteAccountModal(true);
                    // refer to SectionProgressionModal for structure of modal jsx
                  }}
                >
                  Delete account
                </Button>
                {user.data && (
                  <div className="text-pink-200">{`Joined on ${formatDate(
                    user.data.createdAt
                  )}`}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </motion.div>
  );
}

Preferences.PageLayout = TopProfileNavigationLayout;

export default Preferences;
