import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

import { UserProfile } from "@clerk/nextjs";
import { Separator } from "~/components/ui/separator";

// sticking with clerk prebuilt as fundamental ui

// should be split up baseVertFlex with:
// collapsible "Primary info" - clerk <UserProfile /> component
// collapsible "Miscellaneous" - status input + account created date on left and pinned tab on right
//      (could be really simple with just a button to add one (brings up modal) if nothing is pinned, otherwise shows standard card)
//      (maybe do similar approach to stash for status input where it is just div w/text and on right it's edit button, when clicked it shows input + checkmark/cancel button) on side?)
// 1px separator horizontal
// centered danger button for deleting account (onClick calls trpc/api route to delete account and bring you back to homepage)
//      (we are opting to make the user anonymous instead of deleting their tabs/comments)
//                (to do this, I think the best way would be just to automatically default back to default profile pic + name "Anonymous" and not allow clicking on their name/profile since
//                 they wouldn't have a profile to display. Should be fine to go to their old profile since it would just default back to "This user doesn't exist" page)

// figure out how to do proper nested layout where only the inner contents crossfade,
// not the sticky navigation
// ^^^^^^^^

//

function Preferences() {
  const router = useRouter();
  const { push, asPath } = useRouter();

  const [status, setStatus] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);

  const usernameFromUrl = useMemo(() => {
    if (typeof router.query.username === "string") {
      return router.query.username;
    }
    return "";
  }, [router.query.username]);

  const user = api.user.getUserByIdOrUsername.useQuery({
    username: usernameFromUrl ?? "",
  });

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
      <div className="baseVertFlex gap-2 md:gap-4">
        <div className="baseFlex gap-2 md:gap-4">
          <Button
            onClick={() =>
              void push(`/user/${user.data?.username ?? ""}/preferences`)
            }
          >
            Preferences
          </Button>
          <Button
            onClick={() => void push(`/user/${user.data?.username ?? ""}/tabs`)}
          >
            Tabs
          </Button>
          <Button
            onClick={() =>
              void push(`/user/${user.data?.username ?? ""}/likes`)
            }
          >
            Likes
          </Button>
        </div>

        {/* start of actual preferences component */}
        <div className="baseVertFlex lightGlassmorphic my-4 w-full gap-4 p-4 transition-all md:my-8 md:p-8">
          <UserProfile />

          <Separator />

          <div className="baseVertFlex gap-2 md:flex-row md:gap-4">
            <div className="baseVertFlex !items-start">
              {editingStatus ? (
                <div className="baseVertFlex gap-2 md:gap-4">
                  <input
                    className="w-full"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  />

                  {/* icon/word for save */}
                  <Button
                    onClick={() => {
                      setEditingStatus(false);
                      // clerk api call to update status
                    }}
                  >
                    Save
                  </Button>

                  {/* icon/word for cancel */}
                  <Button
                    onClick={() => {
                      setEditingStatus(false);
                      setStatus(""); // should actually be previous value (from clerk public metadata)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="baseVertFlex gap-2 md:gap-4">
                  <div className="baseVertFlex !items-start gap-2">
                    <div className="font-semibold">Status</div>
                    <div>
                      {/* status wrapped in quotation marks and maybe italicized(?) here */}
                    </div>
                  </div>

                  <Button onClick={() => setEditingStatus(true)}>Edit</Button>
                </div>
              )}

              {/* fill in later */}
              <div>{`Joined on `}</div>
            </div>

            <Separator className="h-[1px] w-full md:h-20 md:w-[1px]" />

            <div className="baseVertFlex gap-2 md:gap-4">
              <div className="font-semibold">Pinned tab</div>
              <div className="baseVertFlex gap-2 md:gap-4">
                {/* if pinned tab, show card with tab info */}
                {/* if no pinned tab, show button to add one */}
              </div>
            </div>
          </div>
        </div>

        {/* play around with this idea: only having separator at bottom below clerk + misc.
                and then below separator have two buttons: "View profile" and "Delete account"
                

                myabe just drop the separator and make sure everything else above two buttons inside
                of glassmorphic card
                seems like it would work nicely in my head but not sure*/}
      </div>
    </motion.div>
  );
}

export default Preferences;
