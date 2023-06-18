import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { api } from "~/utils/api";

function useKeepArtistMetadataUpdatedWithClerk() {
  const { user } = useClerk();

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: user?.id,
    },
    {
      enabled: !!user?.id, // only run this query if user is logged in
    }
  );

  const { mutate: updateArtist } = api.artist.updateArtist.useMutation();

  useEffect(() => {
    if (!user || !artist) return;
    if (
      user.username !== artist.username ||
      user.profileImageUrl !== artist.profileImageUrl
    ) {
      updateArtist({
        id: user.id,
        username: user.username!,
        profileImageUrl: user.profileImageUrl,
      });
    }
  }, [user, artist, updateArtist]);
}

export default useKeepArtistMetadataUpdatedWithClerk;
