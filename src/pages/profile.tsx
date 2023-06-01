import React from "react";

type Props = {};

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

function profile({}: Props) {
  return <div>profile</div>;
}

export default profile;
