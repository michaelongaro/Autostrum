import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { api } from "~/utils/api";
import { useRouter } from "next/router";

function PostSignUpRegistration() {
  const { user } = useClerk();
  const { push } = useRouter();

  const { mutate: addNewUser } =
    api.postSignUpRegistration.initializeNewUser.useMutation({
      onSettled: () => {
        void push("/");
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
