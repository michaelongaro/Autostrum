import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { api } from "~/utils/api";

function usePostSignUpRegistration() {
  const { user } = useClerk();
  const { isSignedIn } = useAuth();
  const { push } = useRouter();

  const { data: isArtistRegistered, isLoading: isLoadingQuery } =
    api.artist.isArtistRegistered.useQuery(user?.id ?? "", {
      enabled: Boolean(user?.id && isSignedIn),
    });

  const localStorageRedirectRoute = useLocalStorageValue("redirectRoute");

  const { mutate: addNewUser } =
    api.postSignUpRegistration.initializeNewUser.useMutation({
      onSettled: () => {
        if (localStorageRedirectRoute.value) {
          void push(localStorageRedirectRoute.value as string);
          localStorageRedirectRoute.remove();
        } else {
          void push("/");
        }
      },
    });

  useEffect(() => {
    if (isLoadingQuery || !isSignedIn || isArtistRegistered || !user) return;

    addNewUser({
      userId: user.id,
      username: user.username!,
      profileImageUrl: user.imageUrl,
    });
  }, [addNewUser, isSignedIn, isLoadingQuery, isArtistRegistered]);
}

export default usePostSignUpRegistration;
