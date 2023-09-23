import { useClerk } from "@clerk/nextjs";
import { useLocalStorageValue } from "@react-hookz/web";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { api } from "~/utils/api";

function PostSignUpRegistration() {
  const { user } = useClerk();
  const { push } = useRouter();

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
    if (!user) return;
    addNewUser({
      userId: user.id,
      username: user.username!,
      profileImageUrl: user.profileImageUrl,
    });
  }, [user, addNewUser]);

  return null;
}

export default PostSignUpRegistration;
