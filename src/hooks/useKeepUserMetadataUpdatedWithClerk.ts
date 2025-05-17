import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "~/utils/api";

// TODO: delete this file once settings/preferences gets overhauled

function useKeepUserMetadataUpdatedWithClerk() {
  const { user: clerkUser } = useClerk();
  const ctx = api.useUtils();

  const { data: user } = api.user.getById.useQuery(clerkUser!.id, {
    enabled: Boolean(clerkUser?.id), // only run this query if user is logged in
  });

  const { mutate: updateArtist } = api.user.update.useMutation({
    onSettled: () => {
      void ctx.user.getById.invalidate(clerkUser?.id);
    },
  });

  useEffect(() => {
    if (!clerkUser || !user) return;

    if (
      clerkUser.username !== user.username ||
      clerkUser.imageUrl !== user.profileImageUrl
    ) {
      updateArtist({
        userId: clerkUser.id,
        username: clerkUser.username!,
        profileImageUrl: clerkUser.imageUrl,
      });
    }
  }, [clerkUser, user, updateArtist]);
}

export default useKeepUserMetadataUpdatedWithClerk;
