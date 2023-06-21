import { useRouter } from "next/router";
import { useMemo } from "react";
import { api } from "~/utils/api";

function ArtistProfile() {
  const router = useRouter();

  const usernameFromUrl = useMemo(() => {
    if (typeof router.query.username === "string") {
      return router.query.username;
    }
    return "";
  }, [router.query.username]);

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      username: usernameFromUrl,
    },
    {
      enabled: !!usernameFromUrl,
    }
  );

  return <div>{artist?.username}</div>;
}

export default ArtistProfile;
