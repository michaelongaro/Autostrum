import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { artistMetadata } from "~/server/profileMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; id?: string }>;
}) {
  return artistMetadata(await params);
}

export default withPageScrollTarget(PageClient);
