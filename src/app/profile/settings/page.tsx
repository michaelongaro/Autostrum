import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Settings | Autostrum",
  description:
    "Manage your Autostrum account, username, password, profile image, and preferences.",
  noIndex: true,
});

export default withPageScrollTarget(PageClient);
