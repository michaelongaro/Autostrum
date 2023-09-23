import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "~/utils/api";

function useKeepArtistMetadataUpdatedWithClerk() {
  const { user } = useClerk();
  const ctx = api.useContext();

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: user?.id,
    },
    {
      enabled: !!user?.id, // only run this query if user is logged in
    }
  );

  const { mutate: updateArtist } = api.artist.updateArtist.useMutation({
    onSettled: () => {
      void ctx.artist.getByIdOrUsername.invalidate();
    },
  });

  useEffect(() => {
    if (!user || !artist) return;
    if (
      user.username !== artist.username ||
      user.imageUrl !== artist.profileImageUrl
    ) {
      updateArtist({
        userId: user.id,
        username: user.username as string,
        profileImageUrl: user.imageUrl,
      });
    }
  }, [user, artist, updateArtist]);
}

export default useKeepArtistMetadataUpdatedWithClerk;
