import { buildClerkProps, getAuth } from "@clerk/nextjs/server";
import type { GetServerSideProps } from "next";

export const getSignedInPageProps: GetServerSideProps<
  Record<string, unknown>
> = async ({ req }) => {
  if (!getAuth(req).userId) {
    return { notFound: true };
  }

  return { props: buildClerkProps(req) };
};
