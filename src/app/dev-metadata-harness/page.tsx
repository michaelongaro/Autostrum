import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import { notFound } from "next/navigation";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({ noIndex: true });

function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PageClient />;
}

export default withPageScrollTarget(Page);
