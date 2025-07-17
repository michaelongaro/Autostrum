import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { api } from "~/utils/api";

function usePostSignUpRegistration() {
  const { user } = useClerk();
  const { isSignedIn } = useAuth();
  const { push } = useRouter();

  const { data: isUserRegistered, isLoading: isLoadingQuery } =
    api.user.isUserRegistered.useQuery(user?.id ?? "", {
      enabled: Boolean(user?.id && isSignedIn),
    });

  const localStorageRedirectRoute = useLocalStorageValue(
    "autostrum-redirect-route",
  );

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
    if (isLoadingQuery || !isSignedIn || isUserRegistered || !user) return;

    addNewUser({
      userId: user.id,
      username: user.username!,
      profileImageUrl: user.imageUrl,
    });
  }, [addNewUser, isSignedIn, isLoadingQuery, isUserRegistered, user]);
}

export default usePostSignUpRegistration;
