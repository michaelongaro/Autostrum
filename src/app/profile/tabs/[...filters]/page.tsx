import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "My Tabs | Autostrum",
  description:
    "View, sort, and manage the guitar tabs you have created on Autostrum.",
  noIndex: true,
});

export default withPageScrollTarget(PageClient);
