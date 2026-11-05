import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { userMetadata } from "~/server/profileMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return userMetadata((await params).username);
}

export default withPageScrollTarget(PageClient);
