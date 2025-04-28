import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "~/utils/api";

function useKeepUserMetadataUpdatedWithClerk() {
  const { user: clerkUser } = useClerk();
  const ctx = api.useUtils();

  const { data: user } = api.user.getByIdOrUsername.useQuery(
    {
      userId: clerkUser?.id,
    },
    {
      enabled: !!clerkUser?.id, // only run this query if user is logged in
    },
  );

  const { mutate: updateArtist } = api.user.update.useMutation({
    onSettled: () => {
      void ctx.user.getByIdOrUsername.invalidate();
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
        username: clerkUser.username as string,
        profileImageUrl: clerkUser.imageUrl,
      });
    }
  }, [clerkUser, user, updateArtist]);
}

export default useKeepUserMetadataUpdatedWithClerk;
