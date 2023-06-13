import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "~/utils/api";
import { useRouter } from "next/router";

function PostSignUpRegistration() {
  const { userId } = useAuth();
  const { push } = useRouter();

  const { mutate: addNewUser } =
    api.postSignUpRegistration.initializeNewUser.useMutation({
      onSettled: () => {
        void push("/");
      },
    });

  useEffect(() => {
    if (!userId) return;
    addNewUser(userId);
  }, [userId, addNewUser]);

  return null;
}

export default PostSignUpRegistration;
